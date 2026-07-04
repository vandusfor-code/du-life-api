// ============================================================
//  Du Life - Job: Reactivación por inactividad
//  api/jobs/reactivacion.js
// ============================================================

import { esLlamadaQStash } from '../../lib/qstash.js';
import { enviarPlantilla } from '../../lib/whatsapp.js';
import { supabase } from '../../lib/supabase.js';

const MODULOS = [
  { tabla: 'gastos', texto: 'gastos' },
  { tabla: 'tareas', texto: 'tareas' },
  { tabla: 'entidades', texto: 'personas' },
  { tabla: 'notas', texto: 'notas' },
  { tabla: 'ideas', texto: 'ideas' },
];

export default async function handler(req, res) {
  console.log('📥 [reactivacion] req.body:', JSON.stringify(req.body));
  if (req.method !== 'POST') return res.status(405).end();
  if (!esLlamadaQStash(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { usuario_id, telefono, nombre } = req.body;

  if (!usuario_id || !telefono || !nombre) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  let moduloElegido = MODULOS[0];
  for (const mod of MODULOS) {
    let query = supabase
      .from(mod.tabla)
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', usuario_id);
    if (mod.tabla === 'entidades') query = query.eq('tipo_entidad', 'persona');
    const { count } = await query;
    if ((count || 0) === 0) {
      moduloElegido = mod;
      break;
    }
  }

  await enviarPlantilla(telefono, 'reactivacion_modulo', {
    nombre,
    modulo: moduloElegido.texto,
  });

  return res.status(200).json({ ok: true });
}
