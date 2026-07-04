// ============================================================
//  Du Life - Job: Resumen semanal
//  api/jobs/resumen-semanal.js
// ============================================================

import { esLlamadaQStash } from '../../lib/qstash.js';
import { enviarPlantilla } from '../../lib/whatsapp.js';
import { supabase } from '../../lib/supabase.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export default async function handler(req, res) {
  console.log('🔔 resumen-semanal ejecutado');
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

    const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const hace7DiasStr = hace7Dias.toISOString().split('T')[0];
    const hace7DiasISO = hace7Dias.toISOString();

    const [gastos, tareas, notas, animo] = await Promise.all([
      supabase.from('gastos').select('monto, categoria').eq('usuario_id', usuario_id).is('eliminado_en', null).gte('fecha', hace7DiasStr),
      supabase.from('tareas').select('titulo, completada_en').eq('usuario_id', usuario_id).is('eliminado_en', null).gte('creado_en', hace7DiasISO),
      supabase.from('notas').select('contenido').eq('usuario_id', usuario_id).is('eliminado_en', null).gte('creado_en', hace7DiasISO),
      supabase.from('registro_animo').select('puntaje').eq('usuario_id', usuario_id).gte('created_at', hace7DiasISO),
    ]);

    const totalGastos = gastos.data?.reduce((s, g) => s + (Number(g.monto) || 0), 0) || 0;
    const tareasOk = tareas.data?.filter((t) => t.completada_en).length || 0;
    const promedioAnimo = animo.data?.length
      ? (animo.data.reduce((s, a) => s + a.puntaje, 0) / animo.data.length).toFixed(1)
      : null;

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Genera un resumen semanal personal para ${nombre} en 3-4 líneas, tono cálido, segunda persona. Datos: gastos $${totalGastos.toLocaleString('es-CO')}, tareas completadas ${tareasOk} de ${tareas.data?.length || 0}, notas guardadas ${notas.data?.length || 0}${promedioAnimo ? `, ánimo promedio ${promedioAnimo}/10` : ''}. Sin saludos ni títulos. Máximo 280 caracteres.`,
      }],
    });

    const resumen = response.content[0]?.text?.trim() || '';

    const resultado = await enviarPlantilla(telefono, 'resumen_semanal', { nombre, resumen });
    console.log('📨 Resultado enviarPlantilla:', JSON.stringify(resultado));

    await supabase.from('resumen_semanal').insert({
      usuario_id,
      semana_inicio: getLunes(),
      semana_fin: new Date().toISOString().split('T')[0],
      texto_resumen: resumen,
      fecha_generado: new Date().toISOString(),
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('❌ Error en resumen-semanal:', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}

function getLunes() {
  const d = new Date();
  const dia = d.getUTCDay();
  const diff = d.getUTCDate() - dia + (dia === 0 ? -6 : 1);
  return new Date(d.setUTCDate(diff)).toISOString().split('T')[0];
}
