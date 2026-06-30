// ============================================================
//  Du Life - Memoria Emocional
//  lib/emocionalEngine.js
// ============================================================

import { supabase } from './supabase.js';

const KEYWORDS = {
  'alegria': [
    'feliz', 'contento', 'alegre', 'genial', 'increíble', 'increible',
    'maravilloso', 'fantástico', 'fantastico', 'emocionado',
    'mejor día', 'mejor dia', 'logré', 'logre', 'éxito', 'exito'
  ],
  'tristeza': [
    'triste', 'deprimido', 'mal', 'desanimado', 'llorando',
    'duele', 'doloroso', 'horrible', 'devastado'
  ],
  'preocupacion': [
    'preocupado', 'ansioso', 'nervioso', 'inquieto', 'angustiado',
    'me preocupa', 'tengo miedo', 'estresado', 'agobiado'
  ],
  'orgullo': [
    'orgulloso', 'logré', 'logre', 'lo hice', 'lo logramos',
    'me felicitaron', 'reconocimiento', 'graduado', 'aprobé', 'aprobe'
  ],
  'amor': [
    'amo', 'quiero mucho', 'la amo', 'lo amo', 'enamorado',
    'mi amor', 'cariño'
  ],
  'gratitud': [
    'gracias', 'agradecido', 'bendecido', 'afortunado'
  ],
  'ira': [
    'enojado', 'molesto', 'rabia', 'furioso',
    'me da rabia', 'odio', 'no soporto', 'harto'
  ],
  'frustracion': [
    'frustrado', 'no funciona', 'no avanzo', 'estancado',
    'cansado de esto', 'me rindo'
  ],
  'esperanza': [
    'espero', 'ojalá', 'ojala', 'tengo fe', 'va a salir bien',
    'lo voy a lograr'
  ]
};

// ─────────────────────────────────────────
// DETECTAR EMOCIÓN
// ─────────────────────────────────────────

export function detectarEmocion(mensajeTexto) {
  if (!mensajeTexto) return null;
  
  const texto = mensajeTexto.toLowerCase();
  const detectadas = [];
  
  for (const [emocion, palabras] of Object.entries(KEYWORDS)) {
    const coincidencias = palabras.filter(p => texto.includes(p));
    if (coincidencias.length > 0) {
      detectadas.push({
        emocion,
        coincidencias: coincidencias.length,
        palabras: coincidencias
      });
    }
  }
  
  if (detectadas.length === 0) return null;
  
  detectadas.sort((a, b) => b.coincidencias - a.coincidencias);
  const principal = detectadas[0];
  
  return {
    tipo: principal.emocion,
    intensidad: estimarIntensidad(texto, principal),
    palabras_detectadas: principal.palabras
  };
}

function estimarIntensidad(texto, deteccion) {
  let intensidad = 5;
  if (deteccion.coincidencias >= 3) intensidad += 2;
  else if (deteccion.coincidencias >= 2) intensidad += 1;
  
  const exclamaciones = (texto.match(/!/g) || []).length;
  if (exclamaciones >= 2) intensidad += 1;
  if (exclamaciones >= 4) intensidad += 1;
  
  const intensificadores = ['muy', 'super', 'súper', 'extremadamente', 'demasiado', 'realmente'];
  if (intensificadores.some(i => texto.includes(i))) intensidad += 1;
  
  return Math.min(10, Math.max(1, intensidad));
}

// ─────────────────────────────────────────
// REGISTRAR EMOCIÓN
// ─────────────────────────────────────────

export async function registrarEmocion(usuarioId, datos) {
  try {
    const { data, error } = await supabase
      .from('emociones')
      .insert({
        usuario_id: usuarioId,
        tipo_emocion: datos.tipo,
        intensidad: datos.intensidad || 5,
        descripcion: datos.descripcion,
        contexto: datos.contexto,
        fecha: new Date().toISOString(),
        duracion_estimada: datos.duracion_estimada || 'momentaneo',
        entidad_id: datos.entidad_id,
        entidades_relacionadas: datos.entidades_relacionadas || [],
        importancia: calcularImportancia(datos)
      })
      .select()
      .single();
    if (error) console.error('Error registrando emoción:', error);
    return data;
  } catch (e) {
    console.error('Error registrarEmocion:', e.message);
    return null;
  }
}

function calcularImportancia(datos) {
  let importancia = 5;
  if (datos.intensidad >= 8) importancia += 3;
  else if (datos.intensidad >= 6) importancia += 1;
  
  const intensas = ['amor', 'orgullo', 'tristeza', 'miedo'];
  if (intensas.includes(datos.tipo)) importancia += 1;
  
  if (datos.entidad_id) importancia += 1;
  return Math.min(10, Math.max(1, importancia));
}

// ─────────────────────────────────────────
// PROCESADOR PRINCIPAL
// ─────────────────────────────────────────

export async function procesarEmocionMensaje(usuarioId, mensajeTexto, entidadesDetectadas = []) {
  const deteccion = detectarEmocion(mensajeTexto);
  if (!deteccion) return null;
  
  let entidadId = null;
  let entidadesIds = [];
  if (entidadesDetectadas.length > 0) {
    entidadId = entidadesDetectadas[0].id;
    entidadesIds = entidadesDetectadas.map(e => e.id);
  }
  
  return await registrarEmocion(usuarioId, {
    tipo: deteccion.tipo,
    intensidad: deteccion.intensidad,
    descripcion: `Detectada en: "${mensajeTexto.substring(0, 100)}"`,
    contexto: mensajeTexto.substring(0, 200),
    entidad_id: entidadId,
    entidades_relacionadas: entidadesIds
  });
}

// ─────────────────────────────────────────
// ANÁLISIS DE ESTADO DE ÁNIMO
// ─────────────────────────────────────────

export async function analizarEstadoAnimo(usuarioId, dias = 7) {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  
  const { data: emociones } = await supabase
    .from('emociones')
    .select('*')
    .eq('usuario_id', usuarioId)
    .gte('fecha', desde.toISOString())
    .order('fecha', { ascending: false })
    .limit(30);
  
  if (!emociones || emociones.length === 0) {
    return { estado: 'sin_datos', emociones: [] };
  }
  
  const conteos = {};
  emociones.forEach(e => {
    conteos[e.tipo_emocion] = (conteos[e.tipo_emocion] || 0) + 1;
  });
  
  const positivas = ['alegria', 'orgullo', 'amor', 'gratitud', 'esperanza'];
  const negativas = ['tristeza', 'preocupacion', 'ira', 'miedo', 'frustracion'];
  
  let posCount = 0, negCount = 0;
  emociones.forEach(e => {
    if (positivas.includes(e.tipo_emocion)) posCount++;
    if (negativas.includes(e.tipo_emocion)) negCount++;
  });
  
  let estado = 'neutral';
  if (posCount > negCount * 2) estado = 'positivo';
  else if (negCount > posCount * 2) estado = 'negativo';
  else if (posCount > negCount) estado = 'mas_positivo';
  else if (negCount > posCount) estado = 'mas_negativo';
  
  return {
    estado,
    total_emociones: emociones.length,
    positivas: posCount,
    negativas: negCount,
    conteos,
    periodo_dias: dias
  };
}