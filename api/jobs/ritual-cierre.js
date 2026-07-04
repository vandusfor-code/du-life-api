// ============================================================
//  Du Life - Job: Ritual de cierre del día
//  api/jobs/ritual-cierre.js
// ============================================================

import { esLlamadaQStash } from '../../lib/qstash.js';
import { enviarPlantilla } from '../../lib/whatsapp.js';

export default async function handler(req, res) {
  console.log('🔔 ritual-cierre ejecutado');
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

    const resultado = await enviarPlantilla(telefono, 'ritual_cierre_dia', { nombre });
    console.log(`✅ Ritual cierre enviado a ${nombre}:`, JSON.stringify(resultado));

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('❌ Error en ritual-cierre:', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}
