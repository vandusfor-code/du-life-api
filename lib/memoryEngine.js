// ============================================================
//  Du Life - Memory Engine
//  lib/memoryEngine.js
//  Procesa la memoria que Claude extrae de cada mensaje
// ============================================================

import {
  crearOActualizarEntidad,
  crearHecho,
  buscarEntidad,
  supabase
} from './supabase.js';
import { guardarEmbeddingEntidad, guardarEmbeddingHecho } from './embeddings.js';

// ─────────────────────────────────────────
// PROCESADOR PRINCIPAL
// ─────────────────────────────────────────

export async function procesarMemoria(usuarioId, analisis) {
  const resultado = {
    entidades_creadas: [],
    hechos_creados: [],
    relaciones_creadas: []
  };

  try {
    // 1. Procesar entidades
    if (analisis.entidades && analisis.entidades.length > 0) {
      for (const e of analisis.entidades) {
        const importancia = calcularImportancia({
          tipo: e.tipo,
          tiene_atributos: !!e.atributos && Object.keys(e.atributos).length > 0
        });
        
        const ent = await crearOActualizarEntidad(usuarioId, {
          tipo_entidad: e.tipo,
          nombre: e.nombre,
          descripcion: e.descripcion,
          atributos: e.atributos || {},
          importancia: importancia
        });
        if (ent) {
          resultado.entidades_creadas.push(ent);
          const textoEmbedding = `${ent.nombre}${ent.descripcion ? ' - ' + ent.descripcion : ''}`;
          guardarEmbeddingEntidad(ent.id, textoEmbedding).catch(err => console.error('Error embedding entidad:', err.message));
        }
      }
    }

    // 2. Procesar hechos
    if (analisis.hechos && analisis.hechos.length > 0) {
      for (const h of analisis.hechos) {
        // Confianza mínima
        if (h.confianza && h.confianza < 0.5) continue;
        
        // Buscar entidad relacionada
        let entidadId = null;
        if (h.entidad_nombre) {
          const ents = await buscarEntidad(usuarioId, h.entidad_nombre);
          if (ents && ents.length > 0) entidadId = ents[0].id;
        }

        const hecho = await crearHecho(usuarioId, {
          hecho: h.hecho,
          categoria: h.categoria || 'general',
          entidad_id: entidadId,
          confianza: h.confianza || 0.8,
          verificado: (h.confianza || 0.8) >= 0.9
        });
        if (hecho) {
          resultado.hechos_creados.push(hecho);
          guardarEmbeddingHecho(hecho.id, hecho.hecho).catch(err => console.error('Error embedding hecho:', err.message));
        }
      }
    }

    // 3. Procesar relaciones
    if (analisis.relaciones && analisis.relaciones.length > 0) {
      for (const rel of analisis.relaciones) {
        const r = await procesarRelacion(usuarioId, rel);
        if (r) resultado.relaciones_creadas.push(r);
      }
    }

    return resultado;
  } catch (e) {
    console.error('Error en procesarMemoria:', e.message);
    return resultado;
  }
}

// ─────────────────────────────────────────
// PROCESAR RELACIÓN
// ─────────────────────────────────────────

async function procesarRelacion(usuarioId, datosRelacion) {
  try {
    const origen = await buscarEntidad(usuarioId, datosRelacion.entidad_origen);
    const destino = await buscarEntidad(usuarioId, datosRelacion.entidad_destino);

    if (!origen || !destino || origen.length === 0 || destino.length === 0) {
      return null;
    }

    // Verificar si ya existe
    const { data: existente } = await supabase
      .from('relaciones')
      .select('*')
      .eq('entidad_origen_id', origen[0].id)
      .eq('entidad_destino_id', destino[0].id)
      .eq('tipo_relacion', datosRelacion.tipo)
      .limit(1)
      .maybeSingle();
    
    if (existente) return existente;

    // Crear
    const { data, error } = await supabase
      .from('relaciones')
      .insert({
        usuario_id: usuarioId,
        entidad_origen_id: origen[0].id,
        entidad_destino_id: destino[0].id,
        tipo_relacion: datosRelacion.tipo,
        descripcion: datosRelacion.descripcion || null,
        fortaleza: datosRelacion.fortaleza || 5,
        activo: true
      })
      .select()
      .single();
    
    if (error) console.error('Error relacion:', error);
    return data;
  } catch (e) {
    console.error('Error procesarRelacion:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// CALCULAR IMPORTANCIA
// ─────────────────────────────────────────

function calcularImportancia(params) {
  let importancia = 5;
  
  const pesosTipo = {
    'persona': 2,
    'documento': 3,
    'proyecto': 2,
    'objetivo': 2,
    'objeto': 1,
    'lugar': 0,
    'evento': 0,
    'idea': 1,
    'concepto': -1
  };
  
  if (params.tipo && pesosTipo[params.tipo] !== undefined) {
    importancia += pesosTipo[params.tipo];
  }
  
  if (params.tiene_atributos) importancia += 1;
  
  return Math.min(10, Math.max(1, importancia));
}