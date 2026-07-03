// ============================================================
//  Du Life - Handler de Recordatorios (QStash sin SDK)
//  api/cron/recordatorios.js
// ============================================================

import crypto from 'crypto';
import { supabase } from '../../lib/supabase.js';
import { enviarNotificacionPush } from '../../lib/push.js';

/**
 * Verifica firma de QStash manualmente sin SDK
 */
function verificarFirmaQStash(signatureHeader, body) {
  try {
    if (!signatureHeader) return false;
    
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;
    
    if (!currentKey && !nextKey) return false;

    // La firma es JWT: header.payload.signature
    const parts = signatureHeader.split('.');
    if (parts.length !== 3) return false;

    const [headerB64, payloadB64, signatureB64] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    // Intentar con current key primero
    for (const key of [currentKey, nextKey].filter(Boolean)) {
      const expected = crypto
        .createHmac('sha256', key)
        .update(dataToSign)
        .digest('base64url');
      
      if (expected === signatureB64) {
        // Verificar que el body hash coincida
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        const bodyHash = crypto.createHash('sha256').update(body).digest('base64url');
        if (payload.body === bodyHash) {
          return true;
        }
      }
    }
    return false;
  } catch (e) {
    console.error('[QStash] Error verificando firma:', e.message);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const rawBody = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body || {});

    const signature = req.headers['upstash-signature'];
    if (!verificarFirmaQStash(signature, rawBody)) {
      console.log('[QStash] Firma inválida');
      return res.status(401).json({ error: 'Firma inválida' });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { tarea_id } = payload;
    
    if (!tarea_id) {
      return res.status(400).json({ error: 'tarea_id requerido' });
    }

    const { data: tarea, error } = await supabase
      .from('tareas')
      .select('id, usuario_id, titulo, notificar_antes_minutos, completada_en, eliminado_en, recordatorio_enviado_en')
      .eq('id', tarea_id)
      .single();

    if (error || !tarea) {
      return res.status(200).json({ ok: true, skipped: 'no_encontrada' });
    }

    if (tarea.completada_en) return res.status(200).json({ ok: true, skipped: 'completada' });
    if (tarea.eliminado_en) return res.status(200).json({ ok: true, skipped: 'eliminada' });
    if (tarea.recordatorio_enviado_en) return res.status(200).json({ ok: true, skipped: 'ya_notificada' });

    const minutosAntes = tarea.notificar_antes_minutos || 0;
    let mensaje = tarea.titulo;
    if (minutosAntes > 0) mensaje = `En ${minutosAntes} min: ${tarea.titulo}`;

    await enviarNotificacionPush(tarea.usuario_id, {
      titulo: '⏰ Recordatorio',
      mensaje: mensaje,
      url: '/dashboard/tareas',
      tipo: 'recordatorio',
    });

    await supabase
      .from('tareas')
      .update({ recordatorio_enviado_en: new Date().toISOString() })
      .eq('id', tarea_id);

    console.log(`[QStash] Recordatorio enviado para tarea ${tarea_id}`);
    return res.status(200).json({ ok: true, notificada: true });
  } catch (e) {
    console.error('[QStash] Error:', e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}