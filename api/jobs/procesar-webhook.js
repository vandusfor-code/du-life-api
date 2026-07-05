// ============================================================
//  Du Life - Job: Procesar mensaje entrante de WhatsApp
//  api/jobs/procesar-webhook.js
//  Se ejecuta en background vía QStash: api/webhook.js solo encola
//  este job y responde 200 a Meta de inmediato, para que el
//  procesamiento (Claude + Supabase + envío de respuesta) no
//  arriesgue un timeout ni provoque reintentos/duplicados de Meta.
// ============================================================

import { esLlamadaQStash, programarJob } from '../../lib/qstash.js';
import { procesarMensaje } from '../../lib/asistente.js';
import { enviarMensaje, marcarLeido } from '../../lib/whatsapp.js';
import { procesarImagen, procesarAudio } from '../../lib/multimedia.js';
import {
  obtenerPreguntaPendiente, marcarPreguntado, guardarRespuestaPerfil,
  detectarDatosPasivos, detectarRecordatorio,
} from '../../lib/perfilamiento.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    if (!esLlamadaQStash(req)) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { telefono, nombre, messageId, mensaje } = body;

    if (!telefono || !mensaje) {
      console.error('❌ procesar-webhook: faltan datos en el body');
      return res.status(400).json({ error: 'Faltan datos' });
    }

    // Marcar leído (no bloquea)
    if (messageId) marcarLeido(messageId).catch(() => {});

    let respuesta = null;

    // ─────────────────────────────────────
    // PROCESAR SEGÚN TIPO (LÓGICA ORIGINAL DU LIFE - 323)
    // ─────────────────────────────────────

    if (mensaje.type === 'text') {
      const textoMensaje = mensaje.text.body;
      console.log(`📱 ${telefono} (${nombre}): "${textoMensaje}"`);

      // ¿Es la confirmación de un recordatorio ("Listo", "ya", "hecho")?
      // Si el usuario tiene una tarea con recordatorio enviado hace poco y
      // sin completar, se cierra esa tarea en vez de mandarlo por el
      // pipeline normal de Claude (que reenviaría la plantilla completa).
      const esConfirmacionRecordatorio = /^(listo|ya|ya está|ya esta|hecho|dale|list0)[\s!.]*$/i.test(textoMensaje.trim());
      let recordatorioConfirmado = false;

      if (esConfirmacionRecordatorio) {
        const { obtenerOCrearUsuario, obtenerTareaConRecordatorioPendiente, completarTarea } = await import('../../lib/supabase.js');
        const usuarioActual = await obtenerOCrearUsuario(telefono, nombre);
        const tareaPendiente = usuarioActual
          ? await obtenerTareaConRecordatorioPendiente(usuarioActual.id)
          : null;

        if (tareaPendiente) {
          await completarTarea(tareaPendiente.id);
          respuesta = '¡Perfecto! Me alegra haberte recordado. 😊';
          recordatorioConfirmado = true;
        }
      }

      if (!recordatorioConfirmado) {
        respuesta = await procesarMensaje(telefono, nombre, textoMensaje);
      }

      // Perfilamiento progresivo + detección de recordatorios en lenguaje natural.
      // Se salta si este mensaje ya se resolvió como confirmación de recordatorio.
      // Envuelto en try/catch: si algo falla acá, la respuesta normal ya calculada
      // igual se envía.
      try {
        const { supabase, obtenerOCrearUsuario, crearTarea } = await import('../../lib/supabase.js');
        const usuarioActual = recordatorioConfirmado ? null : await obtenerOCrearUsuario(telefono, nombre);

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

            const tareaCreada = await crearTarea(usuarioActual.id, {
              titulo: intencionRecordatorio.tarea,
              fecha_vencimiento: fechaLocal,
              hora_vencimiento: horaLocal,
            });

            await programarJob('/api/jobs/recordatorio-tarea', {
              usuario_id: usuarioActual.id,
              telefono,
              nombre: nombrePerfil,
              tarea: intencionRecordatorio.tarea,
              tarea_id: tareaCreada?.id,
            }, intencionRecordatorio.fechaISO);

            console.log(`⏰ Recordatorio programado: "${intencionRecordatorio.tarea}" para ${intencionRecordatorio.fechaISO}`);
          }
        }
      } catch (e) {
        console.error('Error en perfilamiento/recordatorio:', e.message);
      }

    } else if (mensaje.type === 'image') {
      console.log(`📸 Imagen recibida de ${telefono}`);

      const { obtenerOCrearUsuario } = await import('../../lib/supabase.js');
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

      const { obtenerOCrearUsuario } = await import('../../lib/supabase.js');
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
    console.error('❌ Error en procesar-webhook:', err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
