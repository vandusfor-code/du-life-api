// ============================================================
//  DU LIFE & AUDITORÍAS - Webhook Router v3 (Solución Blindada)
//  api/webhook.js
// ============================================================

import { programarJob } from '../lib/qstash.js';
import crypto from 'crypto';

// La firma X-Hub-Signature-256 de Meta se calcula con HMAC-SHA256 sobre el
// BODY CRUDO (los bytes exactos que envió Meta), no sobre el JSON parseado.
// Por eso desactivamos el body-parser de Vercel y leemos el stream nosotros.
export const config = { api: { bodyParser: false } };

async function leerRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// HMAC-SHA256 del raw body con el App Secret de Meta, comparado en tiempo
// constante contra el header. Firma ausente, sin secreto configurado, o que
// no cuadre → false.
function firmaMetaValida(rawBuf, headerFirma) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    console.error('❌ Webhook: META_APP_SECRET no está configurado');
    return false;
  }
  if (!headerFirma) return false;
  const esperado = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBuf).digest('hex');
  const a = Buffer.from(esperado);
  const b = Buffer.from(headerFirma);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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
      // Validar la firma ANTES de procesar o loguear cualquier cosa: sin esto,
      // cualquiera que conozca la URL podía inyectar mensajes falsos con un
      // `from` de víctima (vector de suplantación #2). No se loguea el
      // contenido del intento rechazado, solo el hecho.
      const rawBuf = await leerRawBody(req);
      if (!firmaMetaValida(rawBuf, req.headers['x-hub-signature-256'])) {
        console.warn('⚠️ Webhook: firma X-Hub-Signature-256 inválida o ausente — rechazado (401)');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const body = JSON.parse(rawBuf.toString('utf8'));
      console.log('📩 Webhook recibido');

      if (!body.entry || !body.entry[0]) return res.status(200).json({ status: 'ok' });

      const changes = body.entry[0].changes;
      if (!changes || !changes[0]) return res.status(200).json({ status: 'ok' });

      const value = changes[0].value;

      const phoneNumberId = value.metadata?.phone_number_id;

      // ─────────────────────────────────────────────────────────────────
      // RESPUESTA DIRECTA DESDE VERCEL PARA AUDITORÍAS (Número 311)
      // ─────────────────────────────────────────────────────────────────
      if (phoneNumberId === "1239327509257364") {
        console.log("🔀 Evento en canal 311 (auditoría) — respondiendo aviso automático");

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

            console.log(`📤 Aviso 311 despachado a Meta — ${responseMeta.ok ? 'ok' : 'error ' + responseMeta.status}`);
          } catch (metaErr) {
            console.error("❌ Error despachando aviso 311 a Meta:", metaErr.message);
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
