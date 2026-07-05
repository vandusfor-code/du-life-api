// ============================================================
//  Du Life - Job: Recordatorio de tarea
//  api/jobs/recordatorio-tarea.js
// ============================================================

import { esLlamadaQStash } from '../../lib/qstash.js';
import { enviarPlantilla } from '../../lib/whatsapp.js';
import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  console.log('🔔 recordatorio-tarea ejecutado');
  console.log('Body raw:', req.body, typeof req.body);

  try {
    if (req.method !== 'POST') return res.status(405).end();
    if (!esLlamadaQStash(req)) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { telefono, nombre, tarea, tarea_id } = body;
    console.log('Body parseado:', { telefono, nombre, tarea, tarea_id });

    if (!telefono || !nombre || !tarea) {
      console.error('❌ recordatorio-tarea: faltan datos en el body');
      return res.status(400).json({ error: 'Faltan datos' });
    }

    // El header "Recordatorio" de esta plantilla es texto fijo (sin {{1}}),
    // así que NO se envía componente header: Meta lo pinta solo. Enviarlo
    // causa "(#100) Invalid parameter / Parameter name is missing or empty".
    const resultado = await enviarPlantilla(telefono, 'recordatorio_du', { nombre, tarea });
    console.log('📨 Resultado enviarPlantilla:', JSON.stringify(resultado));

    // Deja rastro de cuándo se envió el recordatorio para poder detectar
    // en el webhook si un "Listo" posterior confirma esta tarea puntual.
    if (tarea_id) {
      await supabase
        .from('tareas')
        .update({ recordatorio_enviado_en: new Date().toISOString() })
        .eq('id', tarea_id);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('❌ Error en recordatorio-tarea:', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}
