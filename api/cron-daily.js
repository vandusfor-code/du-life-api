// ============================================================
//  Du Life - Cron Diario 6AM Colombia
//  api/cron-daily.js
//  Corre patrones/envejecimiento y programa en QStash los jobs
//  del resto del día (ritual de cierre, fin de semana, etc).
// ============================================================

import { supabase } from '../lib/supabase.js';
import { analizarPatronesUsuario } from '../lib/patronesEngine.js';
import { ejecutarRevisionEnvejecimiento } from '../lib/envejecimiento.js';
import { programarJob } from '../lib/qstash.js';

export default async function handler(req, res) {

  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🕐 Cron diario 6AM iniciado');

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, telefono, nombre, como_llamar, hora_preferida_insight, onboarding_completo, activo')
    .eq('activo', true);

  if (!usuarios?.length) {
    return res.status(200).json({ status: 'ok', usuarios: 0 });
  }

  const ahora = new Date();
  const esSabado = ahora.getUTCDay() === 6;
  const esDomingo = ahora.getUTCDay() === 0;
  const hoyStr = ahora.toISOString().split('T')[0];
  let jobsProgramados = 0;
  const resultados = { usuarios_procesados: 0, errores: 0 };

  for (const usuario of usuarios) {
    const nombre = usuario.como_llamar || usuario.nombre || 'amigo';
    const payload = {
      usuario_id: usuario.id,
      telefono: usuario.telefono,
      nombre,
    };

    try {
      // ── Patrones y envejecimiento ──
      if (usuario.onboarding_completo) {
        await analizarPatronesUsuario(usuario.id).catch(() => {});
        await ejecutarRevisionEnvejecimiento(usuario.id).catch(() => {});
      }

      // ── Recordatorios de tareas del día ──
      // fecha_vencimiento (DATE) y hora_vencimiento (TIME) son campos separados.
      const { data: tareasHoy } = await supabase
        .from('tareas')
        .select('titulo, fecha_vencimiento, hora_vencimiento')
        .eq('usuario_id', usuario.id)
        .is('eliminado_en', null)
        .is('completada_en', null)
        .eq('fecha_vencimiento', hoyStr)
        .not('hora_vencimiento', 'is', null);

      for (const tarea of (tareasHoy || [])) {
        const vencimiento = new Date(`${tarea.fecha_vencimiento}T${tarea.hora_vencimiento}`);
        const momentoRecordatorio = new Date(vencimiento.getTime() - 30 * 60 * 1000);
        if (momentoRecordatorio > ahora) {
          await programarJob('/api/jobs/recordatorio-tarea', {
            ...payload,
            tarea: tarea.titulo,
          }, momentoRecordatorio.toISOString());
          jobsProgramados++;
        }
      }

      if (!usuario.onboarding_completo) {
        resultados.usuarios_procesados++;
        continue;
      }

      // ── Ritual de cierre — programar para hora preferida del usuario ──
      const horaPreferida = usuario.hora_preferida_insight || '21:00';
      const [horaLocal, min] = horaPreferida.split(':').map(Number);
      // Colombia es UTC-5 todo el año (sin horario de verano)
      const horaUTC = (horaLocal + 5) % 24;
      const ritualHoy = new Date(ahora);
      ritualHoy.setUTCHours(horaUTC, min || 0, 0, 0);

      if (ritualHoy > ahora) {
        await programarJob('/api/jobs/ritual-cierre', payload, ritualHoy.toISOString());
        jobsProgramados++;
      }

      // ── Chequeo fin de semana (sábados 2PM Colombia = 19:00 UTC) ──
      if (esSabado) {
        const chequeo = new Date(ahora);
        chequeo.setUTCHours(19, 0, 0, 0);
        if (chequeo > ahora) {
          await programarJob('/api/jobs/chequeo-semana', payload, chequeo.toISOString());
          jobsProgramados++;
        }
      }

      // ── Resumen semanal (domingos 7PM Colombia = 00:00 UTC lunes) ──
      if (esDomingo) {
        const lunes = new Date(ahora);
        lunes.setUTCDate(lunes.getUTCDate() + 1);
        lunes.setUTCHours(0, 0, 0, 0);
        await programarJob('/api/jobs/resumen-semanal', payload, lunes.toISOString());
        jobsProgramados++;
      }

      // ── Reactivación — programar para exactamente 24h desde el último mensaje ──
      const { data: ultimoMsg } = await supabase
        .from('mensajes')
        .select('creado_en')
        .eq('usuario_id', usuario.id)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ultimoMsg) {
        const reactivacionEn = new Date(new Date(ultimoMsg.creado_en).getTime() + 24 * 60 * 60 * 1000);
        if (reactivacionEn > ahora && reactivacionEn < new Date(ahora.getTime() + 24 * 60 * 60 * 1000)) {
          await programarJob('/api/jobs/reactivacion', payload, reactivacionEn.toISOString());
          jobsProgramados++;
        }
      }

      resultados.usuarios_procesados++;

    } catch (e) {
      console.error(`Error usuario ${usuario.id}:`, e.message);
      resultados.errores++;
    }
  }

  console.log(`✅ Cron completado. Jobs programados: ${jobsProgramados}`, resultados);
  return res.status(200).json({ status: 'ok', jobs_programados: jobsProgramados, ...resultados });
}
