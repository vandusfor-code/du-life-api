// ============================================================
//  Du Life - Dashboard Consolidado
//  api/dashboard/[modulo].js
// ============================================================

import {
  supabase,
  obtenerResumenMes,
  obtenerGastos,
  registrarGasto,
  obtenerEntidadesPorTipo,
  CATEGORIAS_BORRADO,
  borrarDatosUsuario,
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
    .select('id, nombre, como_llamar, telefono, pais, plan, foto_url, metadata, tratamiento')
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

async function handleGastos(usuarioId, req) {
  const metodo = req.method;

  // Agregar gasto directamente desde la app web (mismo registrarGasto que
  // usa el flujo de WhatsApp, para no duplicar reglas de negocio).
  if (metodo === 'POST') {
    const body = req.body || {};
    const monto = Number(body.monto);
    if (!monto || monto <= 0) {
      return { status: 400, body: { error: 'Monto inválido' } };
    }
    const gasto = await registrarGasto(usuarioId, {
      monto,
      descripcion: body.descripcion || null,
      lugar: body.lugar || null,
      metodo_pago: body.metodo_pago || 'efectivo',
      fecha: body.fecha || undefined,
    });
    if (!gasto) return { status: 500, body: { error: 'No se pudo registrar el gasto' } };
    return { status: 200, body: { gasto } };
  }

  // Editar un ingreso existente (monto/descripción/fuente/fecha) desde la
  // app web — distinto de actualizarIngreso() en lib/supabase.js, que solo
  // completa la fuente de un ingreso recién creado por WhatsApp.
  if (metodo === 'PATCH' && req.query.id) {
    const body = req.body || {};
    const updates = {};
    if (body.monto !== undefined) {
      const monto = Number(body.monto);
      if (!monto || monto <= 0) return { status: 400, body: { error: 'Monto inválido' } };
      updates.monto = monto;
    }
    if (body.descripcion !== undefined) updates.descripcion = body.descripcion || null;
    if (body.fuente !== undefined) updates.fuente = body.fuente || 'otro';
    if (body.fecha !== undefined) updates.fecha = body.fecha;

    if (Object.keys(updates).length === 0) {
      return { status: 400, body: { error: 'Nada que actualizar' } };
    }

    const { data, error } = await supabase
      .from('ingresos')
      .update(updates)
      .eq('id', req.query.id)
      .eq('usuario_id', usuarioId)
      .select()
      .single();

    if (error) return { status: 500, body: { error: 'No se pudo actualizar' } };
    return { status: 200, body: { ingreso: data } };
  }

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

async function handleNotas(usuarioId, req) {
  // Editar una nota existente (título/contenido) desde la app web.
  if (req.method === 'PATCH' && req.query.id) {
    const body = req.body || {};
    const updates = {};
    if (body.titulo !== undefined) {
      const titulo = String(body.titulo).trim();
      if (!titulo) return { status: 400, body: { error: 'El título no puede quedar vacío' } };
      updates.titulo = titulo;
    }
    if (body.contenido !== undefined) updates.contenido = String(body.contenido).trim() || null;

    if (Object.keys(updates).length === 0) {
      return { status: 400, body: { error: 'Nada que actualizar' } };
    }

    const { data, error } = await supabase
      .from('notas')
      .update(updates)
      .eq('id', req.query.id)
      .eq('usuario_id', usuarioId)
      .select()
      .single();

    if (error) return { status: 500, body: { error: 'No se pudo actualizar' } };
    return { status: 200, body: { nota: data } };
  }

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

  // Activar/desactivar el recordatorio de pago al deudor y guardar su
  // WhatsApp — mismo patrón de rama por req.method que admin_usuarios.
  if (req.method === 'PATCH' && id) {
    const body = req.body || {};
    const updates = {};

    if (body.telefono_deudor !== undefined) {
      updates.telefono_deudor = String(body.telefono_deudor).trim() || null;
    }
    if (body.recordatorio_pago_activo !== undefined) {
      updates.recordatorio_pago_activo = !!body.recordatorio_pago_activo;
    }

    if (Object.keys(updates).length === 0) {
      return { status: 400, body: { error: 'Nada que actualizar' } };
    }
    if (updates.recordatorio_pago_activo && !updates.telefono_deudor) {
      const { data: actual } = await supabase.from('prestamos').select('telefono_deudor').eq('id', id).eq('usuario_id', usuarioId).maybeSingle();
      if (!actual?.telefono_deudor) {
        return { status: 400, body: { error: 'Falta el número de WhatsApp del deudor' } };
      }
    }

    const { data, error } = await supabase
      .from('prestamos')
      .update(updates)
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .select()
      .single();

    if (error) return { status: 500, body: { error: 'No se pudo actualizar' } };
    return { status: 200, body: { prestamo: data } };
  }

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

// Borrar los datos del usuario por categoría (nunca la cuenta). El texto de
// confirmación "ELIMINAR" se valida acá, igual que en el flujo de WhatsApp,
// para que no baste con un solo click accidental en el frontend.
async function handleBorrarDatos(usuarioId, req) {
  if (req.method !== 'POST') {
    return { status: 400, body: { error: 'Solicitud inválida' } };
  }

  const body = req.body || {};
  const categorias = Array.isArray(body.categorias) ? body.categorias : [];
  const confirmacion = String(body.confirmacion || '').trim();

  if (categorias.length === 0) {
    return { status: 400, body: { error: 'Selecciona qué quieres borrar' } };
  }
  const validas = categorias.every((c) => c === 'todo' || CATEGORIAS_BORRADO[c]);
  if (!validas) {
    return { status: 400, body: { error: 'Categoría inválida' } };
  }
  if (confirmacion !== 'ELIMINAR') {
    return { status: 400, body: { error: 'Escribe ELIMINAR para confirmar' } };
  }

  const tablasBorradas = await borrarDatosUsuario(usuarioId, categorias);
  return { status: 200, body: { ok: true, tablas: tablasBorradas } };
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

    // Tratamiento (tú/usted): antes solo se fijaba una vez durante el
    // onboarding (lib/onboarding.js) — ahora también se puede cambiar desde
    // el perfil en cualquier momento.
    if (body.tratamiento !== undefined) {
      if (body.tratamiento !== 'tu' && body.tratamiento !== 'usted') {
        return { status: 400, body: { error: 'Tratamiento inválido' } };
      }
      updates.tratamiento = body.tratamiento;
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
  const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

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
    mensajes7DiasRes,
    intencionesHoyRes,
    usuariosRecientesRes,
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
    supabase.from('mensajes').select('creado_en').gte('creado_en', hace7Dias),
    supabase.from('mensajes').select('intencion_detectada').eq('role', 'assistant').gte('creado_en', inicioHoy).not('intencion_detectada', 'is', null),
    supabase.from('usuarios').select('id, nombre, como_llamar, telefono, plan, creado_en').order('creado_en', { ascending: false }).limit(5),
  ]);
  const latenciaSupabaseMs = Date.now() - inicioMedicion;

  // Tendencia de mensajes: un balde por día (zona horaria Colombia, UTC-5
  // fijo) para los últimos 7 días, incluyendo los días sin mensajes en 0.
  const tendenciaMensajes = [];
  {
    const porDia = {};
    for (const m of (mensajes7DiasRes.data || [])) {
      const fechaLocal = new Date(new Date(m.creado_en).getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0];
      porDia[fechaLocal] = (porDia[fechaLocal] || 0) + 1;
    }
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000);
      const fecha = d.toISOString().split('T')[0];
      tendenciaMensajes.push({ fecha, total: porDia[fecha] || 0 });
    }
  }

  // Distribución de intenciones detectadas hoy (solo mensajes del asistente,
  // que son los que llevan intencion_detectada ya clasificada por Claude).
  const distribucionIntenciones = (() => {
    const conteo = {};
    for (const m of (intencionesHoyRes.data || [])) {
      const i = m.intencion_detectada;
      conteo[i] = (conteo[i] || 0) + 1;
    }
    return Object.entries(conteo)
      .map(([intencion, total]) => ({ intencion, total }))
      .sort((a, b) => b.total - a.total);
  })();

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
      tendencia_mensajes: tendenciaMensajes,
      distribucion_intenciones: distribucionIntenciones,
      usuarios_recientes: (usuariosRecientesRes.data || []).map((u) => ({
        id: u.id,
        nombre: u.como_llamar || u.nombre,
        telefono: u.telefono,
        plan: u.plan || 'free',
        creado_en: u.creado_en,
      })),
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

// Bandeja de conversaciones: últimos mensajes reales agrupados por usuario
// (uno por usuario, el más reciente), y el hilo completo al entrar al
// detalle. No hay GROUP BY vía PostgREST, así que se arma en memoria sobre
// una ventana de los últimos 300 mensajes — suficiente para "conversaciones
// recientes", no es un historial exhaustivo de todos los usuarios.
async function handleAdminConversaciones(usuarioId, req) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const { id } = req.query;

  if (id) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nombre, como_llamar, telefono')
      .eq('id', id)
      .single();
    if (!usuario) return { status: 404, body: { error: 'Usuario no encontrado' } };

    const { data: mensajes, count, error } = await supabase
      .from('mensajes')
      .select('id, role, mensaje, tipo_mensaje, intencion_detectada, modelo_ai, creado_en', { count: 'exact' })
      .eq('usuario_id', id)
      .order('creado_en', { ascending: false })
      .limit(200);

    if (error) return { status: 500, body: { error: 'No se pudo cargar el historial' } };

    return { status: 200, body: { usuario, mensajes: (mensajes || []).reverse(), total: count || 0 } };
  }

  const { data: recientes, error } = await supabase
    .from('mensajes')
    .select('usuario_id, role, mensaje, creado_en')
    .order('creado_en', { ascending: false })
    .limit(300);

  if (error) return { status: 500, body: { error: 'No se pudo cargar la lista' } };

  const vistos = new Set();
  const ultimoPorUsuario = [];
  for (const m of recientes || []) {
    if (vistos.has(m.usuario_id)) continue;
    vistos.add(m.usuario_id);
    ultimoPorUsuario.push(m);
  }

  const ids = ultimoPorUsuario.map((m) => m.usuario_id);
  const { data: usuarios } = ids.length
    ? await supabase.from('usuarios').select('id, nombre, como_llamar, telefono').in('id', ids)
    : { data: [] };
  const usuarioPorId = Object.fromEntries((usuarios || []).map((u) => [u.id, u]));

  const conversaciones = ultimoPorUsuario
    .map((m) => ({
      usuario: usuarioPorId[m.usuario_id] || null,
      usuario_id: m.usuario_id,
      ultimo_mensaje: m.mensaje,
      ultimo_role: m.role,
      ultima_fecha: m.creado_en,
    }))
    .filter((c) => c.usuario);

  return { status: 200, body: { conversaciones } };
}

// Memoria real (entidades + hechos activos) por usuario. Igual que
// conversaciones, sin GROUP BY vía PostgREST: se agrega en memoria sobre
// hasta 5000 filas de cada tabla — de sobra para el volumen actual.
async function handleAdminMemoria(usuarioId, req) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const { id } = req.query;

  if (id) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nombre, como_llamar, telefono')
      .eq('id', id)
      .single();
    if (!usuario) return { status: 404, body: { error: 'Usuario no encontrado' } };

    const [entidadesRes, hechosRes] = await Promise.all([
      supabase
        .from('entidades')
        .select('id, tipo_entidad, nombre, descripcion, importancia, veces_mencionada, ultima_mencion')
        .eq('usuario_id', id)
        .eq('activo', true)
        .order('importancia', { ascending: false }),
      supabase
        .from('hechos')
        .select('id, hecho, categoria, confianza, verificado, creado_en')
        .eq('usuario_id', id)
        .eq('activo', true)
        .order('creado_en', { ascending: false }),
    ]);

    return {
      status: 200,
      body: { usuario, entidades: entidadesRes.data || [], hechos: hechosRes.data || [] },
    };
  }

  const [entidadesRes, hechosRes] = await Promise.all([
    supabase.from('entidades').select('usuario_id').eq('activo', true).limit(5000),
    supabase.from('hechos').select('usuario_id').eq('activo', true).limit(5000),
  ]);

  const conteo = {};
  for (const e of entidadesRes.data || []) {
    conteo[e.usuario_id] = conteo[e.usuario_id] || { entidades: 0, hechos: 0 };
    conteo[e.usuario_id].entidades += 1;
  }
  for (const h of hechosRes.data || []) {
    conteo[h.usuario_id] = conteo[h.usuario_id] || { entidades: 0, hechos: 0 };
    conteo[h.usuario_id].hechos += 1;
  }

  const ids = Object.keys(conteo);
  const { data: usuarios } = ids.length
    ? await supabase.from('usuarios').select('id, nombre, como_llamar, telefono').in('id', ids)
    : { data: [] };

  const lista = (usuarios || [])
    .map((u) => ({ usuario: u, ...conteo[u.id] }))
    .sort((a, b) => (b.entidades + b.hechos) - (a.entidades + a.hechos));

  return { status: 200, body: { usuarios: lista } };
}

// Uso real de IA: se agrega sobre los últimos 2000 mensajes del asistente
// que ya tienen modelo_ai/tokens_usados/duracion_ms guardados (ver
// lib/asistente.js). Nota: Gemini (búsqueda web, redacción, vision, PDFs)
// no queda registrado con su propio modelo aquí — el campo modelo_ai
// siempre refleja el modelo de Claude que clasificó el mensaje, no la
// herramienta táctica que terminó respondiendo. La distribución por
// intención sí muestra cuánto se usan esas intenciones (busqueda_web,
// redactar_mensaje, etc.), que es la señal real de uso de Gemini hoy.
async function handleAdminIA(usuarioId) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const { data: mensajes, error } = await supabase
    .from('mensajes')
    .select('modelo_ai, tokens_usados, intencion_detectada, metadata, creado_en')
    .eq('role', 'assistant')
    .not('modelo_ai', 'is', null)
    .order('creado_en', { ascending: false })
    .limit(2000);

  if (error) return { status: 500, body: { error: 'No se pudo cargar el uso de IA' } };

  const hace7dias = Date.now() - 7 * 86400000;
  const porModelo = {};
  const porIntencion = {};
  let tokensTotal = 0;
  let llamadas7dias = 0;

  for (const m of mensajes || []) {
    const modelo = m.modelo_ai || 'desconocido';
    if (!porModelo[modelo]) porModelo[modelo] = { llamadas: 0, tokens: 0, sumaDuracion: 0, conDuracion: 0 };
    porModelo[modelo].llamadas += 1;
    porModelo[modelo].tokens += m.tokens_usados || 0;
    if (m.metadata?.duracion_ms != null) {
      porModelo[modelo].sumaDuracion += m.metadata.duracion_ms;
      porModelo[modelo].conDuracion += 1;
    }

    const intencion = m.intencion_detectada || 'sin_clasificar';
    porIntencion[intencion] = (porIntencion[intencion] || 0) + 1;

    tokensTotal += m.tokens_usados || 0;
    if (new Date(m.creado_en).getTime() >= hace7dias) llamadas7dias += 1;
  }

  const modelos = Object.entries(porModelo).map(([modelo, d]) => ({
    modelo,
    llamadas: d.llamadas,
    tokens: d.tokens,
    duracion_promedio_ms: d.conDuracion ? Math.round(d.sumaDuracion / d.conDuracion) : null,
  })).sort((a, b) => b.llamadas - a.llamadas);

  const intenciones = Object.entries(porIntencion)
    .map(([intencion, llamadas]) => ({ intencion, llamadas }))
    .sort((a, b) => b.llamadas - a.llamadas)
    .slice(0, 12);

  return {
    status: 200,
    body: {
      total_llamadas: (mensajes || []).length,
      llamadas_ultimos_7_dias: llamadas7dias,
      tokens_total: tokensTotal,
      modelos,
      intenciones,
    },
  };
}

// Todas las tablas del proyecto (según grep sobre api/**/*.js y lib/*.js),
// no solo las que cuelgan de usuario_id — para tener el panorama completo.
const TABLAS_TODAS = [
  'usuarios', 'mensajes', 'entidades', 'hechos', 'gastos', 'ingresos',
  'notas', 'tareas', 'ideas', 'calendario_eventos', 'prestamos',
  'prestamos_movimientos', 'patrones', 'arbol_vida', 'documentos',
  'push_subscriptions', 'emociones', 'archivos_multimedia', 'relaciones',
  'onboarding_estado', 'usuario_perfil_estado', 'resumen_semanal',
  'registro_animo', 'codigos_otp',
];

async function handleAdminBaseDeDatos(usuarioId) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const resultados = await Promise.all(
    TABLAS_TODAS.map(async (tabla) => {
      const { count, error } = await supabase.from(tabla).select('id', { count: 'exact', head: true });
      return { tabla, filas: error ? null : (count || 0), error: error ? error.message : null };
    })
  );

  return { status: 200, body: { tablas: resultados } };
}

// Tendencias de los últimos 14 días: usuarios nuevos, mensajes de usuarios
// reales (no cuenta las respuestas del asistente) y gastos registrados.
async function handleAdminAnalytics(usuarioId) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const hace14dias = new Date();
  hace14dias.setDate(hace14dias.getDate() - 13);
  hace14dias.setHours(0, 0, 0, 0);
  const desdeISO = hace14dias.toISOString();
  const desdeFecha = hace14dias.toISOString().split('T')[0];

  const [usuariosRes, mensajesRes, gastosRes] = await Promise.all([
    supabase.from('usuarios').select('creado_en').gte('creado_en', desdeISO),
    supabase.from('mensajes').select('creado_en').eq('role', 'user').gte('creado_en', desdeISO),
    supabase.from('gastos').select('fecha').gte('fecha', desdeFecha),
  ]);

  const dias = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(hace14dias);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const contarPorDia = (filas, campo) => {
    const conteo = Object.fromEntries(dias.map((d) => [d, 0]));
    for (const f of filas || []) {
      const clave = String(f[campo]).split('T')[0];
      if (clave in conteo) conteo[clave] += 1;
    }
    return dias.map((d) => conteo[d]);
  };

  return {
    status: 200,
    body: {
      dias,
      usuarios_nuevos: contarPorDia(usuariosRes.data, 'creado_en'),
      mensajes: contarPorDia(mensajesRes.data, 'creado_en'),
      gastos: contarPorDia(gastosRes.data, 'fecha'),
    },
  };
}

// Estado de integraciones externas: solo confirma si la variable de entorno
// está configurada (booleano) — nunca expone el valor. La "última
// actividad" real de Claude/Meta ya se calcula en handleAdminDashboard, se
// recalcula acá con la misma lógica para no acoplar los dos handlers.
const SERVICIOS_EXTERNOS = [
  { id: 'whatsapp', nombre: 'WhatsApp Cloud API (Meta)', vars: ['WA_ACCESS_TOKEN', 'WA_PHONE_NUMBER_ID'] },
  { id: 'claude', nombre: 'Anthropic Claude', vars: ['CLAUDE_API_KEY'] },
  { id: 'gemini', nombre: 'Google Gemini', vars: ['GEMINI_API_KEY'] },
  { id: 'openai', nombre: 'OpenAI (Whisper + embeddings)', vars: ['OPENAI_API_KEY'] },
  { id: 'supabase', nombre: 'Supabase', vars: ['SUPABASE_URL', 'SUPABASE_KEY'] },
  { id: 'qstash', nombre: 'QStash (Upstash)', vars: ['QSTASH_TOKEN'] },
  { id: 'auth', nombre: 'Autenticación (JWT)', vars: ['JWT_SECRET'] },
];

async function handleAdminApis(usuarioId) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const servicios = SERVICIOS_EXTERNOS.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    configurado: s.vars.every((v) => !!process.env[v]),
    variables: s.vars.map((v) => ({ nombre: v, configurada: !!process.env[v] })),
  }));

  const [ultimoClaudeRes, ultimoMetaRes] = await Promise.all([
    supabase.from('mensajes').select('creado_en').eq('role', 'assistant').not('metadata->duracion_ms', 'is', null).order('creado_en', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('mensajes').select('creado_en').eq('role', 'user').order('creado_en', { ascending: false }).limit(1).maybeSingle(),
  ]);

  return {
    status: 200,
    body: {
      servicios,
      ultima_actividad: {
        claude: ultimoClaudeRes.data?.creado_en || null,
        meta: ultimoMetaRes.data?.creado_en || null,
      },
    },
  };
}

// Documentación de los jobs reales del sistema (ver programarJob() en
// api/webhook.js, lib/asistente.js y api/cron-daily.js). No todos tienen
// una columna dedicada para saber "cuándo corrió por última vez" — donde
// no la hay, se dice explícitamente en vez de inventar un dato.
const CRON_JOBS = [
  {
    id: 'procesar-webhook',
    nombre: 'Procesar mensaje de WhatsApp',
    disparador: 'Cada mensaje entrante (QStash, encolado desde api/webhook.js)',
    descripcion: 'Job principal: decide qué hacer con el mensaje (texto/imagen/audio/documento) y genera la respuesta.',
  },
  {
    id: 'recordatorio-tarea',
    nombre: 'Recordatorio de tarea',
    disparador: 'Programado por api/cron-daily.js (6am) y al crear una tarea con fecha',
    descripcion: 'Envía el recordatorio de WhatsApp a la hora programada de una tarea.',
  },
  {
    id: 'recordatorio-calendario',
    nombre: 'Recordatorio de evento',
    disparador: 'Programado al crear un evento de calendario con fecha futura',
    descripcion: 'Envía el recordatorio de WhatsApp 5 minutos antes de un evento.',
  },
  {
    id: 'resumen-semanal',
    nombre: 'Resumen semanal',
    disparador: 'Programado por api/cron-daily.js los domingos',
    descripcion: 'Genera y envía el resumen semanal de gastos/ingresos/actividad.',
  },
  {
    id: 'reflexion-nocturna',
    nombre: 'Reflexión nocturna',
    disparador: 'Programado por api/cron-daily.js (lunes, miércoles y viernes, 8PM)',
    descripcion: 'Mensaje de cierre de día para reflexión/balance.',
  },
  {
    id: 'chequeo-semana',
    nombre: 'Chequeo de fin de semana',
    disparador: 'Programado por api/cron-daily.js (sábados)',
    descripcion: 'Mensaje de chequeo para el fin de semana.',
  },
  {
    id: 'reactivacion',
    nombre: 'Reactivación de usuario inactivo',
    disparador: 'Programado por api/cron-daily.js según inactividad',
    descripcion: 'Mensaje para reactivar a un usuario que dejó de escribir.',
  },
  {
    id: 'seguimiento-temprano',
    nombre: 'Seguimiento temprano (3 días post-onboarding)',
    disparador: 'Enviado directo por api/cron-daily.js, una sola vez por usuario',
    descripcion: 'Pregunta cómo le ha ido a usuarios que casi no han usado Du Life en sus primeros 3 días.',
  },
  {
    id: 'recordatorio-onboarding',
    nombre: 'Recordatorio de registro incompleto',
    disparador: 'Programado por lib/onboarding.js, 3 horas después del último paso respondido',
    descripcion: 'Mensaje libre (sin plantilla) para quien dejó el registro a medias, invitándolo a continuar.',
  },
  {
    id: 'recordatorio-pago-deudor',
    nombre: 'Recordatorio de pago al deudor',
    disparador: 'Enviado directo por api/cron-daily.js el día de pago acordado, solo si el usuario activó el recordatorio',
    descripcion: 'Plantilla al deudor avisando que hoy tiene un pago pendiente. La confirmación de pago recibido se envía aparte, al registrar el pago en el chat (lib/prestamosEngine.js).',
  },
];

async function handleAdminCronJobs(usuarioId) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const [ultimoMensajeRes, ultimaTareaRes, ultimoResumenRes] = await Promise.all([
    supabase.from('mensajes').select('creado_en').order('creado_en', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('tareas').select('recordatorio_enviado_en').not('recordatorio_enviado_en', 'is', null).order('recordatorio_enviado_en', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('resumen_semanal').select('creado_en').order('creado_en', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const ultimaEjecucionPorId = {
    'procesar-webhook': ultimoMensajeRes.data?.creado_en || null,
    'recordatorio-tarea': ultimaTareaRes.data?.recordatorio_enviado_en || null,
    'resumen-semanal': ultimoResumenRes.data?.creado_en || null,
  };

  const jobs = CRON_JOBS.map((j) => ({ ...j, ultima_ejecucion: ultimaEjecucionPorId[j.id] ?? null }));

  return { status: 200, body: { jobs } };
}

// "Logs" honesto: el proyecto no tiene una tabla de errores de servidor —
// esos viven en el dashboard de Vercel. Lo que sí hay es un feed real y
// más amplio de eventos de negocio (mensajes, altas, préstamos,
// recordatorios, gastos), útil para ver actividad reciente sin necesitar
// Vercel. Mismo patrón que handleAdminActividad, con más volumen y una
// fuente más (gastos).
async function handleAdminLogs(usuarioId) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const [mensajesRes, usuariosRes, prestamosRes, tareasRes, gastosRes] = await Promise.all([
    supabase.from('mensajes').select('usuario_id, role, intencion_detectada, creado_en').order('creado_en', { ascending: false }).limit(30),
    supabase.from('usuarios').select('id, nombre, como_llamar, creado_en').order('creado_en', { ascending: false }).limit(10),
    supabase.from('prestamos').select('usuario_id, nombre_deudor, created_at').order('created_at', { ascending: false }).limit(10),
    supabase.from('tareas').select('usuario_id, titulo, recordatorio_enviado_en').not('recordatorio_enviado_en', 'is', null).order('recordatorio_enviado_en', { ascending: false }).limit(10),
    supabase.from('gastos').select('usuario_id, monto, categoria, fecha').order('fecha', { ascending: false }).limit(10),
  ]);

  const idsUsuarios = [
    ...(mensajesRes.data || []).map((m) => m.usuario_id),
    ...(prestamosRes.data || []).map((p) => p.usuario_id),
    ...(tareasRes.data || []).map((t) => t.usuario_id),
    ...(gastosRes.data || []).map((g) => g.usuario_id),
  ];
  const { data: nombresRes } = idsUsuarios.length
    ? await supabase.from('usuarios').select('id, nombre, como_llamar').in('id', [...new Set(idsUsuarios)])
    : { data: [] };
  const nombrePorId = Object.fromEntries((nombresRes || []).map((u) => [u.id, u.como_llamar || u.nombre || 'Usuario']));

  const eventos = [
    ...(mensajesRes.data || []).map((m) => ({
      tipo: m.role === 'user' ? 'mensaje_entrante' : 'mensaje_saliente',
      texto: m.role === 'user'
        ? `${nombrePorId[m.usuario_id] || 'Usuario'} escribió por WhatsApp`
        : `Du Life respondió a ${nombrePorId[m.usuario_id] || 'Usuario'}${m.intencion_detectada ? ` (${m.intencion_detectada})` : ''}`,
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
    ...(gastosRes.data || []).map((g) => ({
      tipo: 'gasto',
      texto: `${nombrePorId[g.usuario_id] || 'Usuario'} registró un gasto en ${g.categoria || 'otros'}`,
      fecha: g.fecha,
    })),
  ]
    .filter((e) => e.fecha)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 40);

  return { status: 200, body: { eventos } };
}

// Catálogo de los módulos reales de Du Life (los que el usuario final usa
// por WhatsApp/dashboard), con conteo real de uso — a diferencia de "Base
// de datos" (que lista TODAS las tablas técnicas), esto agrupa por
// funcionalidad de producto.
const MODULOS_PRODUCTO = [
  { id: 'gastos', nombre: 'Gastos', tabla: 'gastos' },
  { id: 'ingresos', nombre: 'Ingresos', tabla: 'ingresos' },
  { id: 'tareas', nombre: 'Tareas', tabla: 'tareas' },
  { id: 'notas', nombre: 'Notas', tabla: 'notas' },
  { id: 'ideas', nombre: 'Ideas', tabla: 'ideas' },
  { id: 'calendario', nombre: 'Calendario', tabla: 'calendario_eventos' },
  { id: 'prestamos', nombre: 'Préstamos', tabla: 'prestamos' },
  { id: 'arbol', nombre: 'Árbol de Vida', tabla: 'arbol_vida' },
  { id: 'documentos', nombre: 'Documentos', tabla: 'documentos' },
  { id: 'emociones', nombre: 'Estado de ánimo', tabla: 'emociones' },
];

async function handleAdminModulos(usuarioId) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const conteos = await Promise.all(
    MODULOS_PRODUCTO.map((m) => supabase.from(m.tabla).select('id', { count: 'exact', head: true }))
  );

  const modulos = MODULOS_PRODUCTO.map((m, i) => ({
    id: m.id,
    nombre: m.nombre,
    usos: conteos[i].count || 0,
  })).sort((a, b) => b.usos - a.usos);

  return { status: 200, body: { modulos } };
}

// Config a nivel de app (distinto de admin_apis, que es integraciones
// externas): valores no-secretos se muestran tal cual (modelo, huso
// horario, versión de API), las variables sensibles solo como booleano.
const CONFIG_VISIBLE = [
  { var: 'CLAUDE_MODEL', label: 'Modelo Claude', default: 'claude-sonnet-4-6' },
  { var: 'GEMINI_MODEL', label: 'Modelo Gemini', default: 'gemini-2.5-flash' },
  { var: 'TIMEZONE', label: 'Zona horaria', default: 'America/Bogota' },
  { var: 'WA_API_VERSION', label: 'Versión WhatsApp Cloud API', default: null },
];

const CONFIG_SENSIBLE = [
  'CLAUDE_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'JWT_SECRET',
  'CRON_SECRET', 'QSTASH_TOKEN', 'SUPABASE_URL', 'SUPABASE_KEY',
  'WA_ACCESS_TOKEN', 'WA_PHONE_NUMBER_ID', 'WA_VERIFY_TOKEN',
  'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'OWNER_PHONE',
];

async function handleAdminConfiguracion(usuarioId) {
  if (!(await verificarRolAdmin(usuarioId))) {
    return { status: 403, body: { error: 'No autorizado' } };
  }

  const visibles = CONFIG_VISIBLE.map((c) => ({
    label: c.label,
    valor: process.env[c.var] || c.default,
  }));

  const sensibles = CONFIG_SENSIBLE.map((v) => ({
    nombre: v,
    configurada: !!process.env[v],
  }));

  return { status: 200, body: { visibles, sensibles, entorno: process.env.VERCEL_ENV || 'development' } };
}

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
  borrar_datos: handleBorrarDatos,
  admin_dashboard: handleAdminDashboard,
  admin_actividad: handleAdminActividad,
  admin_arquitectura: handleAdminArquitectura,
  admin_usuarios: handleAdminUsuarios,
  admin_conversaciones: handleAdminConversaciones,
  admin_memoria: handleAdminMemoria,
  admin_ia: handleAdminIA,
  admin_base_de_datos: handleAdminBaseDeDatos,
  admin_analytics: handleAdminAnalytics,
  admin_apis: handleAdminApis,
  admin_cron_jobs: handleAdminCronJobs,
  admin_logs: handleAdminLogs,
  admin_modulos: handleAdminModulos,
  admin_configuracion: handleAdminConfiguracion,
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