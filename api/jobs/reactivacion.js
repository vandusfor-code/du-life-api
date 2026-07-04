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
  console.log('🔔 reactivacion ejecutado');
  console.log('Body raw:', req.body, typeof req.body);

  try {
    if (req.method !== 'POST') return res.status(405).end();
    if (!esLlamadaQStash(req)) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { usuario_id, telefono, nombre } = body;
    console.log('Body parseado:', { usuario_id, telefono, nombre });

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

    const resultado = await enviarPlantilla(telefono, 'reactivacion_modulo', {
      nombre,
      modulo: moduloElegido.texto,
    });
    console.log('📨 Resultado enviarPlantilla:', JSON.stringify(resultado));

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('❌ Error en reactivacion:', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}
