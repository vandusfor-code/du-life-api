// ============================================================
//  Du Life - Job: Chequeo de fin de semana
//  api/jobs/chequeo-semana.js
// ============================================================

import { esLlamadaQStash } from '../../lib/qstash.js';
import { enviarPlantillaConBotones } from '../../lib/whatsapp.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!esLlamadaQStash(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { telefono, nombre } = req.body;

  if (!telefono || !nombre) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  await enviarPlantillaConBotones(telefono, 'chequeo_fin_semana', { nombre });

  return res.status(200).json({ ok: true });
}
