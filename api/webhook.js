// ============================================================
//  DU LIFE & AUDITORÍAS - Webhook Router v3 (Solución Blindada)
//  api/webhook.js
// ============================================================

import { procesarMensaje } from '../lib/asistente.js';
import { enviarMensaje, marcarLeido } from '../lib/whatsapp.js';
import { procesarImagen, procesarAudio } from '../lib/multimedia.js';
import {
  obtenerPreguntaPendiente, marcarPreguntado, guardarRespuestaPerfil,
  detectarDatosPasivos, detectarRecordatorio,
} from '../lib/perfilamiento.js';
import { programarJob } from '../lib/qstash.js';

export default async function handler(req, res) {
  
  // GET: Verificación de Token para Meta
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
      console.log('✅ Webhook verificado');
      return res.status(200).send(challenge);
    }
    
    return res.status(403).send('Forbidden');
  }

  // POST: Mensajes entrantes de WhatsApp
  if (req.method === 'POST') {
    try {
      const body = req.body;
      console.log('📩 Webhook recibido');

      if (!body.entry || !body.entry[0]) return res.status(200).json({ status: 'ok' });
      
      const changes = body.entry[0].changes;
      if (!changes || !changes[0]) return res.status(200).json({ status: 'ok' });

      const value = changes[0].value;
      
      // ===== DEBUG =====
      console.log("====================================");
      console.log("📩 WEBHOOK RECIBIDO");
      console.log("🌎 ENV WA_PHONE_NUMBER_ID:", process.env.WA_PHONE_NUMBER_ID);
      
      const phoneNumberId = value.metadata?.phone_number_id;
      const displayPhone = value.metadata?.display_phone_number;

      console.log("📱 Display Phone:", displayPhone);
      console.log("🆔 Phone Number ID:", phoneNumberId);
      console.log("====================================");
      // ===== FIN DEBUG =====

      // ─────────────────────────────────────────────────────────────────
      // RESPUESTA DIRECTA DESDE VERCEL PARA AUDITORÍAS (Número 311)
      // ─────────────────────────────────────────────────────────────────
      if (phoneNumberId === "1239327509257364") {
        console.log("🔀 Mensaje detectado en canal 311. Respondiendo aviso directamente desde Vercel...");

        // Verificamos que contenga un mensaje válido antes de intentar responder
        if (value.messages && value.messages[0]) {
          const mensajeIn = value.messages[0];
          const telefonoCliente = mensajeIn.from;

          const textoRespuesta = "⚠️ *Aviso Importante:* Este canal es únicamente informativo y automático para el envío de auditorías y notificaciones de Du Academy. No se reciben mensajes de texto ni consultas por este medio. ¡Muchas gracias! 😊";
          
          const urlMeta = `https://graph.facebook.com/${process.env.WA_API_VERSION || 'v20.0'}/${phoneNumberId}/messages`;
          
          const payloadData = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: telefonoCliente,
            type: "text",
            text: {
              preview_url: false,
              body: textoRespuesta
            }
          };

          try {
            // Disparamos la respuesta hacia Meta utilizando de forma transparente tu token de Vercel
            const responseMeta = await fetch(urlMeta, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`
              },
              body: JSON.stringify(payloadData)
            });

            const dataMeta = await responseMeta.json();
            console.log("📤 Respuesta de API Meta al despachar advertencia:", JSON.stringify(dataMeta));
          } catch (metaErr) {
            console.error("❌ Error crítico despachando mensaje desde Vercel hacia Meta:", metaErr.message);
          }
        }

        // Retornamos un 200 OK absoluto a Meta de inmediato. Sanitiza los logs al instante.
        return res.status(200).json({ status: 'responded_directly_from_vercel' });
      }
      // ─────────────────────────────────────────────────────────────────

      if (!value || !value.messages) return res.status(200).json({ status: 'ok' });

      const mensaje = value.messages[0];
      if (!mensaje) return res.status(200).json({ status: 'ok' });

      const telefono = mensaje.from;
      const messageId = mensaje.id;

      const contactos = value.contacts;
      const nombre = (contactos && contactos[0] && contactos[0].profile)
        ? contactos[0].profile.name
        : 'Usuario';

      // Marcar leído (no bloquea)
      marcarLeido(messageId).catch(() => {});

      let respuesta = null;

      // ─────────────────────────────────────
      // PROCESAR SEGÚN TIPO (LÓGICA ORIGINAL DU LIFE - 323)
      // ─────────────────────────────────────

      if (mensaje.type === 'text') {
        const textoMensaje = mensaje.text.body;
        console.log(`📱 ${telefono} (${nombre}): "${textoMensaje}"`);
        respuesta = await procesarMensaje(telefono, nombre, textoMensaje);

        // Perfilamiento progresivo + detección de recordatorios en lenguaje natural.
        // Envuelto en try/catch: si algo falla acá, la respuesta normal ya calculada
        // igual se envía.
        try {
          const { supabase, obtenerOCrearUsuario, crearTarea } = await import('../lib/supabase.js');
          const usuarioActual = await obtenerOCrearUsuario(telefono, nombre);

          if (usuarioActual?.onboarding_completo && respuesta) {
            const nombrePerfil = usuarioActual.como_llamar || usuarioActual.nombre || 'amigo';

            // ¿Hay una pregunta de perfil hecha en un turno ANTERIOR esperando respuesta?
            const { data: preguntaActiva } = await supabase
              .from('usuario_perfil_estado')
              .select('campo')
              .eq('usuario_id', usuarioActual.id)
              .eq('estado', 'preguntada')
              .order('fecha_preguntada', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (preguntaActiva) {
              // Este mensaje es la respuesta a esa pregunta: no detectar ni preguntar nada nuevo.
              await guardarRespuestaPerfil(usuarioActual.id, preguntaActiva.campo, textoMensaje);
            } else {
              const deteccion = await detectarDatosPasivos(usuarioActual.id, textoMensaje);
              if (deteccion.detectado && deteccion.tipo === 'persona') {
                respuesta += `\n\n¿Quieres que guarde a ${deteccion.valor} como ${deteccion.relacion || 'contacto'} en Personas?`;
              }

              if (!deteccion.detectado) {
                const preguntaPendiente = await obtenerPreguntaPendiente(usuarioActual.id);
                if (preguntaPendiente) {
                  respuesta += `\n\n${preguntaPendiente.pregunta}`;
                  await marcarPreguntado(usuarioActual.id, preguntaPendiente.campo);
                }
              }
            }

            // Detección de recordatorio en lenguaje natural
            const intencionRecordatorio = await detectarRecordatorio(textoMensaje, nombrePerfil);
            if (intencionRecordatorio?.detectado) {
              const fechaUTC = new Date(intencionRecordatorio.fechaISO);
              // Colombia es UTC-5 fijo (sin horario de verano): convertir a hora local
              // para guardar fecha_vencimiento/hora_vencimiento igual que el resto de la app.
              const local = new Date(fechaUTC.getTime() - 5 * 60 * 60 * 1000);
              const fechaLocal = local.toISOString().split('T')[0];
              const horaLocal = local.toISOString().split('T')[1].slice(0, 8);

              await crearTarea(usuarioActual.id, {
                titulo: intencionRecordatorio.tarea,
                fecha_vencimiento: fechaLocal,
                hora_vencimiento: horaLocal,
              });

              await programarJob('/api/jobs/recordatorio-tarea', {
                usuario_id: usuarioActual.id,
                telefono,
                nombre: nombrePerfil,
                tarea: intencionRecordatorio.tarea,
              }, intencionRecordatorio.fechaISO);

              console.log(`⏰ Recordatorio programado: "${intencionRecordatorio.tarea}" para ${intencionRecordatorio.fechaISO}`);
            }
          }
        } catch (e) {
          console.error('Error en perfilamiento/recordatorio:', e.message);
        }

      } else if (mensaje.type === 'image') {
        console.log(`📸 Imagen recibida de ${telefono}`);
        
        const { obtenerOCrearUsuario } = await import('../lib/supabase.js');
        const usuario = await obtenerOCrearUsuario(telefono, nombre);
        
        if (!usuario) {
          respuesta = 'Disculpa, hubo un error.';
        } else if (!usuario.onboarding_completo) {
          respuesta = 'Primero termina tu registro escribiéndome por texto. 😊';
        } else {
          const caption = mensaje.image.caption || null;
          const result = await procesarImagen(usuario.id, mensaje.image.id, caption);
          respuesta = result.mensaje;
        }
        
      } else if (mensaje.type === 'audio' || mensaje.type === 'voice') {
        console.log(`🎤 Audio recibido de ${telefono}`);
        
        const { obtenerOCrearUsuario } = await import('../lib/supabase.js');
        const usuario = await obtenerOCrearUsuario(telefono, nombre);
        
        if (!usuario) {
          respuesta = 'Disculpa, hubo un error.';
        } else if (!usuario.onboarding_completo) {
          respuesta = 'Primero termina tu registro escribiéndome por texto. 😊';
        } else {
          const audioId = mensaje.audio?.id || mensaje.voice?.id;
          const result = await procesarAudio(usuario.id, audioId);
          
          if (result.exito && result.transcripcion) {
            console.log(`📝 Transcripción: "${result.transcripcion}"`);
            respuesta = await procesarMensaje(telefono, nombre, result.transcripcion);
          } else {
            respuesta = result.mensaje;
          }
        }
        
      } else {
        console.log(`⏭️ Tipo ignorado: ${mensaje.type}`);
        respuesta = `Por ahora solo entiendo texto, imágenes y audios. 😊`;
      }

      // Enviar respuesta para Du Life
      if (respuesta) {
        await enviarMensaje(telefono, respuesta);
      }

      return res.status(200).json({ status: 'ok' });

    } catch (err) {
      console.error('❌ Error en webhook:', err.message);
      return res.status(200).json({ status: 'error', message: err.message });
    }
  }

  return res.status(405).send('Method not allowed');
}
