// ============================================================
//  Du Life - Gemini (Google AI)
//  lib/gemini.js
//  Herramienta táctica junto a Claude: búsqueda web con grounding,
//  redacción rápida, visión (más barata que Claude Vision) y PDFs.
//  Mismo estilo defensivo que lib/claude.js: nunca lanza, devuelve
//  null en error para que el llamador decida el mensaje de fallback.
// ============================================================

import { GoogleGenAI } from '@google/genai';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELO = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ─────────────────────────────────────────
// BÚSQUEDA WEB (Google Search grounding)
// ─────────────────────────────────────────

export async function buscarConGemini(pregunta) {
  const prompt = `${pregunta}

Responde como si fuera un chat de WhatsApp, no un artículo:
- Máximo 4-5 líneas, directo al punto (solo si la pregunta exige datos como precios o un listado, puedes usar hasta 6-8 líneas).
- Sin encabezados ni títulos.
- Sin negritas dobles (**texto**). Si necesitas resaltar algo, usa un solo asterisco (*texto*), y solo para 1 o 2 palabras clave como máximo.
- Si necesitas una lista, usa guiones simples (-), nunca asteriscos como viñeta.
- Nada de "Leer más" ni cortes — la respuesta completa debe caber en ese límite de líneas.`;

  try {
    const response = await gemini.models.generateContent({
      model: MODELO,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const texto = response.text;
    if (!texto) return null;

    // Gemini con grounding ya redacta prosa natural citando lo que
    // encontró — no anexamos links/citas crudas, ilegibles en WhatsApp.
    return { texto: texto.trim() };
  } catch (e) {
    console.error('Error Gemini búsqueda:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// REDACCIÓN RÁPIDA (sin grounding)
// ─────────────────────────────────────────

export async function redactarConGemini(instruccion) {
  try {
    const response = await gemini.models.generateContent({
      model: MODELO,
      contents: `${instruccion}\n\nDevuelve 1 o 2 opciones de texto listas para copiar y pegar tal cual, sin explicaciones ni encabezados de más.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return response.text?.trim() || null;
  } catch (e) {
    console.error('Error Gemini redacción:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// VISIÓN — mismo contrato JSON que Claude Vision (lib/multimedia.js)
// ─────────────────────────────────────────

function limpiarYParsearJSON(texto, delimitadores = ['{', '}']) {
  if (!texto) return null;
  const limpio = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
  const inicio = limpio.indexOf(delimitadores[0]);
  const fin = limpio.lastIndexOf(delimitadores[1]);
  if (inicio === -1 || fin === -1) return null;
  try {
    return JSON.parse(limpio.substring(inicio, fin + 1));
  } catch (e) {
    return null;
  }
}

export async function analizarImagenGemini(base64, mimeType, contexto) {
  const prompt = `Analiza esta imagen y responde en JSON puro (sin markdown):
{
  "tipo_imagen": "factura|recibo|documento|persona|lugar|comida|producto|captura_chat|otra",
  "descripcion": "qué se ve (1-2 oraciones)",
  "texto_extraido": "todo el texto visible",
  "datos_extraidos": {
    "monto": NUMBER|null,
    "comercio": STRING|null,
    "fecha": "YYYY-MM-DD"|null,
    "metodo_pago": "efectivo|nequi|daviplata|tarjeta_debito|tarjeta_credito|transferencia"|null,
    "categoria": "alimentacion|transporte|salud|entretenimiento|hogar|servicios|otros"|null,
    "items": []
  }
}

IMPORTANTE para facturas/recibos:
- monto: el TOTAL final (no items individuales)
- comercio: nombre del lugar/empresa
- fecha: si está visible, formato YYYY-MM-DD
- Si NO ves un total claro, usa null

${contexto ? 'CONTEXTO: ' + contexto : ''}`;

  try {
    const response = await gemini.models.generateContent({
      model: MODELO,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: prompt },
        ],
      }],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return limpiarYParsearJSON(response.text, ['{', '}']);
  } catch (e) {
    console.error('Error Gemini Vision:', e.message);
    return null;
  }
}

// Prompt único para leer tablas de horarios (lo usan Gemini y el fallback de
// Claude en multimedia.js, para que nunca se desincronicen). Las tablas de
// empresa vienen en cualquier formato; lo crítico es darle al modelo la fecha
// de HOY para que pueda convertir días de semana ("lunes", "martes") en
// fechas reales — sin eso, tablas sin fecha explícita fallaban siempre.
export function construirPromptTablaHorarios(caption) {
  const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const hoyLargo = new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return `Hoy es ${hoyLargo} (${hoyISO}, zona horaria de Colombia).

Analiza esta imagen de tabla de horarios. Extrae TODOS los turnos.

Reglas:
- "dia_semana" es SIEMPRE obligatorio en cada evento, en minúsculas: "lunes"|"martes"|"miercoles"|"jueves"|"viernes"|"sabado"|"domingo".
- Si la tabla trae fechas exactas (día/mes visibles), úsalas en "fecha" (YYYY-MM-DD) y marca "fechas_explicitas": true a nivel general.
- Si la tabla SOLO trae nombres de día ("lunes", "martes"...) SIN ninguna fecha exacta visible, deja "fecha": null en cada evento y marca "fechas_explicitas": false — NO adivines ni calcules la fecha tú mismo, el sistema se la va a pedir al usuario.${caption ? `\n- El usuario escribió sobre la imagen: "${caption}". Si ese texto menciona una fecha o semana concreta, sí úsala para calcular "fecha" y marca "fechas_explicitas": true.` : ''}
- Si una fecha o día aparece varias veces, trátalas como eventos independientes — NO las combines ni elimines. Cada fila es un bloque real y distinto.
- Filas de descanso ("DESCANSO", "LIBRE", "OFF" o sin horario) NO generan evento: omítelas.
- Convierte horas am/pm a formato 24h (ej: "8:00am a 6:00pm" → hora_inicio "08:00", hora_fin "18:00").
- Si hay columna de almuerzo y/o breaks, usa como break_inicio/break_fin la franja del almuerzo (si no hay almuerzo, el primer break).
- titulo: "Turno" más la empresa o campaña si aparece en la tabla (ej: "Turno Cofrem").
- "primer_dia_semana": el "dia_semana" del PRIMER evento de la tabla (el que aparece primero, de arriba a abajo).

Formato requerido (objeto, no array):
{"fechas_explicitas":true,"primer_dia_semana":"lunes","eventos":[{"dia_semana":"lunes","fecha":"2026-07-05","hora_inicio":"15:00","hora_fin":"22:00","titulo":"Turno CO","break_inicio":"16:30","break_fin":"17:00","categoria":"trabajo"}]}
Si la imagen no contiene una tabla de horarios, devuelve exactamente: {"detectado":false}`;
}

export async function analizarTablaHorariosGemini(base64, mimeType, caption = null) {
  const prompt = construirPromptTablaHorarios(caption);

  try {
    const response = await gemini.models.generateContent({
      model: MODELO,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: prompt },
        ],
      }],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const texto = response.text;
    if (!texto) return null;
    if (/"detectado"\s*:\s*false/.test(texto)) return null;

    const resultado = limpiarYParsearJSON(texto, ['{', '}']);
    if (!resultado || !Array.isArray(resultado.eventos) || resultado.eventos.length === 0) return null;
    return resultado;
  } catch (e) {
    console.error('Error Gemini Vision (horarios):', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// PDFs — File API (se sube una vez, se reusa el uri en preguntas de seguimiento)
// ─────────────────────────────────────────

export async function subirPDFAGemini(buffer, mimeType, displayName) {
  try {
    const blob = new Blob([buffer], { type: mimeType });
    const archivo = await gemini.files.upload({
      file: blob,
      config: { mimeType, displayName },
    });
    return { uri: archivo.uri, mimeType: archivo.mimeType };
  } catch (e) {
    console.error('Error subiendo PDF a Gemini:', e.message);
    return null;
  }
}

export async function preguntarSobrePDF(fileUri, mimeType, pregunta) {
  try {
    const response = await gemini.models.generateContent({
      model: MODELO,
      contents: [{
        role: 'user',
        parts: [
          { fileData: { fileUri, mimeType } },
          { text: pregunta },
        ],
      }],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return response.text?.trim() || null;
  } catch (e) {
    console.error('Error Gemini PDF:', e.message);
    return null;
  }
}
