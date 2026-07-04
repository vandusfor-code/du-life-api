// ============================================================
//  Du Life - Job: Recordatorio de tarea
//  api/jobs/recordatorio-tarea.js
// ============================================================

import { esLlamadaQStash } from '../../lib/qstash.js';
import { enviarPlantilla } from '../../lib/whatsapp.js';

export default async function handler(req, res) {
  console.log('🔔 recordatorio-tarea ejecutado');
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));

  if (req.method !== 'POST') return res.status(405).end();
  if (!esLlamadaQStash(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { telefono, nombre, tarea } = req.body;

  if (!telefono || !nombre || !tarea) {
    console.error('❌ recordatorio-tarea: faltan datos en el body');
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const resultado = await enviarPlantilla(telefono, 'recordatorio_tarea', { nombre, tarea });
  console.log('📨 Resultado enviarPlantilla:', JSON.stringify(resultado));

  return res.status(200).json({ ok: true });
}
