// ============================================================
//  Du Life - Motor de Préstamos
//  lib/prestamosEngine.js
//  Flujo conversacional de creación (5 pasos) + motor de pagos/abonos.
//  El estado del flujo se guarda en usuarios.metadata.prestamo_en_progreso
//  (no existe una tabla dedicada para esto — se reutiliza el JSONB
//  genérico que ya tiene la tabla usuarios, igual que se hace en otras
//  partes del proyecto para no requerir una migración nueva).
// ============================================================

import {
  actualizarUsuario,
  crearPrestamo,
  obtenerPrestamo,
  obtenerPrestamos,
  obtenerPrestamosActivosPorDeudor,
  actualizarPrestamo,
  crearMovimientoPrestamo,
  registrarIngreso,
} from './supabase.js';

const CAMPOS_PRESTAMO = ['nombre_deudor', 'capital', 'valor_cuota', 'cantidad_cuotas', 'dia_pago'];
const PASO_POR_CAMPO = { nombre_deudor: 1, capital: 2, valor_cuota: 3, cantidad_cuotas: 4, dia_pago: 5 };
const PREGUNTA_POR_PASO = {
  1: '¿A quién le prestaste el dinero?',
  2: '¿Cuánto dinero le prestaste?',
  3: '¿Cuál será el valor de cada cuota?',
  4: '¿Cuántas cuotas acordaron?',
  5: '¿Qué día del mes debe pagar?',
};

// ─────────────────────────────────────────
// ESTADO DE CONVERSACIÓN (usuarios.metadata)
// ─────────────────────────────────────────

export function obtenerPrestamoEnProgreso(usuario) {
  return usuario.metadata?.prestamo_en_progreso || null;
}

// Los updates a metadata reemplazan la columna completa en Postgres, así
// que siempre se parte del metadata actual y se mergea la clave nueva —
// nunca se sobreescribe todo el objeto.
async function guardarPasoPrestamo(usuario, actualizacionParcial) {
  const actual = usuario.metadata?.prestamo_en_progreso || { paso: 1, datos: {} };
  const nuevoEstado = {
    paso: actualizacionParcial.paso ?? actual.paso,
    datos: { ...actual.datos, ...(actualizacionParcial.datos || {}) },
  };
  const nuevoMetadata = { ...(usuario.metadata || {}), prestamo_en_progreso: nuevoEstado };
  await actualizarUsuario(usuario.id, { metadata: nuevoMetadata });
  usuario.metadata = nuevoMetadata;
  return nuevoEstado;
}

export async function limpiarPrestamoEnProgreso(usuario) {
  const nuevoMetadata = { ...(usuario.metadata || {}) };
  delete nuevoMetadata.prestamo_en_progreso;
  await actualizarUsuario(usuario.id, { metadata: nuevoMetadata });
  usuario.metadata = nuevoMetadata;
}

// Decisión pendiente por confirmar con botones/lista (¿pago de préstamo o
// ingreso normal?, ¿a cuál préstamo corresponde?). Expira a los 10 min para
// no quedar "colgada" si el usuario nunca responde.
export async function guardarDecisionPendiente(usuario, tipo, datos) {
  const nuevoMetadata = {
    ...(usuario.metadata || {}),
    decision_pendiente: { tipo, datos, expira: Date.now() + 10 * 60 * 1000 },
  };
  await actualizarUsuario(usuario.id, { metadata: nuevoMetadata });
  usuario.metadata = nuevoMetadata;
}

export function obtenerDecisionPendiente(usuario) {
  const d = usuario.metadata?.decision_pendiente;
  if (!d) return null;
  if (d.expira && Date.now() > d.expira) return null;
  return d;
}

export async function limpiarDecisionPendiente(usuario) {
  const nuevoMetadata = { ...(usuario.metadata || {}) };
  delete nuevoMetadata.decision_pendiente;
  await actualizarUsuario(usuario.id, { metadata: nuevoMetadata });
  usuario.metadata = nuevoMetadata;
}

// ─────────────────────────────────────────
// EXTRACCIÓN DE CADA RESPUESTA (Claude Haiku, respuesta corta)
// ─────────────────────────────────────────

async function extraerValorPaso(paso, texto) {
  const prompts = {
    1: `El usuario está respondiendo a "¿A quién le prestaste el dinero?". Su respuesta: "${texto}". Extrae ÚNICAMENTE el nombre de la persona, bien capitalizado. Si no se entiende un nombre, responde exactamente: null`,
    2: `El usuario está respondiendo a "¿Cuánto dinero le prestaste?". Su respuesta: "${texto}". Extrae SOLO el monto como número entero sin símbolos ni puntos ni comas (ej: "800 mil"=800000, "1.5M"=1500000, "$800.000"=800000). Responde solo el número. Si no se entiende, responde exactamente: null`,
    3: `El usuario está respondiendo a "¿Cuál será el valor de cada cuota?". Su respuesta: "${texto}". Extrae SOLO el monto como número entero sin símbolos. Responde solo el número. Si no se entiende, responde exactamente: null`,
    4: `El usuario está respondiendo a "¿Cuántas cuotas acordaron?". Su respuesta: "${texto}". Extrae SOLO la cantidad de cuotas como número entero. Responde solo el número. Si no se entiende, responde exactamente: null`,
    5: `El usuario está respondiendo a "¿Qué día del mes debe pagar?". Su respuesta: "${texto}". Extrae SOLO el día del mes como número entero entre 1 y 31. Responde solo el número. Si no se entiende, responde exactamente: null`,
  };

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 30,
      messages: [{ role: 'user', content: prompts[paso] }],
    });
    const resultado = r.content[0]?.text?.trim();
    if (!resultado || resultado.toLowerCase() === 'null') return null;
    if (paso === 1) return resultado;
    const numero = Number(resultado.replace(/[^\d.-]/g, ''));
    return Number.isFinite(numero) && numero > 0 ? numero : null;
  } catch (e) {
    console.error('Error extrayendo valor paso préstamo:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// RESUMEN / CÁLCULO
// ─────────────────────────────────────────

function calcularResumenPrestamo(datos) {
  const capital = Number(datos.capital);
  const valorCuota = Number(datos.valor_cuota);
  const cantidadCuotas = Number(datos.cantidad_cuotas);
  const totalEsperado = valorCuota * cantidadCuotas;
  const gananciaEsperada = totalEsperado - capital;
  const rentabilidad = capital > 0 ? (gananciaEsperada / capital) * 100 : 0;

  const texto = `📋 *Resumen del préstamo*\n\n` +
    `👤 Deudor: ${datos.nombre_deudor}\n` +
    `💵 Capital: $${Math.round(capital).toLocaleString('es-CO')}\n` +
    `📅 ${cantidadCuotas} cuotas de $${Math.round(valorCuota).toLocaleString('es-CO')}\n` +
    `🗓️ Pago el día ${datos.dia_pago} de cada mes\n` +
    `📈 Ganancia esperada: $${Math.round(gananciaEsperada).toLocaleString('es-CO')} (${rentabilidad.toFixed(1)}%)`;

  return { totalEsperado, gananciaEsperada, rentabilidad, texto };
}

export const BOTONES_CONFIRMAR_PRESTAMO = [
  { id: 'guardar_prestamo', title: '✅ Guardar' },
  { id: 'editar_prestamo', title: '✏️ Editar' },
  { id: 'cancelar_prestamo', title: '❌ Cancelar' },
];

// ─────────────────────────────────────────
// FLUJO DE CREACIÓN — un solo mensaje con todos los datos, o paso a paso
// ─────────────────────────────────────────

// Se llama cuando Claude clasifica intención "crear_prestamo". "datos" trae
// lo que Claude haya podido extraer de un solo mensaje (puede venir
// completo o parcial); lo que falte se pregunta paso a paso.
export async function iniciarOContinuarCreacionPrestamo(usuario, datos) {
  const datosParciales = {};
  for (const campo of CAMPOS_PRESTAMO) {
    if (datos?.[campo] != null && datos[campo] !== '') datosParciales[campo] = datos[campo];
  }

  const faltantes = CAMPOS_PRESTAMO.filter((c) => datosParciales[c] == null);

  if (faltantes.length === 0) {
    const { texto } = calcularResumenPrestamo(datosParciales);
    await guardarPasoPrestamo(usuario, { paso: 6, datos: datosParciales });
    return { respuesta: texto, botones: BOTONES_CONFIRMAR_PRESTAMO };
  }

  const paso = PASO_POR_CAMPO[faltantes[0]];
  await guardarPasoPrestamo(usuario, { paso, datos: datosParciales });
  return { respuesta: PREGUNTA_POR_PASO[paso] };
}

// Se llama en cada mensaje siguiente mientras hay un préstamo en progreso
// (paso 1-5): extrae el valor de ESTE paso y avanza al siguiente, o pide
// confirmación con botones si era el último.
export async function procesarPasoPrestamo(usuario, estadoActual, mensajeTexto) {
  const paso = estadoActual.paso;
  const campo = CAMPOS_PRESTAMO[paso - 1];
  const valor = await extraerValorPaso(paso, mensajeTexto);

  if (valor === null) {
    return { respuesta: `No entendí bien. ${PREGUNTA_POR_PASO[paso]}` };
  }

  const datosActualizados = { ...estadoActual.datos, [campo]: valor };

  if (paso < 5) {
    await guardarPasoPrestamo(usuario, { paso: paso + 1, datos: datosActualizados });
    return { respuesta: PREGUNTA_POR_PASO[paso + 1] };
  }

  const { texto } = calcularResumenPrestamo(datosActualizados);
  await guardarPasoPrestamo(usuario, { paso: 6, datos: datosActualizados });
  return { respuesta: texto, botones: BOTONES_CONFIRMAR_PRESTAMO };
}

export async function confirmarCreacionPrestamo(usuario) {
  const estado = obtenerPrestamoEnProgreso(usuario);
  if (!estado?.datos) return null;
  const prestamo = await crearPrestamo(usuario.id, estado.datos);
  await limpiarPrestamoEnProgreso(usuario);
  return prestamo;
}

export async function reiniciarCreacionPrestamo(usuario) {
  await guardarPasoPrestamo(usuario, { paso: 1, datos: {} });
  return PREGUNTA_POR_PASO[1];
}

export async function cancelarCreacionPrestamo(usuario) {
  await limpiarPrestamoEnProgreso(usuario);
}

// ─────────────────────────────────────────
// MOTOR DE PAGOS — cuotas completas, adelantadas y abonos parciales
// ─────────────────────────────────────────

export async function procesarPago(prestamoId, monto) {
  const prestamo = await obtenerPrestamo(prestamoId);
  if (!prestamo) return null;

  let montoRestante = monto;
  let cuotasCompletadas = 0;
  const movimientos = [];

  const faltaParaCuotaActual = prestamo.valor_cuota - prestamo.abono_cuota_actual;

  if (montoRestante >= faltaParaCuotaActual) {
    montoRestante -= faltaParaCuotaActual;
    cuotasCompletadas++;
    movimientos.push({ tipo: 'pago_completo', monto: faltaParaCuotaActual });

    while (
      montoRestante >= prestamo.valor_cuota &&
      prestamo.cuotas_pagadas + cuotasCompletadas < prestamo.cantidad_cuotas
    ) {
      montoRestante -= prestamo.valor_cuota;
      cuotasCompletadas++;
      movimientos.push({ tipo: 'pago_adelantado', monto: prestamo.valor_cuota });
    }

    if (montoRestante > 0) {
      movimientos.push({ tipo: 'abono', monto: montoRestante });
    }
  } else {
    movimientos.push({ tipo: 'abono', monto });
  }

  const cuotasPagadasFinal = prestamo.cuotas_pagadas + cuotasCompletadas;
  const nuevoEstado = cuotasPagadasFinal >= prestamo.cantidad_cuotas ? 'completado' : 'activo';
  // Si se completó al menos una cuota en esta transacción, el abono de la
  // cuota EN CURSO arranca de cero + lo que sobró (montoRestante); si no se
  // completó ninguna, el pago se suma al abono parcial que ya existía.
  const nuevoAbonoCuotaActual = cuotasCompletadas > 0
    ? montoRestante
    : prestamo.abono_cuota_actual + monto;

  await actualizarPrestamo(prestamoId, {
    cuotas_pagadas: cuotasPagadasFinal,
    abono_cuota_actual: nuevoAbonoCuotaActual,
    estado: nuevoEstado,
  });

  for (const mov of movimientos) {
    await crearMovimientoPrestamo(prestamo.usuario_id, {
      prestamo_id: prestamoId,
      tipo: mov.tipo,
      monto: mov.monto,
      cuotas_completadas: mov.tipo === 'abono' ? 0 : 1,
    });
  }

  // Todo el dinero recibido del deudor es ingreso real para el módulo de
  // finanzas, complete o no una cuota completa — se registra el monto TOTAL
  // recibido (el snippet original solo registraba "monto - montoRestante",
  // subestimando el ingreso cuando quedaba un abono parcial sin completar
  // cuota). Se usa registrarIngreso() ya existente: la tabla ingresos no
  // tiene columnas "categoria" ni "origen", el campo real es "fuente".
  await registrarIngreso(prestamo.usuario_id, {
    monto,
    descripcion: `Pago préstamo - ${prestamo.nombre_deudor}`,
    fuente: 'prestamo',
  });

  return {
    cuotasCompletadas,
    movimientos,
    montoRestante,
    prestamo: { ...prestamo, cuotas_pagadas: cuotasPagadasFinal, estado: nuevoEstado },
  };
}

export async function aplicarPagoYFormatear(prestamo, monto) {
  const resultado = await procesarPago(prestamo.id, monto);
  if (!resultado) return 'No pude registrar el pago.';

  const { cuotasCompletadas, montoRestante } = resultado;
  let texto = `✅ Pago registrado de ${prestamo.nombre_deudor}: $${Number(monto).toLocaleString('es-CO')}\n\n`;
  if (cuotasCompletadas > 0) {
    texto += `${cuotasCompletadas} cuota${cuotasCompletadas > 1 ? 's' : ''} completada${cuotasCompletadas > 1 ? 's' : ''}.\n`;
    if (montoRestante > 0) {
      texto += `Abono a la siguiente cuota: $${Math.round(montoRestante).toLocaleString('es-CO')}.\n`;
    }
  } else {
    texto += `Abono parcial registrado.\n`;
  }
  if (resultado.prestamo.estado === 'completado') {
    texto += `\n🎉 ¡Préstamo completado!`;
  }
  return texto.trim();
}

// ─────────────────────────────────────────
// BÚSQUEDA DE PRÉSTAMO PARA UN PAGO ENTRANTE
// ─────────────────────────────────────────

export async function resolverPrestamoParaPago(usuarioId, nombreDeudor) {
  if (!nombreDeudor) {
    const todos = await obtenerPrestamos(usuarioId);
    return todos.filter((p) => p.estado === 'activo');
  }
  return await obtenerPrestamosActivosPorDeudor(usuarioId, nombreDeudor);
}

// ─────────────────────────────────────────
// FORMATEO DE RESPUESTA DE CONSULTA
// ─────────────────────────────────────────

export function formatearConsultaPrestamo(prestamos) {
  const activos = prestamos.filter((p) => p.estado === 'activo');
  if (activos.length === 0) return 'No tienes préstamos activos registrados.';

  let texto = `💰 *Tus préstamos activos*\n\n`;
  for (const p of activos) {
    const saldoPendiente = p.total_esperado - (p.cuotas_pagadas * p.valor_cuota + p.abono_cuota_actual);
    texto += `👤 ${p.nombre_deudor}\n` +
      `   ${p.cuotas_pagadas} de ${p.cantidad_cuotas} cuotas pagadas\n` +
      `   Saldo pendiente: $${Math.max(0, Math.round(saldoPendiente)).toLocaleString('es-CO')}\n\n`;
  }
  return texto.trim();
}
