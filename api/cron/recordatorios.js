// ============================================================
//  Du Life - Handler de Recordatorios (QStash)
//  api/cron/recordatorios.js
//  Llamado por QStash en el momento exacto de cada tarea
// ============================================================

import { supabase } from '../../lib/supabase.js';
import { enviarNotificacionPush } from '../../lib/push.js';
import { Receiver } from '@upstash/qstash';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Convertir body a string para verificar firma
    const rawBody = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body);

    // Verificar firma de QStash
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    });

    const signature = req.headers['upstash-signature'];
    if (!signature) {
      return res.status(401).json({ error: 'Sin firma' });
    }

    const valid = await receiver.verify({
      signature,
      body: rawBody,
    });

    if (!valid) {
      return res.status(401).json({ error: 'Firma inválida' });
    }

    // Parsear body
    const payload = typeof req.body === 'string' 
      ? JSON.parse(req.body) 
      : req.body;

    const { tarea_id } = payload;
    if (!tarea_id) {
      return res.status(400).json({ error: 'tarea_id requerido' });
    }

    // Buscar la tarea
    const { data: tarea, error } = await supabase
      .from('tareas')
      .select('id, usuario_id, titulo, notificar_antes_minutos, completada_en, eliminado_en, recordatorio_enviado_en')
      .eq('id', tarea_id)
      .single();

    if (error || !tarea) {
      console.log(`[QStash] Tarea ${tarea_id} no encontrada`);
      return res.status(200).json({ ok: true, skipped: 'no_encontrada' });
    }

    // Si ya está completada, cancelada o notificada, no hacer nada
    if (tarea.completada_en) {
      return res.status(200).json({ ok: true, skipped: 'completada' });
    }
    if (tarea.eliminado_en) {
      return res.status(200).json({ ok: true, skipped: 'eliminada' });
    }
    if (tarea.recordatorio_enviado_en) {
      return res.status(200).json({ ok: true, skipped: 'ya_notificada' });
    }

    // Preparar mensaje
    const minutosAntes = tarea.notificar_antes_minutos || 0;
    let mensaje = tarea.titulo;
    if (minutosAntes > 0) {
      mensaje = `En ${minutosAntes} min: ${tarea.titulo}`;
    }

    // Enviar push
    await enviarNotificacionPush(tarea.usuario_id, {
      titulo: '⏰ Recordatorio',
      mensaje: mensaje,
      url: '/dashboard/tareas',
      tipo: 'recordatorio',
    });

    // Marcar como notificada
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