// ============================================================
//  Du Life - Job: Chequeo de fin de semana
//  api/jobs/chequeo-semana.js
// ============================================================

import { esLlamadaQStash } from '../../lib/qstash.js';
import { enviarPlantillaConBotones } from '../../lib/whatsapp.js';

export default async function handler(req, res) {
  console.log('🔔 chequeo-semana ejecutado');
  console.log('Body raw:', req.body, typeof req.body);

  try {
    if (req.method !== 'POST') return res.status(405).end();
    if (!esLlamadaQStash(req)) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { telefono, nombre } = body;
    console.log('Body parseado:', { telefono, nombre });

    if (!telefono || !nombre) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const resultado = await enviarPlantillaConBotones(telefono, 'chequeo_fin_semana', { nombre });
    console.log('📨 Resultado:', JSON.stringify(resultado));

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('❌ Error en chequeo-semana:', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}
