// ============================================================
//  Du Life - Dashboard Consolidado
//  api/dashboard/[modulo].js
// ============================================================

import {
  supabase,
  obtenerResumenMes,
  obtenerGastos,
  obtenerEntidadesPorTipo,
} from '../../lib/supabase.js';
import crypto from 'crypto';
import { guardarSuscripcion, eliminarSuscripcion } from '../../lib/push.js';

// ===== AUTH HELPERS =====

function verificarToken(token) {
  if (!token) return null;
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return null;
    const [header, payload, signature] = partes;
    const secret = process.env.JWT_SECRET || 'dulife_secret_change_in_production';
    const data = `${header}.${payload}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (signature !== expected) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch (e) {
    return null;
  }
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {});
}

// ===== HANDLERS POR MÓDULO =====

async function handleResumen(usuarioId) {
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nombre, como_llamar, telefono, pais, plan, foto_url')
    .eq('id', usuarioId)
    .single();

  if (!usuario) return { status: 404, body: { error: 'Usuario no encontrado' } };

  const hoy = new Date().toISOString().split('T')[0];

  const [
    resumenMes,
    ultimosGastos,
    personas,
    tareasPendientesRes,
    recordatoriosHoyRes,
    metasActivasRes,
    totalPersonasRes,
  ] = await Promise.all([
    obtenerResumenMes(usuarioId),
    obtenerGastos(usuarioId, { limite: 5 }),
    obtenerEntidadesPorTipo(usuarioId, 'persona', 5),
    supabase
      .from('tareas')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .is('eliminado_en', null)
      .is('completada_en', null),
    supabase
      .from('tareas')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .is('eliminado_en', null)
      .is('completada_en', null)
      .eq('fecha_vencimiento', hoy),
    supabase
      .from('entidades')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('tipo_entidad', 'objetivo')
      .eq('activo', true),
    supabase
      .from('entidades')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('tipo_entidad', 'persona')
      .eq('activo', true),
  ]);

  return {
    status: 200,
    body: {
      usuario,
      resumen: {
        total_gastos: resumenMes.total_gastos,
        total_ingresos: resumenMes.total_ingresos,
        balance: resumenMes.balance,
        total_personas: totalPersonasRes.count || 0,
        ultimos_gastos: ultimosGastos || [],
        personas: personas || [],
        tareas_pendientes: tareasPendientesRes.count || 0,
        recordatorios_hoy: recordatoriosHoyRes.count || 0,
        metas_activas: metasActivasRes.count || 0,
      },
    },
  };
}

async function handleTimeline(usuarioId) {
  const [gastos, ingresosRes, notasRes, ideasRes, tareasRes, personas] = await Promise.all([
    obtenerGastos(usuarioId, { limite: 40 }),
    supabase
      .from('ingresos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .is('eliminado_en', null)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })
      .limit(40),
    supabase
      .from('notas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .is('eliminado_en', null)
      .neq('archivada', true)
      .order('creado_en', { ascending: false })
      .limit(40),
    supabase
      .from('ideas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .is('eliminado_en', null)
      .order('creado_en', { ascending: false })
      .limit(40),
    supabase
      .from('tareas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .is('eliminado_en', null)
      .order('creado_en', { ascending: false })
      .limit(40),
    obtenerEntidadesPorTipo(usuarioId, 'persona', 40),
  ]);

  return {
    status: 200,
    body: {
      gastos: gastos || [],
      ingresos: ingresosRes.data || [],
      notas: notasRes.data || [],
      ideas: ideasRes.data || [],
      tareas: tareasRes.data || [],
      personas: personas || [],
    },
  };
}

async function handleBalance(usuarioId) {
  const [gastosRes, ingresosRes, usuarioRes] = await Promise.all([
    supabase
      .from('gastos')
      .select('id, monto, fecha, hora, descripcion, categoria, lugar, metodo_pago')
      .eq('usuario_id', usuarioId)
      .is('eliminado_en', null)
      .order('fecha', { ascending: false })
      .limit(2000),
    supabase
      .from('ingresos')
      .select('id, monto, fecha, hora, descripcion, fuente, metodo_pago')
      .eq('usuario_id', usuarioId)
      .is('eliminado_en', null)
      .order('fecha', { ascending: false })
      .limit(2000),
    supabase.from('usuarios').select('como_llamar, nombre, foto_url').eq('id', usuarioId).single(),
  ]);

  const gastos = gastosRes.data || [];
  const ingresos = ingresosRes.data || [];

  const sumar = (lista) => lista.reduce((s, x) => s + Number(x.monto), 0);
  const totalGastos = sumar(gastos);
  const totalIngresos = sumar(ingresos);
  const balance = totalIngresos - totalGastos;

  const ahora = new Date();
  const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);

  const enRango = (fechaStr, desde, hasta) => {
    const f = new Date(fechaStr + 'T00:00:00');
    return f >= desde && (!hasta || f < hasta);
  };

  const gastosMes = sumar(gastos.filter((g) => enRango(g.fecha, inicioMesActual)));
  const gastosMesAnterior = sumar(gastos.filter((g) => enRango(g.fecha, inicioMesAnterior, inicioMesActual)));
  const ingresosMes = sumar(ingresos.filter((i) => enRango(i.fecha, inicioMesActual)));
  const ingresosMesAnterior = sumar(ingresos.filter((i) => enRango(i.fecha, inicioMesAnterior, inicioMesActual)));

  const variacion = (actual, anterior) => {
    if (!anterior) return actual > 0 ? 100 : 0;
    return Math.round(((actual - anterior) / anterior) * 100);
  };

  // Balance acumulado al final de cada uno de los últimos 6 meses
  const movimientos = [
    ...gastos.map((g) => ({ fecha: g.fecha, monto: -Number(g.monto) })),
    ...ingresos.map((i) => ({ fecha: i.fecha, monto: Number(i.monto) })),
  ];

  const serieMensual = [];
  for (let i = 5; i >= 0; i--) {
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 1);
    const acumulado = movimientos
      .filter((m) => new Date(m.fecha + 'T00:00:00') < finMes)
      .reduce((s, m) => s + m.monto, 0);
    const mesRef = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    serieMensual.push({
      mes: mesRef.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
      total: acumulado,
    });
  }

  const actividadReciente = [
    ...gastos.slice(0, 10).map((g) => ({ ...g, tipo: 'gasto' })),
    ...ingresos.slice(0, 10).map((i) => ({ ...i, tipo: 'ingreso' })),
  ]
    .sort((a, b) => {
      const dtA = new Date(a.fecha + 'T' + (a.hora || '00:00:00'));
      const dtB = new Date(b.fecha + 'T' + (b.hora || '00:00:00'));
      return dtB - dtA;
    })
    .slice(0, 5);

  return {
    status: 200,
    body: {
      usuario: usuarioRes.data || null,
      balance,
      totalIngresos,
      totalGastos,
      ingresosMes,
      gastosMes,
      variacionIngresos: variacion(ingresosMes, ingresosMesAnterior),
      variacionGastos: variacion(gastosMes, gastosMesAnterior),
      variacionBalance: variacion(balance, balance - (ingresosMes - gastosMes)),
      serieMensual,
      actividadReciente,
      gastosRecientes: gastos.slice(0, 14),
      ingresosRecientes: ingresos.slice(0, 14),
    },
  };
}

async function handleGastos(usuarioId) {
  const [gastos, ingresosData, resumen] = await Promise.all([
    obtenerGastos(usuarioId, { limite: 50 }),
    supabase
      .from('ingresos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .is('eliminado_en', null)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })
      .limit(50),
    obtenerResumenMes(usuarioId),
  ]);
  return {
    status: 200,
    body: {
      gastos,
      ingresos: ingresosData.data || [],
      resumen,
    },
  };
}

async function handlePersonas(usuarioId) {
  const personas = await obtenerEntidadesPorTipo(usuarioId, 'persona', 50);
  return { status: 200, body: { personas } };
}

async function handleArbol(usuarioId) {
  const [
    areasRes,
    metasRes,
    personasRes,
    ideasRes,
    notasRes,
    gastosCountRes,
    ingresosCountRes,
    usuarioRes,
  ] = await Promise.all([
    supabase
      .from('arbol_vida')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('activo', true)
      .order('orden', { ascending: true }),
    supabase
      .from('entidades')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('tipo_entidad', 'objetivo')
      .eq('activo', true),
    supabase
      .from('entidades')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('tipo_entidad', 'persona')
      .eq('activo', true),
    supabase.from('ideas').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId).is('eliminado_en', null),
    supabase.from('notas').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId).is('eliminado_en', null),
    supabase.from('gastos').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId).is('eliminado_en', null),
    supabase.from('ingresos').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId).is('eliminado_en', null),
    supabase.from('usuarios').select('creado_en, como_llamar, nombre').eq('id', usuarioId).single(),
  ]);

  const areas = areasRes.data || [];

  // Ramas dinámicas asignadas por el asistente: usamos coincidencia de nombre
  // para las categorías del árbol que no tienen tabla dedicada propia.
  const contarRama = (nombres) =>
    areas.filter((a) => nombres.includes((a.rama || '').toLowerCase().trim())).length;

  const usuario = usuarioRes.data;
  const diasHistoria = usuario?.creado_en
    ? Math.max(0, Math.floor((Date.now() - new Date(usuario.creado_en).getTime()) / 86400000))
    : 0;

  return {
    status: 200,
    body: {
      areas,
      categorias: {
        metas: metasRes.count || 0,
        personas: personasRes.count || 0,
        ideas: ideasRes.count || 0,
        notas: notasRes.count || 0,
        finanzas: (gastosCountRes.count || 0) + (ingresosCountRes.count || 0),
        logros: contarRama(['logro', 'logros']),
        experiencias: contarRama(['experiencia', 'experiencias']),
        aprendizajes: contarRama(['aprendizaje', 'aprendizajes']),
        retos: contarRama(['reto', 'retos', 'desafio', 'desafios']),
      },
      momentos: areas.length,
      dias_historia: diasHistoria,
    },
  };
}

async function handleNotas(usuarioId) {
  const { data } = await supabase
    .from('notas')
    .select('*')
    .eq('usuario_id', usuarioId)
    .is('eliminado_en', null)
    .neq('archivada', true)
    .order('pineada', { ascending: false })
    .order('creado_en', { ascending: false })
    .limit(100);
  return { status: 200, body: { notas: data || [] } };
}

async function handleTareas(usuarioId) {
  const { data } = await supabase
    .from('tareas')
    .select('*')
    .eq('usuario_id', usuarioId)
    .is('eliminado_en', null)
    .is('completada_en', null)
    .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
    .order('creado_en', { ascending: false })
    .limit(100);
  return { status: 200, body: { tareas: data || [] } };
}

async function handleIdeas(usuarioId) {
  const { data } = await supabase
    .from('ideas')
    .select('*')
    .eq('usuario_id', usuarioId)
    .is('eliminado_en', null)
    .order('favorita', { ascending: false })
    .order('creado_en', { ascending: false })
    .limit(100);
  return { status: 200, body: { ideas: data || [] } };
}

async function handlePushSubscribe(usuarioId, req) {
  try {
    const body = req.body || {};
    const suscripcion = body.suscripcion || body;
    const userAgent = req.headers['user-agent'] || null;

    const resultado = await guardarSuscripcion(usuarioId, suscripcion, userAgent);
    if (!resultado.ok) {
      return { status: 400, body: { error: resultado.error || 'No se pudo guardar' } };
    }
    return { status: 200, body: { ok: true } };
  } catch (e) {
    console.error('Error push_subscribe:', e.message);
    return { status: 500, body: { error: 'Error interno' } };
  }
}

async function handlePushUnsubscribe(usuarioId, req) {
  try {
    const body = req.body || {};
    const endpoint = body.endpoint;
    if (!endpoint) {
      return { status: 400, body: { error: 'endpoint requerido' } };
    }
    const resultado = await eliminarSuscripcion(endpoint);
    return { status: 200, body: { ok: resultado.ok } };
  } catch (e) {
    return { status: 500, body: { error: 'Error interno' } };
  }
}

async function handleUsuario(usuarioId) {
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', usuarioId)
    .single();
  if (!usuario) return { status: 404, body: { error: 'Usuario no encontrado' } };
  return { status: 200, body: { usuario } };
}

// ===== ROUTER =====

const HANDLERS = {
  resumen: handleResumen,
  timeline: handleTimeline,
  balance: handleBalance,
  gastos: handleGastos,
  personas: handlePersonas,
  arbol: handleArbol,
  notas: handleNotas,
  tareas: handleTareas,
  ideas: handleIdeas,
  usuario: handleUsuario,
  push_subscribe: handlePushSubscribe,
  push_unsubscribe: handlePushUnsubscribe,
};

export default async function handler(req, res) {
  // Auth
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.dulife_token;
  const sesion = verificarToken(token);
  if (!sesion || !sesion.usuario_id) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // Router
  const { modulo } = req.query;
  const handlerFn = HANDLERS[modulo];

  if (!handlerFn) {
    return res.status(404).json({ error: `Módulo '${modulo}' no existe` });
  }

  try {
    const { status, body } = await handlerFn(sesion.usuario_id, req);
    return res.status(status).json(body);
  } catch (e) {
    console.error(`Error en ${modulo}:`, e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}