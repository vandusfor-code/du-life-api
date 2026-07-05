// ============================================================
//  Du Life - Embeddings y Búsqueda Semántica
//  lib/embeddings.js
// ============================================================

import OpenAI from 'openai';
import { supabase } from './supabase.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────
// GENERAR EMBEDDING
// ─────────────────────────────────────────

export async function generarEmbedding(texto) {
  if (!texto || texto.trim().length === 0) return null;
  
  try {
    const textoLimpio = texto.trim().substring(0, 8000);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textoLimpio
    });
    
    if (response.data && response.data[0]) {
      return response.data[0].embedding;
    }
    return null;
  } catch (e) {
    console.error('Error embedding:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// GUARDAR EMBEDDING EN ENTIDAD
// ─────────────────────────────────────────

export async function guardarEmbeddingEntidad(entidadId, texto) {
  const embedding = await generarEmbedding(texto);
  if (!embedding) return null;
  
  return await supabase
    .from('entidades')
    .update({ embedding: embedding })
    .eq('id', entidadId);
}

// ─────────────────────────────────────────
// GUARDAR EMBEDDING EN HECHO
// ─────────────────────────────────────────

export async function guardarEmbeddingHecho(hechoId, texto) {
  const embedding = await generarEmbedding(texto);
  if (!embedding) return null;
  
  return await supabase
    .from('hechos')
    .update({ embedding: embedding })
    .eq('id', hechoId);
}

// ─────────────────────────────────────────
// BUSCAR ENTIDADES POR SIMILITUD
// ─────────────────────────────────────────

// Umbral calibrado empíricamente con text-embedding-3-small: una coincidencia
// claramente relevante marca ~0.6 de similitud coseno y una irrelevante ~0.15
// (no ~0.9 como en otros modelos). 0.7 dejaba fuera hasta matches obvios.
const UMBRAL_SIMILITUD = 0.35;

export async function buscarEntidadesSemantica(usuarioId, query, topK = 5) {
  const embedding = await generarEmbedding(query);
  if (!embedding) return [];

  const { data, error } = await supabase.rpc('buscar_entidades_semantica', {
    p_usuario_id: usuarioId,
    p_query_embedding: embedding,
    p_top_k: topK,
    p_umbral: UMBRAL_SIMILITUD
  });
  
  if (error) {
    console.error('Error búsqueda semántica entidades:', error);
    return [];
  }
  return data || [];
}

// ─────────────────────────────────────────
// BUSCAR HECHOS POR SIMILITUD
// ─────────────────────────────────────────

export async function buscarHechosSemantica(usuarioId, query, topK = 5) {
  const embedding = await generarEmbedding(query);
  if (!embedding) return [];
  
  const { data, error } = await supabase.rpc('buscar_hechos_semantica', {
    p_usuario_id: usuarioId,
    p_query_embedding: embedding,
    p_top_k: topK,
    p_umbral: UMBRAL_SIMILITUD
  });
  
  if (error) {
    console.error('Error búsqueda semántica hechos:', error);
    return [];
  }
  return data || [];
}

// ─────────────────────────────────────────
// BÚSQUEDA UNIFICADA EN MEMORIA
// ─────────────────────────────────────────

export async function buscarEnMemoria(usuarioId, query, topK = 10) {
  const embedding = await generarEmbedding(query);
  if (!embedding) return [];
  
  const { data, error } = await supabase.rpc('buscar_memoria_completa', {
    p_usuario_id: usuarioId,
    p_query_embedding: embedding,
    p_top_k: topK,
    p_umbral: UMBRAL_SIMILITUD
  });
  
  if (error) {
    console.error('Error búsqueda memoria:', error);
    return [];
  }
  return data || [];
}