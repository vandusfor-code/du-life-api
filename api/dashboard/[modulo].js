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
    .select('id, nombre, como_llamar, telefono, pais, plan, foto_url, metadata')
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
      .order('creado_en', { ascending: false })
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
      .select('*')
      .eq('usuario_id', usuarioId)
      .is('eliminado_en', null)
      .order('fecha', { ascending: false })
      .limit(2000),
    supabase
      .from('ingresos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .is('eliminado_en', null)
      .order('fecha', { ascending: false })
      .limit(2000),
    supabase.from('usuarios').select('*').eq('id', usuarioId).single(),
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
      .order('creado_en', { ascending: false })
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
    supabase.from('usuarios').select('*').eq('id', usuarioId).single(),
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

async function handleCalendario(usuarioId) {
  const hoy = new Date().toISOString().split('T')[0];
  const desde = new Date();
  desde.setDate(desde.getDate() - 7);

  const { data, error } = await supabase
    .from('calendario_eventos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .gte('fecha', desde.toISOString().split('T')[0])
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })
    .limit(300);

  if (error) console.error('Error calendario:', error.message);
  return { status: 200, body: { eventos: data || [], hoy } };
}

// Un solo handler para lista y detalle: sin ?id= devuelve todos los
// préstamos del usuario, con ?id= devuelve ese préstamo + sus movimientos.
// Así no hace falta un archivo/función nueva para la ruta [id].
async function handlePrestamos(usuarioId, req) {
  const { id } = req.query;

  if (id) {
    const { data: prestamo, error } = await supabase
      .from('prestamos')
      .select('*')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single();

    if (error || !prestamo) return { status: 404, body: { error: 'Préstamo no encontrado' } };

    const { data: movimientos, error: errorMov } = await supabase
      .from('prestamos_movimientos')
      .select('*')
      .eq('prestamo_id', id)
      .order('created_at', { ascending: false });

    if (errorMov) console.error('Error movimientos préstamo:', errorMov.message);

    return { status: 200, body: { prestamo, movimientos: movimientos || [] } };
  }

  const [prestamosRes, movimientosRes] = await Promise.all([
    supabase.from('prestamos').select('*').eq('usuario_id', usuarioId).order('created_at', { ascending: false }),
    supabase
      .from('prestamos_movimientos')
      .select('tipo, monto, created_at')
      .eq('usuario_id', usuarioId)
      .neq('tipo', 'condonacion')
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  if (prestamosRes.error) console.error('Error prestamos:', prestamosRes.error.message);
  if (movimientosRes.error) console.error('Error movimientos prestamos:', movimientosRes.error.message);

  return {
    status: 200,
    body: {
      prestamos: prestamosRes.data || [],
      movimientos: movimientosRes.data || [],
    },
  };
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

async function handleActualizarPerfil(usuarioId, req) {
  try {
    const body = req.body || {};
    const updates = {};

    // Nombre: opcional, pero si viene debe ser válido.
    if (body.como_llamar !== undefined) {
      const comoLlamar = String(body.como_llamar).trim();
      if (!comoLlamar || comoLlamar.length > 50) {
        return { status: 400, body: { error: 'Nombre inválido' } };
      }
      updates.como_llamar = comoLlamar;
    }

    // Foto de perfil: data URL base64 (ya viene comprimida desde el cliente,
    // ~15-30KB). foto_url es TEXT, así que se guarda directo sin Storage.
    // '' o null borra la foto.
    if (body.foto_url !== undefined) {
      const foto = body.foto_url;
      if (foto === null || foto === '') {
        updates.foto_url = null;
      } else if (typeof foto === 'string' && foto.startsWith('data:image/') && foto.length <= 400000) {
        updates.foto_url = foto;
      } else {
        return { status: 400, body: { error: 'Imagen inválida' } };
      }
    }

    if (Object.keys(updates).length === 0) {
      return { status: 400, body: { error: 'Nada que actualizar' } };
    }

    const { data, error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', usuarioId)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando perfil:', error.message);
      return { status: 500, body: { error: 'No se pudo actualizar' } };
    }

    return { status: 200, body: { usuario: data } };
  } catch (e) {
    console.error('Error actualizar_perfil:', e.message);
    return { status: 500, body: { error: 'Error interno' } };
  }
}

// El "módulo fijado" (sistema de pin del bottom nav) no tiene tabla/columna
// propia — se guarda en usuarios.metadata (JSONB genérico ya existente),
// igual que el estado de conversación de préstamos.
async function handleFijarModulo(usuarioId, req) {
  try {
    const body = req.body || {};
    const moduloFijado = body.modulo_fijado || null;

    const { data: usuarioActual } = await supabase.from('usuarios').select('metadata').eq('id', usuarioId).single();
    const metadataActual = usuarioActual?.metadata || {};

    const nuevoMetadata = { ...metadataActual };
    if (moduloFijado) nuevoMetadata.modulo_fijado = moduloFijado;
    else delete nuevoMetadata.modulo_fijado;

    const { data, error } = await supabase
      .from('usuarios')
      .update({ metadata: nuevoMetadata })
      .eq('id', usuarioId)
      .select()
      .single();

    if (error) {
      console.error('Error fijando módulo:', error.message);
      return { status: 500, body: { error: 'No se pudo actualizar' } };
    }

    return { status: 200, body: { usuario: data } };
  } catch (e) {
    console.error('Error fijar_modulo:', e.message);
    return { status: 500, body: { error: 'Error interno' } };
  }
}

// Preferencias generales (por ahora solo "tema"), mismo patrón de merge en
// usuarios.metadata que handleFijarModulo — sin tabla/columna dedicada.
async function handleGuardarPreferencias(usuarioId, req) {
  try {
    const body = req.body || {};

    const { data: usuarioActual } = await supabase.from('usuarios').select('metadata').eq('id', usuarioId).single();
    const metadataActual = usuarioActual?.metadata || {};

    const nuevoMetadata = { ...metadataActual };
    if (body.tema === 'light' || body.tema === 'dark') nuevoMetadata.tema = body.tema;

    const { data, error } = await supabase
      .from('usuarios')
      .update({ metadata: nuevoMetadata })
      .eq('id', usuarioId)
      .select()
      .single();

    if (error) {
      console.error('Error guardando preferencias:', error.message);
      return { status: 500, body: { error: 'No se pudo actualizar' } };
    }

    return { status: 200, body: { usuario: data } };
  } catch (e) {
    console.error('Error preferencias:', e.message);
    return { status: 500, body: { error: 'Error interno' } };
  }
}

// ===== CONTROL CENTER (admin) =====
// Estos handlers, además de la verificación de token normal (ya hecha en
// el router más abajo), exigen que el usuario tenga rol owner/admin en
// usuarios.metadata.rol antes de tocar datos de otros usuarios. El rol
// nunca se lee del JWT (que no se modifica) — siempre se consulta fresco.

async function verificarRolAdmin(usuarioId) {
  const { data } = await supabase
    .from('usuarios')
    .select('metadata')
    .eq('id', usuarioId)
    .single();
  const rol = data?.metadata?.rol;
  return rol === 'owner' || rol === 'admin';
}

async function handleAdminDashboard(usuarioId) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const hoyISO = new Date().toISOString().split('T')[0];
  const inicioHoy = `${hoyISO}T00:00:00.000Z`;

  const inicioMedicion = Date.now();
  const [
    usuariosTotalRes,
    usuariosActivosRes,
    mensajesHoyRes,
    mensajesUsuarioHoyRes,
    prestamosActivosRes,
    recordatoriosHoyRes,
    ultimoMensajeClaudeRes,
    ultimoMensajeMetaRes,
    ultimaTareaRecordatorioRes,
    ultimoResumenSemanalRes,
  ] = await Promise.all([
    supabase.from('usuarios').select('id', { count: 'exact', head: true }),
    supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('mensajes').select('id, usuario_id, tokens_usados', { count: 'exact' }).gte('creado_en', inicioHoy),
    supabase.from('mensajes').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('creado_en', inicioHoy),
    supabase.from('prestamos').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
    supabase.from('tareas').select('id', { count: 'exact', head: true }).gte('recordatorio_enviado_en', inicioHoy),
    supabase.from('mensajes').select('creado_en, metadata').eq('role', 'assistant').not('metadata->duracion_ms', 'is', null).order('creado_en', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('mensajes').select('creado_en').eq('role', 'user').order('creado_en', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('tareas').select('recordatorio_enviado_en').not('recordatorio_enviado_en', 'is', null).order('recordatorio_enviado_en', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('resumen_semanal').select('creado_en').order('creado_en', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const latenciaSupabaseMs = Date.now() - inicioMedicion;

  const mensajesHoy = mensajesHoyRes.data || [];
  const conversacionesHoy = new Set(mensajesHoy.map((m) => m.usuario_id)).size;
  const mensajesRecibidosHoy = mensajesUsuarioHoyRes.count || 0;
  const mensajesEnviadosHoy = mensajesHoy.length - mensajesRecibidosHoy;
  const tokensHoy = mensajesHoy.reduce((s, m) => s + (m.tokens_usados || 0), 0);

  const ultimaEjecucionCron = [ultimaTareaRecordatorioRes.data?.recordatorio_enviado_en, ultimoResumenSemanalRes.data?.creado_en]
    .filter(Boolean)
    .sort()
    .reverse()[0] || null;

  return {
    status: 200,
    body: {
      contadores: {
        usuarios_registrados: usuariosTotalRes.count || 0,
        usuarios_activos: usuariosActivosRes.count || 0,
        conversaciones_hoy: conversacionesHoy,
        mensajes_enviados_hoy: mensajesEnviadosHoy,
        mensajes_recibidos_hoy: mensajesRecibidosHoy,
        tokens_output_hoy: tokensHoy,
        prestamos_activos: prestamosActivosRes.count || 0,
        recordatorios_enviados_hoy: recordatoriosHoyRes.count || 0,
      },
      // input_tokens y costo monetario: no se capturan hoy — null explícito,
      // nunca un número inventado. El frontend debe mostrar "No disponible".
      estado_sistema: {
        claude: {
          ultima_llamada: ultimoMensajeClaudeRes.data?.creado_en || null,
          duracion_ms: ultimoMensajeClaudeRes.data?.metadata?.duracion_ms ?? null,
        },
        supabase: {
          latencia_ms: latenciaSupabaseMs,
        },
        meta: {
          ultima_actividad: ultimoMensajeMetaRes.data?.creado_en || null,
        },
        cron: {
          ultima_ejecucion: ultimaEjecucionCron,
        },
        vercel: {
          online: true,
        },
      },
    },
  };
}

async function handleAdminActividad(usuarioId) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const [mensajesRes, usuariosRes, prestamosRes, tareasRes] = await Promise.all([
    supabase.from('mensajes').select('usuario_id, creado_en').eq('role', 'user').order('creado_en', { ascending: false }).limit(8),
    supabase.from('usuarios').select('id, nombre, como_llamar, creado_en').order('creado_en', { ascending: false }).limit(5),
    supabase.from('prestamos').select('usuario_id, nombre_deudor, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('tareas').select('usuario_id, titulo, recordatorio_enviado_en').not('recordatorio_enviado_en', 'is', null).order('recordatorio_enviado_en', { ascending: false }).limit(5),
  ]);

  const idsUsuarios = [
    ...(mensajesRes.data || []).map((m) => m.usuario_id),
    ...(prestamosRes.data || []).map((p) => p.usuario_id),
    ...(tareasRes.data || []).map((t) => t.usuario_id),
  ];
  const { data: nombresRes } = idsUsuarios.length
    ? await supabase.from('usuarios').select('id, nombre, como_llamar').in('id', [...new Set(idsUsuarios)])
    : { data: [] };
  const nombrePorId = Object.fromEntries((nombresRes || []).map((u) => [u.id, u.como_llamar || u.nombre || 'Usuario']));

  const eventos = [
    ...(mensajesRes.data || []).map((m) => ({
      tipo: 'mensaje',
      texto: `${nombrePorId[m.usuario_id] || 'Usuario'} envió un mensaje`,
      fecha: m.creado_en,
    })),
    ...(usuariosRes.data || []).map((u) => ({
      tipo: 'usuario_nuevo',
      texto: `Nuevo usuario registrado: ${u.como_llamar || u.nombre}`,
      fecha: u.creado_en,
    })),
    ...(prestamosRes.data || []).map((p) => ({
      tipo: 'prestamo',
      texto: `${nombrePorId[p.usuario_id] || 'Usuario'} creó un préstamo a ${p.nombre_deudor}`,
      fecha: p.created_at,
    })),
    ...(tareasRes.data || []).map((t) => ({
      tipo: 'recordatorio',
      texto: `Recordatorio enviado a ${nombrePorId[t.usuario_id] || 'Usuario'}: ${t.titulo}`,
      fecha: t.recordatorio_enviado_en,
    })),
  ]
    .filter((e) => e.fecha)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 10);

  return { status: 200, body: { eventos } };
}

// Descripción estática de la arquitectura real del proyecto (archivos y
// tablas que existen de verdad hoy) — no son métricas en vivo, es
// documentación interactiva de lo que ya construimos.
const ARQUITECTURA_NODOS = [
  { id: 'usuario', nombre: 'Usuario', descripcion: 'Persona que escribe por WhatsApp.', archivos: [], servicios: [], tablas: [] },
  { id: 'whatsapp', nombre: 'WhatsApp Cloud API', descripcion: 'Entrada y salida de mensajes.', archivos: ['api/webhook.js'], servicios: ['Meta Cloud API v20.0'], tablas: [] },
  { id: 'webhook', nombre: 'Webhook', descripcion: 'Recibe el evento de Meta, responde 200 OK de inmediato y encola el procesamiento real.', archivos: ['api/webhook.js'], servicios: ['QStash (Upstash)'], tablas: [] },
  { id: 'motor_ia', nombre: 'Motor de Decisión', descripcion: 'Job asíncrono que decide qué hacer con el mensaje (texto, imagen o audio) y arma el contexto del usuario.', archivos: ['api/jobs/index.js', 'lib/asistente.js'], servicios: [], tablas: ['usuarios'] },
  { id: 'prompt', nombre: 'Claude (Prompt)', descripcion: 'Clasifica intención, extrae memoria y genera la respuesta.', archivos: ['lib/claude.js'], servicios: ['Anthropic Claude (Sonnet / Haiku)'], tablas: ['mensajes'] },
  { id: 'embeddings', nombre: 'Embeddings', descripcion: 'Búsqueda semántica sobre entidades y hechos guardados.', archivos: ['lib/embeddings.js'], servicios: ['OpenAI text-embedding-3-small'], tablas: ['entidades', 'hechos'] },
  { id: 'memoria', nombre: 'Memoria', descripcion: 'Entidades y hechos persistentes sobre el usuario.', archivos: ['lib/supabase.js'], servicios: [], tablas: ['entidades', 'hechos'] },
  { id: 'modulo', nombre: 'Módulo correspondiente', descripcion: 'Gastos, tareas, calendario, préstamos, notas, ideas — según la intención detectada.', archivos: ['lib/supabase.js'], servicios: [], tablas: ['gastos', 'ingresos', 'tareas', 'notas', 'ideas', 'calendario_eventos', 'prestamos'] },
  { id: 'supabase', nombre: 'Supabase', descripcion: 'Base de datos Postgres + pgvector.', archivos: ['lib/supabase.js'], servicios: ['Supabase (PostgreSQL)'], tablas: [] },
  { id: 'dashboard', nombre: 'Dashboard', descripcion: 'App web (móvil y escritorio) donde el usuario ve sus datos.', archivos: ['app/dashboard/**', 'api/dashboard/[modulo].js'], servicios: ['Vercel'], tablas: [] },
  { id: 'respuesta', nombre: 'Respuesta', descripcion: 'Texto final enviado de vuelta por WhatsApp.', archivos: ['lib/asistente.js'], servicios: ['Meta Cloud API'], tablas: [] },
];

async function handleAdminArquitectura(usuarioId) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }
  return { status: 200, body: { nodos: ARQUITECTURA_NODOS } };
}

// Todas las tablas con usuario_id apuntando a usuarios.id (según grep sobre
// lib/*.js) — mismo listado usado para el borrado manual por script.
// 'relaciones' va antes que 'entidades' porque relaciones.entidad_origen_id/
// destino_id apuntan a entidades.
const TABLAS_HIJAS_USUARIO = [
  'mensajes',
  'relaciones',
  'entidades',
  'hechos',
  'gastos',
  'ingresos',
  'notas',
  'tareas',
  'ideas',
  'calendario_eventos',
  'prestamos_movimientos',
  'prestamos',
  'patrones',
  'arbol_vida',
  'documentos',
  'push_subscriptions',
  'emociones',
  'archivos_multimedia',
  'onboarding_estado',
  'usuario_perfil_estado',
];

const ROLES_VALIDOS = ['owner', 'admin', 'developer', 'support', 'user'];

// Gestión completa de usuarios (owner/admin): listar+buscar, ver detalle
// con conteos reales de cuánto hay que borrar, editar campos y eliminar en
// cascada por las tablas de arriba. Un solo "módulo" que rama por
// req.method, igual que actualizar_perfil rama por presencia de campos.
async function handleAdminUsuarios(usuarioId, req) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const { id, q } = req.query;
  const metodo = req.method;

  // Detalle de un usuario puntual (incluye conteos por tabla).
  if (metodo === 'GET' && id) {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombre, como_llamar, telefono, pais, plan, activo, metadata, creado_en')
      .eq('id', id)
      .single();

    if (error || !usuario) return { status: 404, body: { error: 'Usuario no encontrado' } };

    const conteos = await Promise.all(
      TABLAS_HIJAS_USUARIO.map((tabla) =>
        supabase.from(tabla).select('id', { count: 'exact', head: true }).eq('usuario_id', id)
      )
    );
    const conteoPorTabla = Object.fromEntries(
      TABLAS_HIJAS_USUARIO.map((tabla, i) => [tabla, conteos[i].count || 0])
    );

    return { status: 200, body: { usuario, conteo_por_tabla: conteoPorTabla } };
  }

  // Lista con búsqueda opcional por nombre/apodo/teléfono.
  if (metodo === 'GET') {
    let query = supabase
      .from('usuarios')
      .select('id, nombre, como_llamar, telefono, pais, plan, activo, metadata, creado_en')
      .order('creado_en', { ascending: false })
      .limit(200);

    if (q && q.trim()) {
      const termino = q.trim();
      query = query.or(`nombre.ilike.%${termino}%,como_llamar.ilike.%${termino}%,telefono.ilike.%${termino}%`);
    }

    const { data, error } = await query;
    if (error) return { status: 500, body: { error: 'No se pudo listar usuarios' } };
    return { status: 200, body: { usuarios: data || [] } };
  }

  // Editar campos de un usuario.
  if (metodo === 'PATCH' && id) {
    const body = req.body || {};
    const updates = {};

    if (body.nombre !== undefined) updates.nombre = String(body.nombre).trim() || null;
    if (body.como_llamar !== undefined) updates.como_llamar = String(body.como_llamar).trim() || null;
    if (body.telefono !== undefined) updates.telefono = String(body.telefono).trim();
    if (body.pais !== undefined) updates.pais = String(body.pais).trim() || null;
    if (body.plan !== undefined) updates.plan = String(body.plan).trim() || null;
    if (body.activo !== undefined) updates.activo = !!body.activo;

    if (body.rol !== undefined) {
      // '' / null = "user, sin rol especial" (se guarda sin la clave rol).
      if (body.rol && !ROLES_VALIDOS.includes(body.rol)) {
        return { status: 400, body: { error: 'Rol inválido' } };
      }
      const { data: actual } = await supabase.from('usuarios').select('metadata').eq('id', id).single();
      const metadataNueva = { ...(actual?.metadata || {}) };
      if (body.rol) {
        metadataNueva.rol = body.rol;
      } else {
        delete metadataNueva.rol;
      }
      updates.metadata = metadataNueva;
    }

    if (Object.keys(updates).length === 0) {
      return { status: 400, body: { error: 'Nada que actualizar' } };
    }

    const { data, error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', id)
      .select('id, nombre, como_llamar, telefono, pais, plan, activo, metadata, creado_en')
      .single();

    if (error) return { status: 500, body: { error: 'No se pudo actualizar' } };
    return { status: 200, body: { usuario: data } };
  }

  // Borrar un usuario y todo su rastro en cascada.
  if (metodo === 'DELETE' && id) {
    if (id === usuarioId) {
      return { status: 400, body: { error: 'No puedes eliminar tu propia cuenta desde el Control Center' } };
    }

    const { data: existe } = await supabase.from('usuarios').select('id').eq('id', id).maybeSingle();
    if (!existe) return { status: 404, body: { error: 'Usuario no encontrado' } };

    for (const tabla of TABLAS_HIJAS_USUARIO) {
      const { error: errTabla } = await supabase.from(tabla).delete().eq('usuario_id', id);
      if (errTabla) console.error(`Error borrando de ${tabla} (admin_usuarios):`, errTabla.message);
    }

    const { error: errFinal } = await supabase.from('usuarios').delete().eq('id', id);
    if (errFinal) return { status: 500, body: { error: 'No se pudo eliminar el usuario' } };

    return { status: 200, body: { ok: true } };
  }

  return { status: 400, body: { error: 'Solicitud inválida' } };
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
  calendario: handleCalendario,
  prestamos: handlePrestamos,
  usuario: handleUsuario,
  actualizar_perfil: handleActualizarPerfil,
  fijar_modulo: handleFijarModulo,
  preferencias: handleGuardarPreferencias,
  push_subscribe: handlePushSubscribe,
  push_unsubscribe: handlePushUnsubscribe,
  admin_dashboard: handleAdminDashboard,
  admin_actividad: handleAdminActividad,
  admin_arquitectura: handleAdminArquitectura,
  admin_usuarios: handleAdminUsuarios,
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