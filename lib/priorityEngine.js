// ============================================================
//  Du Life - Priority Engine
//  lib/priorityEngine.js
// ============================================================

const KEYWORDS_ALTA = [
  'casa', 'apartamento', 'carro', 'vehículo', 'matrimonio',
  'boda', 'hijo', 'hija', 'nació', 'falleció', 'murió',
  'cáncer', 'diagnóstico', 'cirugía', 'enfermedad',
  'empresa', 'negocio', 'trabajo nuevo',
  'graduación', 'título', 'maestría', 'doctorado'
];

const KEYWORDS_BAJA = [
  'pan', 'almuerzo', 'cafe', 'café', 'soda',
  'gaseosa', 'agua', 'taxi', 'bus', 'parqueadero'
];

const PESOS_TIPO = {
  'persona': 2,
  'documento': 3,
  'proyecto': 2,
  'objetivo': 2,
  'objeto': 1,
  'lugar': 0,
  'evento': 0,
  'idea': 1
};

// ─────────────────────────────────────────
// IMPORTANCIA DE ENTIDAD
// ─────────────────────────────────────────

export function calcularImportanciaEntidad(datos) {
  let importancia = 5;
  
  if (datos.tipo_entidad && PESOS_TIPO[datos.tipo_entidad] !== undefined) {
    importancia += PESOS_TIPO[datos.tipo_entidad];
  }
  
  const veces = datos.veces_mencionada || 1;
  if (veces >= 10) importancia += 3;
  else if (veces >= 5) importancia += 2;
  else if (veces >= 2) importancia += 1;
  
  if (datos.atributos && Object.keys(datos.atributos).length > 3) {
    importancia += 1;
  }
  
  const texto = `${datos.nombre || ''} ${datos.descripcion || ''}`.toLowerCase();
  if (KEYWORDS_ALTA.some(k => texto.includes(k))) importancia += 2;
  if (KEYWORDS_BAJA.some(k => texto.includes(k))) importancia -= 2;
  
  return Math.min(10, Math.max(1, importancia));
}

// ─────────────────────────────────────────
// IMPORTANCIA DE GASTO
// ─────────────────────────────────────────

export function calcularImportanciaGasto(monto) {
  if (monto >= 5000000) return 10;
  if (monto >= 2000000) return 9;
  if (monto >= 1000000) return 8;
  if (monto >= 500000) return 7;
  if (monto >= 200000) return 6;
  if (monto >= 100000) return 5;
  if (monto >= 50000) return 4;
  if (monto >= 20000) return 3;
  return 2;
}

// ─────────────────────────────────────────
// DECISIONES
// ─────────────────────────────────────────

export function debeGenerarEmbedding(importancia) {
  return importancia >= 4;
}

export function debeIrALineaTiempo(importancia) {
  return importancia >= 5;
}

export function esHitoDeVida(importancia, datos) {
  if (importancia >= 9) return true;
  const texto = `${datos.titulo || ''} ${datos.descripcion || ''}`.toLowerCase();
  const hitos = [
    'matrimonio', 'boda', 'nacimiento', 'graduación',
    'compré casa', 'compré apartamento', 'mudanza',
    'nuevo trabajo', 'renuncia', 'empresa nueva'
  ];
  return hitos.some(h => texto.includes(h));
}

// ─────────────────────────────────────────
// PRIORIZAR ENTIDADES PARA CONTEXTO
// ─────────────────────────────────────────

export function priorizarParaContexto(entidades, limite = 10) {
  if (!entidades || entidades.length === 0) return [];
  
  const scored = entidades.map(e => {
    const recencia = e.ultima_mencion 
      ? (new Date() - new Date(e.ultima_mencion)) / (1000 * 60 * 60 * 24)
      : 365;
    const score = (e.importancia * 10) + (e.veces_mencionada * 2) - Math.min(recencia, 30);
    return { ...e, _score: score };
  });
  
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, limite);
}