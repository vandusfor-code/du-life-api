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
  const { data } = await supabase
    .from('arbol_vida')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('activo', true)
    .order('orden', { ascending: true });
  return { status: 200, body: { areas: data || [] } };
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