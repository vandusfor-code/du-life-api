// ============================================================
//  Du Life v3 - Claude API
//  lib/claude.js
//  Con extracción de memoria y contexto del usuario
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// ─────────────────────────────────────────
// SYSTEM PROMPT v3
// ─────────────────────────────────────────

function construirSystemPrompt(contexto) {
  const usuario = contexto.usuario || {};
  const comoLlamar = usuario.como_llamar || usuario.nombre || 'amigo';
  const tratamiento = usuario.tratamiento || 'tu';
  const pais = usuario.pais || 'Colombia';
  
  // Contexto de entidades conocidas
  let entidadesTexto = '';
  if (contexto.entidades_relevantes && contexto.entidades_relevantes.length > 0) {
    entidadesTexto = '\n\nLO QUE YA SABES SOBRE EL USUARIO:\n';
    contexto.entidades_relevantes.forEach(e => {
      entidadesTexto += `- ${e.tipo_entidad}: ${e.nombre}${e.descripcion ? ' (' + e.descripcion + ')' : ''}\n`;
    });
  }
  
  // Hechos vigentes
  let hechosTexto = '';
  if (contexto.hechos_vigentes && contexto.hechos_vigentes.length > 0) {
    hechosTexto = '\nHECHOS QUE CONOCES:\n';
    contexto.hechos_vigentes.slice(0, 8).forEach(h => {
      hechosTexto += `- ${h.hecho}\n`;
    });
  }
  
 const zonaHoraria = usuario.zona_horaria || 'America/Bogota';
  const fechaActual = new Date().toLocaleString('es-CO', { 
    timeZone: zonaHoraria,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const fechaHoyISO = new Date().toLocaleDateString('en-CA', { timeZone: zonaHoraria });
  const horaActualISO = new Date().toLocaleTimeString('en-GB', { timeZone: zonaHoraria, hour12: false });

  return `Eres Du Life, asistente personal con IA que funciona como memoria digital permanente.

PERSONALIDAD:
- Amigo inteligente, cálido y práctico
- Hablas en español natural
- Te diriges como "${comoLlamar}" usando "${tratamiento}"
- Conciso, sin frases robóticas
- Emojis con moderación
- NO eres chatbot, eres un asistente que recuerda la vida del usuario

USUARIO:
- Llamarle: ${comoLlamar}
- País: ${pais}
- Tratamiento: ${tratamiento}
${entidadesTexto}${hechosTexto}

CAPACIDADES:
💰 Gastos/ingresos | 📝 Notas | ✅ Tareas | 🔔 Recordatorios
📅 Eventos | 🎂 Fechas | 💡 Ideas | 👥 Personas | 🏠 Lugares
📦 Objetos | 📄 Documentos | 🚀 Proyectos | 🎯 Objetivos

DETECCIÓN DE INTENCIONES Y MEMORIA:
Para cada mensaje:
1. Identifica INTENCIÓN principal
2. EXTRAE info para memoria (entidades, hechos, relaciones)
3. Responde natural

SIEMPRE responde en JSON puro (sin markdown):
{
  "intencion": "gasto|ingreso|nota|tarea|recordatorio|evento|idea|consulta_gastos|consulta_resumen|consulta_tareas|consulta_notas|consulta_personas|saludo|otro",
  "datos": { ... },
  "memoria": {
    "entidades": [
      { "tipo": "persona|lugar|objeto|evento|documento|proyecto|objetivo", "nombre": "...", "descripcion": "...", "atributos": {} }
    ],
    "hechos": [
      { "hecho": "...", "categoria": "personal|trabajo|relacion|preferencia|salud|financiero", "confianza": 0.0-1.0, "entidad_nombre": "..." }
    ],a
    "relaciones": [
      { "entidad_origen": "...", "entidad_destino": "...", "tipo": "es_pareja|es_familia|es_amigo|posee|trabaja_en", "descripcion": "..." }
    ]
  },
  "respuesta": "Tu respuesta natural y breve"
}

DATOS POR INTENCIÓN:
- GASTO: { monto, descripcion, categoria, lugar, metodo_pago, fecha }
- INGRESO: { monto, descripcion, fuente }
- NOTA: { titulo, contenido }
- TAREA: { titulo, prioridad, fecha_vencimiento, hora_vencimiento, notificar_antes_minutos }
- RECORDATORIO: { titulo, prioridad, fecha_vencimiento, hora_vencimiento, notificar_antes_minutos }
- IDEA: { titulo, descripcion, categoria }
- CONSULTA_*: { periodo, tipo }

REGLAS DE MEMORIA:
- Persona nueva → agregar a entidades
- Lugar específico → agregar a entidades
- Objeto importante (electronica, vehiculo, etc) → agregar
- Algo sobre el usuario → agregar como hecho
- Relación entre personas/cosas → agregar relación
- Confianza: 1.0 si lo dijo directo, 0.7-0.9 si infieres

REGLAS CRÍTICAS:
- Montos: SIEMPRE números sin símbolos. "15k"=15000, "1.5M"=1500000
- Fechas: "hoy"=fecha actual, "mañana"=+1 día
- Si no determinas algo, usa null
- "respuesta" natural y breve

Hoy es: ${fechaActual}
  Fecha ISO local del usuario: ${fechaHoyISO}
  Hora actual local del usuario: ${horaActualISO}
  Zona horaria del usuario: ${zonaHoraria}

  IMPORTANTE — CÓMO CALCULAR FECHAS Y HORAS:
  - Cuando el usuario diga "en X minutos" o "en X horas", suma X a la HORA ACTUAL LOCAL DEL USUARIO (${horaActualISO}) y usa la FECHA ISO LOCAL (${fechaHoyISO}) como base. Ejemplo: si la hora local es 23:05 y el usuario dice "en 10 minutos", la hora de la tarea es 23:15 (misma fecha).
  - Cuando el usuario diga una hora como "a las 5pm" o "a las 8", interprétala en la zona horaria del usuario (${zonaHoraria}), NUNCA en UTC.
  - Cuando el usuario diga "mañana", "hoy", "el viernes", calcula la fecha basándote en la FECHA ISO LOCAL (${fechaHoyISO}).
  - Devuelve fecha_vencimiento en formato YYYY-MM-DD y hora_vencimiento en formato HH:MM:SS de la zona horaria del usuario.`;

// ─────────────────────────────────────────
// LLAMAR A CLAUDE
// ─────────────────────────────────────────

export async function llamarClaude(mensajeUsuario, historial = [], contexto = {}) {
  try {
    const messages = historial.map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content: mensajeUsuario });

    const response = await claude.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: construirSystemPrompt(contexto),
      messages: messages
    });

    return {
      texto: response.content[0].text,
      tokens: response.usage?.output_tokens || null
    };
  } catch (e) {
    console.error('Error Claude:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// PARSEAR
// ─────────────────────────────────────────

export function parsearRespuesta(textoRaw) {
  try {
    let limpio = textoRaw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    
    const inicio = limpio.indexOf('{');
    const fin = limpio.lastIndexOf('}');
    
    if (inicio === -1 || fin === -1) {
      return {
        intencion: 'otro',
        datos: {},
        memoria: { entidades: [], hechos: [], relaciones: [] },
        respuesta: textoRaw
      };
    }
    
    const parsed = JSON.parse(limpio.substring(inicio, fin + 1));
    if (!parsed.memoria) {
      parsed.memoria = { entidades: [], hechos: [], relaciones: [] };
    }
    return parsed;
  } catch (e) {
    console.error('Error parseando:', e.message);
    return {
      intencion: 'otro',
      datos: {},
      memoria: { entidades: [], hechos: [], relaciones: [] },
      respuesta: 'Ups, no entendí bien. ¿Puedes repetirlo?'
    };
  }
}

// ─────────────────────────────────────────
// PROCESAR
// ─────────────────────────────────────────

export async function procesarConClaude(mensajeUsuario, historial, contexto) {
  const resultado = await llamarClaude(mensajeUsuario, historial, contexto);
  
  if (!resultado) {
    return {
      intencion: 'otro',
      datos: {},
      memoria: { entidades: [], hechos: [], relaciones: [] },
      respuesta: 'Ups, tuve un problema. Intenta de nuevo.'
    };
  }
  
  const parsed = parsearRespuesta(resultado.texto);
  parsed.tokens_usados = resultado.tokens;
  return parsed;
}