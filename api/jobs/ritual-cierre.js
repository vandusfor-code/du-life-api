// ============================================================
//  Du Life - Job: Ritual de cierre del día
//  api/jobs/ritual-cierre.js
// ============================================================

import { esLlamadaQStash } from '../../lib/qstash.js';
import { enviarPlantilla } from '../../lib/whatsapp.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!esLlamadaQStash(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { telefono, nombre } = req.body;

  if (!telefono || !nombre) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  await enviarPlantilla(telefono, 'ritual_cierre_dia', { nombre });

  console.log(`✅ Ritual cierre enviado a ${nombre}`);
  return res.status(200).json({ ok: true });
}
