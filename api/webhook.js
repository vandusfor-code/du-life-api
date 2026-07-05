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
