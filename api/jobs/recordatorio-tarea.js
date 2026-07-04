// ============================================================
//  Du Life - Job: Recordatorio de tarea
//  api/jobs/recordatorio-tarea.js
// ============================================================

import { esLlamadaQStash } from '../../lib/qstash.js';
import { enviarPlantilla } from '../../lib/whatsapp.js';

export default async function handler(req, res) {
  console.log('📥 [recordatorio-tarea] req.body:', JSON.stringify(req.body));
  if (req.method !== 'POST') return res.status(405).end();
  if (!esLlamadaQStash(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { telefono, nombre, tarea } = req.body;

  if (!telefono || !nombre || !tarea) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  await enviarPlantilla(telefono, 'recordatorio_tarea', { nombre, tarea });

  return res.status(200).json({ ok: true });
}
