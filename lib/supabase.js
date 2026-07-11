// ============================================================
//  Du Life v2 - Cliente Supabase Completo
//  lib/supabase.js
// ============================================================

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  { auth: { persistSession: false } }
);

// ============================================================
//  USUARIOS
// ============================================================

export async function obtenerOCrearUsuario(telefono, nombre) {
  const { data: existente } = await supabase
    .from('usuarios')
    .select('*')
    .eq('telefono', telefono)
    .limit(1)
    .maybeSingle();

  if (existente) {
    await supabase
      .from('usuarios')
      .update({ ultimo_acceso: new Date().toISOString() })
      .eq('id', existente.id);
    return existente;
  }

  const { data: nuevo, error } = await supabase
    .from('usuarios')
    .insert({
      telefono: telefono,
      nombre: nombre || 'Usuario',
      zona_horaria: process.env.TIMEZONE || 'America/Bogota',
      plan: 'free',
      activo: true,
      metadata: {}
    })
    .select()
    .single();

  if (error) {
    console.error('Error creando usuario:', error);
    return null;
  }
  return nuevo;
}

export async function actualizarUsuario(usuarioId, datos) {
  const { data, error } = await supabase
    .from('usuarios')
    .update(datos)
    .eq('id', usuarioId)
    .select()
    .single();
  if (error) console.error('Error actualizando usuario:', error);
  return data;
}

// ============================================================
//  MENSAJES
// ============================================================

export async function guardarMensaje(usuarioId, role, mensaje, extras = {}) {
  const { error } = await supabase
    .from('mensajes')
    .insert({
      usuario_id: usuarioId,
      role: role,
      mensaje: mensaje,
      tipo_mensaje: extras.tipo_mensaje || 'texto',
      intencion_detectada: extras.intencion || null,
      modelo_ai: extras.modelo || null,
      tokens_usados: extras.tokens || null,
      procesado: true,
      metadata: extras.metadata || {}
    });
  if (error) console.error('Error guardando mensaje:', error);
}

export async function obtenerHistorial(usuarioId, limite = 15) {
  const { data, error } = await supabase
    .from('mensajes')
    .select('role, mensaje')
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false })
    .limit(limite);
  if (error || !data) return [];
  return data.reverse().map(m => ({ role: m.role, content: m.mensaje }));
}

// ============================================================
//  ENTIDADES (personas, lugares, objetos, etc.)
// ============================================================

export async function crearOActualizarEntidad(usuarioId, datos) {
  // Buscar si existe por nombre y tipo
  const { data: existente } = await supabase
    .from('entidades')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('tipo_entidad', datos.tipo_entidad)
    .ilike('nombre', datos.nombre)
    .limit(1)
    .maybeSingle();

  if (existente) {
    // Actualizar mención
    const { data } = await supabase
      .from('entidades')
      .update({
        veces_mencionada: (existente.veces_mencionada || 0) + 1,
        ultima_mencion: new Date().toISOString(),
        importancia: datos.importancia || existente.importancia,
        atributos: { ...(existente.atributos || {}), ...(datos.atributos || {}) }
      })
      .eq('id', existente.id)
      .select()
      .single();
    return data;
  }

  // Crear nueva
  const { data, error } = await supabase
    .from('entidades')
    .insert({
      usuario_id: usuarioId,
      tipo_entidad: datos.tipo_entidad,
      nombre: datos.nombre,
      descripcion: datos.descripcion || null,
      atributos: datos.atributos || {},
      importancia: datos.importancia || 5,
      veces_mencionada: 1,
      ultima_mencion: new Date().toISOString(),
      activo: true
    })
    .select()
    .single();
  if (error) console.error('Error creando entidad:', error);
  return data;
}

export async function buscarEntidad(usuarioId, nombre, tipo = null) {
  let query = supabase
    .from('entidades')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('activo', true)
    .ilike('nombre', `%${nombre}%`)
    .limit(5);
  if (tipo) query = query.eq('tipo_entidad', tipo);
  const { data } = await query;
  return data || [];
}

export async function obtenerEntidadesPorTipo(usuarioId, tipo, limite = 20) {
  const { data } = await supabase
    .from('entidades')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('tipo_entidad', tipo)
    .eq('activo', true)
    .order('importancia', { ascending: false })
    .limit(limite);
  return data || [];
}

export async function obtenerEntidadesRelevantes(usuarioId, limite = 10) {
  const { data } = await supabase
    .from('entidades')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('activo', true)
    .order('importancia', { ascending: false })
    .order('veces_mencionada', { ascending: false })
    .limit(limite);
  return data || [];
}

// ============================================================
//  HECHOS
// ============================================================

export async function crearHecho(usuarioId, datos) {
  const { data, error } = await supabase
    .from('hechos')
    .insert({
      usuario_id: usuarioId,
      hecho: datos.hecho,
      categoria: datos.categoria || 'general',
      entidad_id: datos.entidad_id || null,
      confianza: datos.confianza || 0.8,
      fuente: datos.fuente || 'usuario_directo',
      verificado: datos.verificado || false,
      activo: true
    })
    .select()
    .single();
  if (error) console.error('Error creando hecho:', error);
  return data;
}

export async function obtenerHechosVigentes(usuarioId, limite = 15) {
  const { data } = await supabase
    .from('hechos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('activo', true)
    .is('vigente_hasta', null)
    .order('creado_en', { ascending: false })
    .limit(limite);
  return data || [];
}

// ============================================================
//  GASTOS / INGRESOS
// ============================================================

export async function registrarGasto(usuarioId, datos) {
  const { data, error } = await supabase
    .from('gastos')
    .insert({
      usuario_id: usuarioId,
      monto: datos.monto,
      moneda: datos.moneda || 'COP',
      descripcion: datos.descripcion || null,
      lugar: datos.lugar || null,
      metodo_pago: datos.metodo_pago || 'efectivo',
      fecha: datos.fecha || new Date().toISOString().split('T')[0],
      mensaje_original: datos.mensaje_original || null,
      metadata: datos.metadata || {}
    })
    .select()
    .single();
  if (error) console.error('Error registrando gasto:', error);
  return data;
}

export async function registrarIngreso(usuarioId, datos) {
  const { data, error } = await supabase
    .from('ingresos')
    .insert({
      usuario_id: usuarioId,
      monto: datos.monto,
      moneda: datos.moneda || 'COP',
      descripcion: datos.descripcion || null,
      fuente: datos.fuente || 'otro',
      fecha: datos.fecha || new Date().toISOString().split('T')[0]
    })
    .select()
    .single();
  if (error) console.error('Error registrando ingreso:', error);
  return data;
}

// Busca un ingreso reciente del usuario guardado con fuente provisional 'otro',
// para completar su fuente real con UPDATE en vez de crear un registro duplicado.
export async function obtenerIngresoPendiente(usuarioId) {
  const haceMinutos = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('ingresos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('fuente', 'otro')
    .is('eliminado_en', null)
    .gte('creado_en', haceMinutos)
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function actualizarIngreso(ingresoId, datos) {
  const { data, error } = await supabase
    .from('ingresos')
    .update({
      fuente: datos.fuente,
      descripcion: datos.descripcion || undefined,
      actualizado_en: new Date().toISOString()
    })
    .eq('id', ingresoId)
    .select()
    .single();
  if (error) console.error('Error actualizando ingreso:', error);
  return data;
}

export async function obtenerGastos(usuarioId, opciones = {}) {
  let query = supabase
    .from('gastos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .is('eliminado_en', null)
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })
    .limit(opciones.limite || 20);
  if (opciones.desde) query = query.gte('fecha', opciones.desde);
  const { data } = await query;
  return data || [];
}

export async function obtenerResumenMes(usuarioId) {
  const ahora = new Date();
  const desde = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`;
  
  const { data: gastos } = await supabase
    .from('gastos').select('monto')
    .eq('usuario_id', usuarioId).is('eliminado_en', null).gte('fecha', desde);
  
  const { data: ingresos } = await supabase
    .from('ingresos').select('monto')
    .eq('usuario_id', usuarioId).is('eliminado_en', null).gte('fecha', desde);
  
  const totalGastos = (gastos || []).reduce((s, g) => s + Number(g.monto), 0);
  const totalIngresos = (ingresos || []).reduce((s, i) => s + Number(i.monto), 0);
  
  return {
    mes: ahora.toLocaleString('es-CO', { month: 'long', year: 'numeric' }),
    total_gastos: totalGastos,
    total_ingresos: totalIngresos,
    balance: totalIngresos - totalGastos
  };
}

// ============================================================
//  NOTAS / TAREAS / IDEAS
// ============================================================

export async function crearNota(usuarioId, datos) {
  const { data, error } = await supabase
    .from('notas')
    .insert({
      usuario_id: usuarioId,
      titulo: datos.titulo,
      contenido: datos.contenido,
      mensaje_original: datos.mensaje_original
    })
    .select()
    .single();
  if (error) console.error('Error nota:', error);
  return data;
}

const PRIORIDADES_VALIDAS = ['baja', 'media', 'alta', 'urgente'];

export async function crearTarea(usuarioId, datos) {
  const insertData = {
    usuario_id: usuarioId,
    titulo: datos.titulo,
    // Siempre explícito: el DEFAULT de la columna en la base de datos no es
    // un valor válido del enum, así que nunca podemos dejar que se aplique.
    prioridad: PRIORIDADES_VALIDAS.includes(datos.prioridad) ? datos.prioridad : 'media',
  };

  if (datos.descripcion) insertData.descripcion = datos.descripcion;
  if (datos.fecha_vencimiento) insertData.fecha_vencimiento = datos.fecha_vencimiento;
  if (datos.hora_vencimiento) insertData.hora_vencimiento = datos.hora_vencimiento;
  if (datos.notificar_antes_minutos != null) insertData.notificar_antes_minutos = datos.notificar_antes_minutos;
  if (datos.mensaje_original) insertData.mensaje_original = datos.mensaje_original;

  const { data, error } = await supabase
    .from('tareas')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[crearTarea] Error:', error.message, error.details, error.hint);
    return null;
  }
  return data;
}

export async function completarTarea(tareaId) {
  const { data, error } = await supabase
    .from('tareas')
    .update({
      completada_en: new Date().toISOString(),
      estado: 'completada',
      actualizado_en: new Date().toISOString()
    })
    .eq('id', tareaId)
    .select()
    .single();
  if (error) console.error('Error completando tarea:', error);
  return data;
}

// Última tarea a la que se le envió un recordatorio de WhatsApp (recordatorio_du)
// y que sigue sin marcarse como completada — usada para detectar si un "Listo"
// entrante es la confirmación de ese recordatorio.
export async function obtenerTareaConRecordatorioPendiente(usuarioId) {
  const haceHoras = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('tareas')
    .select('*')
    .eq('usuario_id', usuarioId)
    .is('eliminado_en', null)
    .is('completada_en', null)
    .not('recordatorio_enviado_en', 'is', null)
    .gte('recordatorio_enviado_en', haceHoras)
    .order('recordatorio_enviado_en', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function crearIdea(usuarioId, datos) {
  const { data, error } = await supabase
    .from('ideas')
    .insert({
      usuario_id: usuarioId,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      categoria: datos.categoria
    })
    .select()
    .single();
  if (error) console.error('Error idea:', error);
  return data;
}

// ============================================================
//  CALENDARIO
// ============================================================

const CATEGORIAS_EVENTO_VALIDAS = ['trabajo', 'estudio', 'personal', 'salud'];

export async function obtenerChoqueCalendario(usuarioId, fecha, horaInicio, horaFin) {
  const { data } = await supabase
    .from('calendario_eventos')
    .select('titulo, hora_inicio, hora_fin')
    .eq('usuario_id', usuarioId)
    .eq('fecha', fecha)
    .lt('hora_inicio', horaFin)
    .gt('hora_fin', horaInicio)
    .limit(1);
  return data || [];
}

export async function crearEventoCalendario(usuarioId, datos) {
  const { data, error } = await supabase
    .from('calendario_eventos')
    .insert({
      usuario_id: usuarioId,
      titulo: datos.titulo,
      fecha: datos.fecha,
      hora_inicio: datos.hora_inicio,
      hora_fin: datos.hora_fin,
      categoria: CATEGORIAS_EVENTO_VALIDAS.includes(datos.categoria) ? datos.categoria : 'personal',
      origen: datos.origen || 'chat_directo',
      break_inicio: datos.break_inicio || null,
      break_fin: datos.break_fin || null,
      notas: datos.notas || null,
    })
    .select()
    .single();
  if (error) console.error('Error creando evento calendario:', error);
  return data;
}

export async function obtenerEventosCalendario(usuarioId, fechaDesde, fechaHasta) {
  const { data, error } = await supabase
    .from('calendario_eventos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .gte('fecha', fechaDesde)
    .lte('fecha', fechaHasta || fechaDesde)
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true });
  if (error) console.error('Error consultando calendario:', error);
  return data || [];
}

// ============================================================
//  PRÉSTAMOS
// ============================================================

export async function crearPrestamo(usuarioId, datos) {
  const capital = Number(datos.capital);
  const valorCuota = Number(datos.valor_cuota);
  const cantidadCuotas = Number(datos.cantidad_cuotas);
  // total_esperado/ganancia_esperada/rentabilidad son NOT NULL en la tabla:
  // siempre se calculan acá, nunca se dejan que el DEFAULT (inexistente) actúe.
  const totalEsperado = valorCuota * cantidadCuotas;
  const gananciaEsperada = totalEsperado - capital;
  const rentabilidad = capital > 0 ? (gananciaEsperada / capital) * 100 : 0;

  const { data, error } = await supabase
    .from('prestamos')
    .insert({
      usuario_id: usuarioId,
      nombre_deudor: datos.nombre_deudor,
      capital,
      valor_cuota: valorCuota,
      cantidad_cuotas: cantidadCuotas,
      dia_pago: datos.dia_pago,
      total_esperado: totalEsperado,
      ganancia_esperada: gananciaEsperada,
      rentabilidad,
    })
    .select()
    .single();
  if (error) console.error('Error creando préstamo:', error);
  return data;
}

export async function obtenerPrestamos(usuarioId) {
  const { data, error } = await supabase
    .from('prestamos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false });
  if (error) console.error('Error obteniendo préstamos:', error);
  return data || [];
}

export async function obtenerPrestamo(prestamoId) {
  const { data, error } = await supabase
    .from('prestamos')
    .select('*')
    .eq('id', prestamoId)
    .single();
  if (error) console.error('Error obteniendo préstamo:', error);
  return data;
}

// Búsqueda flexible por nombre para cuando el usuario menciona al deudor
// en lenguaje natural ("Jhan Carlos me pagó"), sin id exacto.
export async function obtenerPrestamosActivosPorDeudor(usuarioId, nombreDeudor) {
  const { data, error } = await supabase
    .from('prestamos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('estado', 'activo')
    .ilike('nombre_deudor', `%${nombreDeudor}%`)
    .order('created_at', { ascending: false });
  if (error) console.error('Error buscando préstamo por deudor:', error);
  return data || [];
}

export async function actualizarPrestamo(prestamoId, datos) {
  const { data, error } = await supabase
    .from('prestamos')
    .update(datos)
    .eq('id', prestamoId)
    .select()
    .single();
  if (error) console.error('Error actualizando préstamo:', error);
  return data;
}

export async function crearMovimientoPrestamo(usuarioId, datos) {
  const { data, error } = await supabase
    .from('prestamos_movimientos')
    .insert({
      prestamo_id: datos.prestamo_id,
      usuario_id: usuarioId,
      tipo: datos.tipo,
      monto: datos.monto,
      cuotas_completadas: datos.cuotas_completadas || 0,
      notas: datos.notas || null,
    })
    .select()
    .single();
  if (error) console.error('Error creando movimiento préstamo:', error);
  return data;
}

export async function obtenerMovimientosPrestamo(prestamoId) {
  const { data, error } = await supabase
    .from('prestamos_movimientos')
    .select('*')
    .eq('prestamo_id', prestamoId)
    .order('created_at', { ascending: false });
  if (error) console.error('Error obteniendo movimientos préstamo:', error);
  return data || [];
}

// ============================================================
//  CONTEXTO COMPLETO DEL USUARIO
// ============================================================

export async function cargarContextoUsuario(usuarioId) {
  const [entidades, hechos] = await Promise.all([
    obtenerEntidadesRelevantes(usuarioId, 10),
    obtenerHechosVigentes(usuarioId, 10)
  ]);
  
  return {
    entidades_relevantes: entidades,
    hechos_vigentes: hechos
  };
}

// ============================================================
//  BORRAR DATOS DEL USUARIO (por categoría, sin tocar la cuenta)
//  Usado desde la app web y desde WhatsApp ("borra mis datos").
//  Nunca borra la cuenta, el historial de chat, el registro de
//  onboarding ni las suscripciones push — solo lo que el usuario
//  fue generando al usar Du Life.
// ============================================================

export const CATEGORIAS_BORRADO = {
  financiero: { nombre: 'Registros financieros', tablas: ['prestamos_movimientos', 'prestamos', 'gastos', 'ingresos'] },
  notas_ideas: { nombre: 'Notas e ideas', tablas: ['notas', 'ideas'] },
  tareas: { nombre: 'Tareas y recordatorios', tablas: ['tareas'] },
  calendario: { nombre: 'Calendario', tablas: ['calendario_eventos'] },
  memoria: { nombre: 'Personas y memoria', tablas: ['relaciones', 'hechos', 'entidades'] },
  arbol_emociones: { nombre: 'Árbol y emociones', tablas: ['arbol_vida', 'emociones'] },
  documentos: { nombre: 'Documentos y archivos', tablas: ['documentos', 'archivos_multimedia'] },
};

// "patrones" es data derivada (el motor de patrones la genera sola a partir
// del resto), no algo que el usuario "ingresó" — se limpia solo cuando se
// borra TODO, nunca como categoría propia.
export async function borrarDatosUsuario(usuarioId, categorias) {
  const esTodo = categorias.includes('todo');
  const tablas = esTodo
    ? [...new Set(Object.values(CATEGORIAS_BORRADO).flatMap((c) => c.tablas)), 'patrones']
    : [...new Set(categorias.flatMap((k) => CATEGORIAS_BORRADO[k]?.tablas || []))];

  for (const tabla of tablas) {
    const { error } = await supabase.from(tabla).delete().eq('usuario_id', usuarioId);
    if (error) console.error(`Error borrando ${tabla} para usuario ${usuarioId}:`, error.message);
  }
  return tablas;
}

// ============================================================
//  NEGOCIO (Ventas) — módulo opcional, activado por el usuario
//  Fase 1: registrar venta por lenguaje natural + clientes automáticos.
// ============================================================

export async function actualizarModoNegocioDB(usuarioId, activo) {
  const { data, error } = await supabase
    .from('usuarios')
    .update({ modo_negocio: !!activo })
    .eq('id', usuarioId)
    .select()
    .single();
  if (error) console.error('Error actualizando modo negocio:', error);
  return data;
}

// Búsqueda exacta (sin %comodines%) para no fusionar clientes distintos por
// coincidencia parcial — si no existe, se crea uno nuevo.
export async function resolverOCrearCliente(usuarioId, nombre) {
  const nombreLimpio = String(nombre).trim();
  if (!nombreLimpio) return null;

  const { data: existente } = await supabase
    .from('clientes_negocio')
    .select('*')
    .eq('usuario_id', usuarioId)
    .ilike('nombre', nombreLimpio)
    .maybeSingle();
  if (existente) return existente;

  const { data, error } = await supabase
    .from('clientes_negocio')
    .insert({ usuario_id: usuarioId, nombre: nombreLimpio })
    .select()
    .single();
  if (error) console.error('Error creando cliente:', error);
  return data;
}

export async function crearVenta(usuarioId, datos) {
  const { data, error } = await supabase
    .from('ventas')
    .insert({
      usuario_id: usuarioId,
      cliente_id: datos.cliente_id || null,
      producto: datos.producto,
      cantidad: datos.cantidad || 1,
      precio_unitario: datos.precio_unitario || null,
      valor_total: datos.valor_total,
      metodo_pago: datos.metodo_pago || null,
      fecha: datos.fecha || new Date().toISOString().split('T')[0],
      mensaje_original: datos.mensaje_original || null,
    })
    .select()
    .single();
  if (error) console.error('Error creando venta:', error);
  return data;
}

export async function obtenerVentas(usuarioId, opciones = {}) {
  let query = supabase
    .from('ventas')
    .select('*, clientes_negocio(nombre)')
    .eq('usuario_id', usuarioId)
    .is('eliminado_en', null)
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })
    .limit(opciones.limite || 100);
  if (opciones.desde) query = query.gte('fecha', opciones.desde);
  const { data } = await query;
  return data || [];
}

export async function obtenerClientesNegocio(usuarioId) {
  const { data } = await supabase
    .from('clientes_negocio')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false });
  return data || [];
}