// ============================================================
//  DU LIFE & AUDITORÍAS - Webhook Router v3 (Solución Blindada)
//  api/webhook.js
// ============================================================

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

      if (!value || !value.messages) return res.status(200).json({ status: 'ok' });

      const mensaje = value.messages[0];
      if (!mensaje) return res.status(200).json({ status: 'ok' });

      const telefono = mensaje.from;
      const messageId = mensaje.id;

      const contactos = value.contacts;
      const nombre = (contactos && contactos[0] && contactos[0].profile)
        ? contactos[0].profile.name
        : 'Usuario';

      // El procesamiento real (Claude + Supabase + envío de respuesta) se
      // encola como job de QStash y corre en background: así Meta recibe su
      // 200 casi de inmediato y no reintenta/duplica el webhook si Claude o
      // Supabase tardan más de lo esperado.
      await programarJob('procesar-webhook', {
        telefono,
        nombre,
        messageId,
        mensaje,
      }, new Date().toISOString());

      return res.status(200).json({ status: 'queued' });

    } catch (err) {
      console.error('❌ Error en webhook:', err.message);
      return res.status(200).json({ status: 'error', message: err.message });
    }
  }

  return res.status(405).send('Method not allowed');
}
