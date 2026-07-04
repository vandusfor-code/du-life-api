// ============================================================
//  Du Life - Perfilamiento Progresivo
//  lib/perfilamiento.js
// ============================================================

import { supabase } from './supabase.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const MODELO = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

// Catálogo de preguntas por campo
const PREGUNTAS = {
  ciudad: '¿Por cierto, en qué ciudad vives? Así te ayudo mejor con cosas locales 🏙️',
  ocupacion: '¿A qué te dedicas? Me ayuda a entenderte mejor 💼',
  fecha_nacimiento: '¿Cuándo es tu cumpleaños? Prometo recordarlo 🎂',
  nivel_proactividad: '¿Prefieres que yo te avise cuando note algo importante, o prefieres escribirme tú cuando lo necesites? 🤔',
  hora_preferida_insight: '¿A qué hora prefieres recibir tu resumen del día? Por ejemplo: 9pm 🌙',
};

// Prioridad de preguntas
const ORDEN_PREGUNTAS = [
  'ciudad',
  'ocupacion',
  'fecha_nacimiento',
  'nivel_proactividad',
  'hora_preferida_insight',
];

// Obtener siguiente pregunta pendiente para el usuario
export async function obtenerPreguntaPendiente(usuarioId) {
  const { data: estados } = await supabase
    .from('usuario_perfil_estado')
    .select('*')
    .eq('usuario_id', usuarioId);

  const ahora = new Date();
  const hace2Dias = new Date(ahora - 2 * 24 * 60 * 60 * 1000);

  for (const campo of ORDEN_PREGUNTAS) {
    const estado = estados?.find((e) => e.campo === campo);

    if (!estado || estado.estado === 'pendiente') {
      if (!estado?.fecha_preguntada || new Date(estado.fecha_preguntada) < hace2Dias) {
        return { campo, pregunta: PREGUNTAS[campo] };
      }
    }
  }

  return null;
}

// Marcar campo como preguntado
export async function marcarPreguntado(usuarioId, campo) {
  await supabase
    .from('usuario_perfil_estado')
    .upsert(
      {
        usuario_id: usuarioId,
        campo,
        estado: 'preguntada',
        fecha_preguntada: new Date().toISOString(),
      },
      { onConflict: 'usuario_id,campo' }
    );
}

// Guardar respuesta de perfil
export async function guardarRespuestaPerfil(usuarioId, campo, valorRaw) {
  const extraction = await anthropic.messages.create({
    model: MODELO,
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `El usuario respondió "${valorRaw}" a la pregunta sobre su ${campo}. Extrae el valor limpio y concreto. Sin explicación. Solo el dato. Ejemplos para ciudad: "vivo en Bogotá" → Bogotá | "Medellín" → Medellín. Para ocupación: "soy ingeniero de sistemas" → Ingeniero de sistemas. Para hora: "a las 9" → 21:00 | "9pm" → 21:00.`,
    }],
  });

  const valorLimpio = extraction.content[0]?.text?.trim();
  if (!valorLimpio) return null;

  await supabase
    .from('usuario_perfil_estado')
    .upsert(
      {
        usuario_id: usuarioId,
        campo,
        estado: 'respondida',
        valor: valorLimpio,
        fecha_respondida: new Date().toISOString(),
      },
      { onConflict: 'usuario_id,campo' }
    );

  await supabase
    .from('usuarios')
    .update({ [campo]: valorLimpio })
    .eq('id', usuarioId);

  return valorLimpio;
}

// Detección pasiva: buscar nombres/lugares en mensaje normal
export async function detectarDatosPasivos(usuarioId, mensaje) {
  const detection = await anthropic.messages.create({
    model: MODELO,
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Analiza este mensaje: "${mensaje}". Detecta si el usuario menciona: nombres de personas con su relación (ej: "mi mamá María"), su ciudad, su ocupación, o cualquier dato personal relevante. Responde SOLO en JSON así: {"detectado": true/false, "tipo": "persona|ciudad|ocupacion|otro", "valor": "dato detectado", "relacion": "mamá/amigo/etc si aplica"} o {"detectado": false} si no hay nada relevante.`,
    }],
  });

  try {
    const texto = detection.content[0]?.text?.trim() || '';
    return JSON.parse(texto.replace(/```json|```/g, ''));
  } catch {
    return { detectado: false };
  }
}

// Detección de intención de recordatorio en lenguaje natural
export async function detectarRecordatorio(mensaje, nombre) {
  const ahora = new Date();

  const response = await anthropic.messages.create({
    model: MODELO,
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Fecha y hora actual (Colombia UTC-5): ${ahora.toISOString()}

El usuario "${nombre}" escribió: "${mensaje}"

¿Contiene una intención de recordatorio o alarma? Ejemplos: "recuérdame en 10 minutos que debo tomar agua", "avísame a las 3pm que tengo reunión", "en media hora recuérdame llamar a mamá".

Responde SOLO en JSON:
{"detectado": true, "tarea": "tomar agua", "fechaISO": "2026-07-04T15:30:00.000Z"}
o
{"detectado": false}

La fechaISO debe ser en UTC, calculada desde la hora actual. "en 10 minutos" = ahora + 10min. "a las 3pm" = hoy a las 20:00 UTC (3pm Colombia). Si ya pasó la hora hoy, asumir mañana.`,
    }],
  });

  try {
    const texto = response.content[0]?.text?.trim() || '';
    const parsed = JSON.parse(texto.replace(/```json|```/g, ''));
    if (parsed.detectado && parsed.fechaISO && new Date(parsed.fechaISO) > ahora) {
      return parsed;
    }
    return { detectado: false };
  } catch {
    return { detectado: false };
  }
}
