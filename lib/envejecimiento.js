// ============================================================
//  Du Life - Envejecimiento de Información
//  lib/envejecimiento.js
//  Detecta datos obsoletos y propone actualizaciones
// ============================================================

import { supabase } from './supabase.js';

// ─────────────────────────────────────────
// CONFIGURACIÓN DE TIEMPOS
// ─────────────────────────────────────────

const VIDA_UTIL = {
  'telefono':         365,    // 1 año
  'direccion':        730,    // 2 años
  'email':            730,    // 2 años
  'contraseña':       180,    // 6 meses
  'documento':        365,    // 1 año
  'lugar_frecuente':  180,
  'preferencia':      365,
  'objetivo':         365,
  'proyecto':         180,
  'hecho':            730
};

// ─────────────────────────────────────────
// DETECTAR HECHOS OBSOLETOS
// ─────────────────────────────────────────

export async function detectarHechosObsoletos(usuarioId) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - VIDA_UTIL.hecho);
  
  const { data: hechos } = await supabase
    .from('hechos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('activo', true)
    .is('vigente_hasta', null)
    .lt('creado_en', fechaLimite.toISOString())
    .order('creado_en', { ascending: true })
    .limit(10);
  
  if (!hechos) return [];
  
  return hechos.map(h => ({
    tipo: 'hecho',
    id: h.id,
    contenido: h.hecho,
    categoria: h.categoria,
    dias_sin_revisar: Math.floor((new Date() - new Date(h.creado_en)) / (1000 * 60 * 60 * 24))
  }));
}

// ─────────────────────────────────────────
// DETECTAR ENTIDADES INACTIVAS
// ─────────────────────────────────────────

export async function detectarEntidadesInactivas(usuarioId) {
  const inactivas = [];
  
  const reglas = [
    { tipo: 'persona', dias: 365, importanciaMin: 4 },
    { tipo: 'lugar', dias: 365, importanciaMin: 4 },
    { tipo: 'objeto', dias: 730, importanciaMin: 4 }
  ];
  
  for (const regla of reglas) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - regla.dias);
    
    const { data: entidades } = await supabase
      .from('entidades')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('tipo_entidad', regla.tipo)
      .eq('activo', true)
      .gte('importancia', regla.importanciaMin)
      .lt('ultima_mencion', fechaLimite.toISOString())
      .order('ultima_mencion', { ascending: true })
      .limit(5);
    
    if (entidades && entidades.length > 0) {
      entidades.forEach(e => {
        inactivas.push({
          tipo: 'entidad',
          subtipo: e.tipo_entidad,
          id: e.id,
          nombre: e.nombre,
          dias_inactivo: Math.floor((new Date() - new Date(e.ultima_mencion)) / (1000 * 60 * 60 * 24))
        });
      });
    }
  }
  
  return inactivas;
}

// ─────────────────────────────────────────
// DETECTAR DOCUMENTOS VENCIDOS
// ─────────────────────────────────────────

export async function detectarDocumentosVencidos(usuarioId) {
  const hoy = new Date().toISOString().split('T')[0];
  
  const { data: vencidos } = await supabase
    .from('documentos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .is('eliminado_en', null)
    .not('fecha_vencimiento', 'is', null)
    .lt('fecha_vencimiento', hoy)
    .limit(20);
  
  if (!vencidos) return [];
  
  return vencidos.map(d => ({
    tipo: 'documento_vencido',
    id: d.id,
    titulo: d.titulo || d.tipo,
    fecha_vencimiento: d.fecha_vencimiento,
    dias_vencido: Math.floor((new Date() - new Date(d.fecha_vencimiento)) / (1000 * 60 * 60 * 24))
  }));
}

// ─────────────────────────────────────────
// REVISIÓN COMPLETA
// ─────────────────────────────────────────

export async function ejecutarRevisionEnvejecimiento(usuarioId) {
  const resultado = {
    hechos_obsoletos: [],
    entidades_inactivas: [],
    documentos_vencidos: [],
    total: 0
  };
  
  try {
    resultado.hechos_obsoletos = await detectarHechosObsoletos(usuarioId);
    resultado.entidades_inactivas = await detectarEntidadesInactivas(usuarioId);
    resultado.documentos_vencidos = await detectarDocumentosVencidos(usuarioId);
    
    resultado.total = 
      resultado.hechos_obsoletos.length +
      resultado.entidades_inactivas.length +
      resultado.documentos_vencidos.length;
    
    console.log(`⏳ Envejecimiento: ${resultado.total} elementos a revisar`);
  } catch (e) {
    console.error('Error envejecimiento:', e.message);
  }
  
  return resultado;
}

// ─────────────────────────────────────────
// INVALIDAR ELEMENTO
// ─────────────────────────────────────────

export async function invalidarHecho(hechoId) {
  return await supabase
    .from('hechos')
    .update({ 
      vigente_hasta: new Date().toISOString(),
      activo: false 
    })
    .eq('id', hechoId);
}

// ─────────────────────────────────────────
// CONFIRMAR VIGENCIA
// ─────────────────────────────────────────

export async function confirmarVigencia(tipo, id) {
  if (tipo === 'hecho') {
    return await supabase
      .from('hechos')
      .update({
        verificado: true,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', id);
  }
  
  if (tipo === 'entidad') {
    return await supabase
      .from('entidades')
      .update({ ultima_mencion: new Date().toISOString() })
      .eq('id', id);
  }
  
  return null;
}