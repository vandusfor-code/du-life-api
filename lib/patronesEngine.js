// ============================================================
//  Du Life - Patrones Engine
//  lib/patronesEngine.js
//  Detecta pagos recurrentes y rutinas
// ============================================================

import { supabase } from './supabase.js';

// ─────────────────────────────────────────
// DETECTAR PAGOS RECURRENTES
// ─────────────────────────────────────────

export async function detectarPagosRecurrentes(usuarioId) {
  // Obtener gastos de los últimos 4 meses
  const fechaDesde = new Date();
  fechaDesde.setMonth(fechaDesde.getMonth() - 4);
  const desde = fechaDesde.toISOString().split('T')[0];

  const { data: gastos } = await supabase
    .from('gastos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .is('eliminado_en', null)
    .gte('fecha', desde)
    .order('fecha', { ascending: true })
    .limit(200);

  if (!gastos || gastos.length < 3) return [];

  // Agrupar por descripción
  const grupos = agruparGastosPorDescripcion(gastos);
  const patrones = [];

  for (const [descripcion, lista] of Object.entries(grupos)) {
    if (lista.length < 2) continue;
    const analisis = analizarFrecuencia(lista);
    
    if (analisis.es_recurrente) {
      patrones.push({
        tipo: 'pago_recurrente',
        descripcion: descripcion,
        monto_promedio: analisis.monto_promedio,
        frecuencia: analisis.frecuencia,
        dia_mes_promedio: analisis.dia_mes_promedio,
        veces_observado: lista.length,
        confianza: analisis.confianza,
        ultima_ocurrencia: analisis.ultima_fecha,
        proxima_estimada: analisis.proxima_estimada
      });
    }
  }

  return patrones;
}

// ─────────────────────────────────────────
// AGRUPAR POR DESCRIPCIÓN
// ─────────────────────────────────────────

function agruparGastosPorDescripcion(gastos) {
  const grupos = {};
  gastos.forEach(g => {
    if (!g.descripcion) return;
    const desc = normalizarDescripcion(g.descripcion);
    if (!desc) return;
    if (!grupos[desc]) grupos[desc] = [];
    grupos[desc].push(g);
  });
  return grupos;
}

function normalizarDescripcion(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[0-9]/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(p => p.length >= 3)
    .slice(0, 3)
    .join(' ');
}

// ─────────────────────────────────────────
// ANALIZAR FRECUENCIA
// ─────────────────────────────────────────

function analizarFrecuencia(lista) {
  lista.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const fechas = lista.map(g => new Date(g.fecha));
  const montos = lista.map(g => Number(g.monto));
  
  // Intervalos entre pagos (días)
  const intervalos = [];
  for (let i = 1; i < fechas.length; i++) {
    intervalos.push(Math.round((fechas[i] - fechas[i-1]) / (1000 * 60 * 60 * 24)));
  }
  
  const promedioInt = intervalos.length > 0 
    ? intervalos.reduce((s, i) => s + i, 0) / intervalos.length 
    : 0;
  
  // Frecuencia
  let frecuencia = 'irregular';
  if (promedioInt >= 25 && promedioInt <= 35) frecuencia = 'mensual';
  else if (promedioInt >= 6 && promedioInt <= 8) frecuencia = 'semanal';
  else if (promedioInt >= 13 && promedioInt <= 16) frecuencia = 'quincenal';
  else if (promedioInt >= 85 && promedioInt <= 95) frecuencia = 'trimestral';
  
  // Confianza
  let confianza = 0.5;
  if (frecuencia !== 'irregular') {
    const varianza = intervalos.reduce((s, i) => s + Math.pow(i - promedioInt, 2), 0) / intervalos.length;
    const desvEst = Math.sqrt(varianza);
    confianza = Math.max(0.5, Math.min(0.95, 1 - (desvEst / promedioInt)));
  }
  
  // Día del mes promedio
  const dias = fechas.map(f => f.getDate());
  const diaMesPromedio = Math.round(dias.reduce((s, d) => s + d, 0) / dias.length);
  
  // Monto promedio
  const montoPromedio = Math.round(montos.reduce((s, m) => s + m, 0) / montos.length);
  
  // Próxima estimada
  const ultimaFecha = fechas[fechas.length - 1];
  const proxima = new Date(ultimaFecha);
  proxima.setDate(proxima.getDate() + Math.round(promedioInt));
  
  return {
    es_recurrente: frecuencia !== 'irregular' && confianza >= 0.6,
    frecuencia: frecuencia,
    monto_promedio: montoPromedio,
    dia_mes_promedio: diaMesPromedio,
    confianza: confianza,
    ultima_fecha: ultimaFecha.toISOString().split('T')[0],
    proxima_estimada: proxima.toISOString().split('T')[0]
  };
}

// ─────────────────────────────────────────
// GUARDAR PATRONES
// ─────────────────────────────────────────

export async function guardarPatrones(usuarioId, patrones) {
  for (const p of patrones) {
    await supabase
      .from('patrones')
      .insert({
        usuario_id: usuarioId,
        tipo_patron: p.tipo,
        descripcion: p.descripcion,
        datos: {
          monto_promedio: p.monto_promedio,
          dia_mes_promedio: p.dia_mes_promedio,
          proxima_estimada: p.proxima_estimada,
          ultima_ocurrencia: p.ultima_ocurrencia
        },
        frecuencia: p.frecuencia,
        confianza: p.confianza,
        activo: true
      });
  }
}

// ─────────────────────────────────────────
// ANÁLISIS COMPLETO
// ─────────────────────────────────────────

export async function analizarPatronesUsuario(usuarioId) {
  try {
    const pagos = await detectarPagosRecurrentes(usuarioId);
    if (pagos.length > 0) {
      await guardarPatrones(usuarioId, pagos);
    }
    return { pagos_recurrentes: pagos };
  } catch (e) {
    console.error('Error analizando patrones:', e.message);
    return { pagos_recurrentes: [] };
  }
}