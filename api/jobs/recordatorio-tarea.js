// ============================================================
//  Du Life - Job: Recordatorio de tarea
//  api/jobs/recordatorio-tarea.js
// ============================================================

import { esLlamadaQStash } from '../../lib/qstash.js';
import { enviarPlantilla } from '../../lib/whatsapp.js';

export default async function handler(req, res) {
  console.log('🔔 recordatorio-tarea ejecutado');
  console.log('Body raw:', req.body, typeof req.body);

  try {
    if (req.method !== 'POST') return res.status(405).end();
    if (!esLlamadaQStash(req)) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { telefono, nombre, tarea } = body;
    console.log('Body parseado:', { telefono, nombre, tarea });

    if (!telefono || !nombre || !tarea) {
      console.error('❌ recordatorio-tarea: faltan datos en el body');
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const resultado = await enviarPlantilla(telefono, 'recordatorio_du', { nombre, tarea }, 'Recordatorio');
    console.log('📨 Resultado enviarPlantilla:', JSON.stringify(resultado));

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('❌ Error en recordatorio-tarea:', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}
