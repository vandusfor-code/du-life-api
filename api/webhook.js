// ============================================================
//  DU LIFE - Webhook v2 (con multimedia)
//  api/webhook.js
// ============================================================

import { procesarMensaje } from '../lib/asistente.js';
import { enviarMensaje, marcarLeido } from '../lib/whatsapp.js';
import { procesarImagen, procesarAudio } from '../lib/multimedia.js';

export default async function handler(req, res) {
  
  // GET: Verificación
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

  // POST: Mensajes
  if (req.method === 'POST') {
    try {
      const body = req.body;
      console.log('📩 Webhook recibido');

      if (!body.entry || !body.entry[0]) return res.status(200).json({ status: 'ok' });
      
      const changes = body.entry[0].changes;
      if (!changes || !changes[0]) return res.status(200).json({ status: 'ok' });

      const value = changes[0].value;
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
      // PROCESAR SEGÚN TIPO
      // ─────────────────────────────────────

      if (mensaje.type === 'text') {
        const textoMensaje = mensaje.text.body;
        console.log(`📱 ${telefono} (${nombre}): "${textoMensaje}"`);
        respuesta = await procesarMensaje(telefono, nombre, textoMensaje);
        
      } else if (mensaje.type === 'image') {
        console.log(`📸 Imagen recibida de ${telefono}`);
        
        // Obtener usuario
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
            // Procesar el audio transcrito como si fuera texto
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

      // Enviar respuesta
      if (respuesta) {
        await enviarMensaje(telefono, respuesta);
      }

      return res.status(200).json({ status: 'ok' });

    } catch (err) {
      console.error('❌ Error en webhook:', err.message);
      console.error('Stack:', err.stack);
      return res.status(200).json({ status: 'error', message: err.message });
    }
  }

  return res.status(405).send('Method not allowed');
}