// ============================================================
//  Du Life - Cron de Recordatorios
//  api/cron/recordatorios.js
//  Se ejecuta cada 5 min. Envía push de tareas por vencer.
// ============================================================

import { supabase } from '../../lib/supabase.js';
import { enviarNotificacionPush } from '../../lib/push.js';

export default async function handler(req, res) {
  // Seguridad: solo Vercel Cron puede llamar
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const ahora = new Date();
    // Ventana de tiempo: desde ahora hasta 10 minutos adelante
    // (para captar tareas que vencen en los próximos ~5 min con margen)
    const en10min = new Date(ahora.getTime() + 10 * 60 * 1000);

    // Buscar tareas pendientes con fecha_vencimiento + hora_vencimiento
    // que caigan en la ventana [ahora, ahora+10min]
    const hoyStr = ahora.toISOString().split('T')[0];
    const enFecha10min = en10min.toISOString().split('T')[0];

    const { data: tareas, error } = await supabase
      .from('tareas')
      .select('id, usuario_id, titulo, fecha_vencimiento, hora_vencimiento, notificar_antes_minutos')
      .is('completada_en', null)
      .is('eliminado_en', null)
      .is('recordatorio_enviado_en', null)
      .not('fecha_vencimiento', 'is', null)
      .not('hora_vencimiento', 'is', null)
      .in('fecha_vencimiento', [hoyStr, enFecha10min])
      .limit(100);

    if (error) {
      console.error('[Cron] Error consultando tareas:', error.message);
      return res.status(500).json({ error: error.message });
    }

    if (!tareas || tareas.length === 0) {
      console.log('[Cron] Sin tareas por notificar');
      return res.status(200).json({ ok: true, notificadas: 0 });
    }

    let notificadas = 0;

    for (const tarea of tareas) {
      // Calcular timestamp exacto de la tarea
      const fechaHoraStr = `${tarea.fecha_vencimiento}T${tarea.hora_vencimiento}`;
      const fechaTarea = new Date(fechaHoraStr);

      // Ajustar por minutos de anticipación (default 0)
      const minutosAntes = tarea.notificar_antes_minutos || 0;
      const fechaNotificar = new Date(fechaTarea.getTime() - minutosAntes * 60 * 1000);

      // Solo notificar si estamos dentro de la ventana [ahora - 5min, ahora + 5min]
      // Esto es porque el cron corre cada 5 min y debemos captar tareas que se pasaron un poco
      const diffMs = fechaNotificar.getTime() - ahora.getTime();
      const diffMin = diffMs / (1000 * 60);

      // Ventana: entre -5 min (recién pasó) y +5 min (viene pronto)
      if (diffMin < -5 || diffMin > 5) {
        continue;
      }

      // Preparar mensaje
      let mensaje = tarea.titulo;
      if (minutosAntes > 0) {
        mensaje = `En ${minutosAntes} min: ${tarea.titulo}`;
      } else if (diffMin > 0.5) {
        mensaje = `En unos minutos: ${tarea.titulo}`;
      } else if (diffMin < -0.5) {
        mensaje = `Debiste hacer: ${tarea.titulo}`;
      }

      // Enviar push (fire-and-forget)
      await enviarNotificacionPush(tarea.usuario_id, {
        titulo: '⏰ Recordatorio',
        mensaje: mensaje,
        url: '/dashboard/tareas',
        tipo: 'recordatorio',
      });

      // Marcar como enviado para no duplicar
      await supabase
        .from('tareas')
        .update({ recordatorio_enviado_en: new Date().toISOString() })
        .eq('id', tarea.id);

      notificadas++;
    }

    console.log(`[Cron] Notificadas ${notificadas} tareas`);
    return res.status(200).json({ ok: true, notificadas });
  } catch (e) {
    console.error('[Cron] Error inesperado:', e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}