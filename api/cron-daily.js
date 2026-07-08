// ============================================================
//  Du Life - Cron Diario 6AM Colombia
//  api/cron-daily.js
//  Corre patrones/envejecimiento y programa en QStash los jobs
//  del resto del día (reflexión nocturna, fin de semana, etc).
// ============================================================

import { supabase } from '../lib/supabase.js';
import { analizarPatronesUsuario } from '../lib/patronesEngine.js';
import { ejecutarRevisionEnvejecimiento } from '../lib/envejecimiento.js';
import { programarJob } from '../lib/qstash.js';
import { enviarPlantilla } from '../lib/whatsapp.js';

export default async function handler(req, res) {

  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🕐 Cron diario 6AM iniciado');

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, telefono, nombre, como_llamar, onboarding_completo, activo')
    .eq('activo', true);

  if (!usuarios?.length) {
    return res.status(200).json({ status: 'ok', usuarios: 0 });
  }

  const ahora = new Date();
  const esSabado = ahora.getUTCDay() === 6;
  const esDomingo = ahora.getUTCDay() === 0;
  const hoyStr = ahora.toISOString().split('T')[0];
  // Colombia es UTC-5 fijo: el día del mes para "dia_pago" se calcula en
  // hora local, no en UTC (el cron corre a las 11:00 UTC = 6:00 Colombia,
  // así que normalmente coincide, pero se calcula explícito para no repetir
  // el mismo tipo de bug de zona horaria que tuvimos en otras partes).
  const diaHoyColombia = new Date(ahora.getTime() - 5 * 60 * 60 * 1000).getDate();
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
        .select('id, titulo, fecha_vencimiento, hora_vencimiento')
        .eq('usuario_id', usuario.id)
        .is('eliminado_en', null)
        .is('completada_en', null)
        .eq('fecha_vencimiento', hoyStr)
        .not('hora_vencimiento', 'is', null);

      for (const tarea of (tareasHoy || [])) {
        const vencimiento = new Date(`${tarea.fecha_vencimiento}T${tarea.hora_vencimiento}`);
        const momentoRecordatorio = new Date(vencimiento.getTime() - 30 * 60 * 1000);
        if (momentoRecordatorio > ahora) {
          await programarJob('recordatorio-tarea', {
            ...payload,
            tarea_id: tarea.id,
            tarea: tarea.titulo,
          }, momentoRecordatorio.toISOString());
          jobsProgramados++;
        }
      }

      // ── Recordatorio de préstamos: hoy es el día de cobro acordado ──
      const { data: prestamosHoy } = await supabase
        .from('prestamos')
        .select('id, nombre_deudor, valor_cuota')
        .eq('usuario_id', usuario.id)
        .eq('dia_pago', diaHoyColombia)
        .eq('estado', 'activo');

      for (const prestamo of (prestamosHoy || [])) {
        // Header "Recordatorio de préstamo" y footer son texto fijo de la
        // plantilla — no se envían como parámetros, solo el body con las 3
        // variables nombradas en el orden exacto aprobado por Meta.
        await enviarPlantilla(usuario.telefono, 'prestamo_recordatorio_pago', {
          nombre_usuario: nombre,
          nombre_deudor: prestamo.nombre_deudor,
          valor_cuota: `$${Number(prestamo.valor_cuota).toLocaleString('es-CO')}`,
        });
      }

      if (!usuario.onboarding_completo) {
        resultados.usuarios_procesados++;
        continue;
      }

      // ── Reflexión nocturna — lunes, miércoles y viernes, 8PM Colombia ──
      // Fija para todos los usuarios registrados (no depende de hora_preferida_insight).
      // Colombia es UTC-5 todo el año: 20:00 local = 01:00 UTC del día siguiente.
      const diaSemanaUTC = ahora.getUTCDay(); // 1=lunes, 3=miércoles, 5=viernes
      if (diaSemanaUTC === 1 || diaSemanaUTC === 3 || diaSemanaUTC === 5) {
        const reflexionHoy = new Date(ahora);
        reflexionHoy.setUTCDate(reflexionHoy.getUTCDate() + 1);
        reflexionHoy.setUTCHours(1, 0, 0, 0);
        await programarJob('reflexion-nocturna', payload, reflexionHoy.toISOString());
        jobsProgramados++;
      }

      // ── Chequeo fin de semana (sábados 2PM Colombia = 19:00 UTC) ──
      if (esSabado) {
        const chequeo = new Date(ahora);
        chequeo.setUTCHours(19, 0, 0, 0);
        if (chequeo > ahora) {
          await programarJob('chequeo-semana', payload, chequeo.toISOString());
          jobsProgramados++;
        }
      }

      // ── Resumen semanal (domingos 7PM Colombia = 00:00 UTC lunes) ──
      if (esDomingo) {
        const lunes = new Date(ahora);
        lunes.setUTCDate(lunes.getUTCDate() + 1);
        lunes.setUTCHours(0, 0, 0, 0);
        await programarJob('resumen-semanal', payload, lunes.toISOString());
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
          await programarJob('reactivacion', payload, reactivacionEn.toISOString());
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
