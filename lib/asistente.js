// ============================================================
//  Du Life v3 - Asistente Principal
//  lib/asistente.js
//  Con todos los motores integrados
// ============================================================

import {
  obtenerOCrearUsuario,
  guardarMensaje,
  obtenerHistorial,
  registrarGasto,
  registrarIngreso,
  obtenerIngresoPendiente,
  actualizarIngreso,
  obtenerResumenMes,
  obtenerGastos,
  obtenerEntidadesPorTipo,
  cargarContextoUsuario,
  crearNota,
  crearTarea,
  crearIdea,
  obtenerChoqueCalendario,
  crearEventoCalendario,
  obtenerEventosCalendario
} from './supabase.js';

import { procesarConClaude } from './claude.js';
import { procesarMemoria } from './memoryEngine.js';
import { procesarOnboarding } from './onboarding.js';
import { priorizarParaContexto } from './priorityEngine.js';
import { procesarEmocionMensaje } from './emocionalEngine.js';
import { agregarAlArbolAuto, formatearArbolWhatsApp } from './arbolVida.js';
import { enviarNotificacionPush } from './push.js';
import { programarJob } from './qstash.js';
import { buscarEnMemoria } from './embeddings.js';

// ─────────────────────────────────────────
// PROCESADOR PRINCIPAL
// ─────────────────────────────────────────

export async function procesarMensaje(telefono, nombreContacto, mensajeTexto) {
  try {
    // 1. Usuario
    const usuario = await obtenerOCrearUsuario(telefono, nombreContacto);
    if (!usuario) return 'Disculpa, hubo un error. Intenta de nuevo.';

    // 2. ONBOARDING si aplica
    if (!usuario.onboarding_completo) {
      const r = await procesarOnboarding(telefono, mensajeTexto, nombreContacto);
      await guardarMensaje(usuario.id, 'user', mensajeTexto);
      if (r) await guardarMensaje(usuario.id, 'assistant', r, { intencion: 'onboarding' });
      return r;
    }

    // 3. Guardar mensaje
    await guardarMensaje(usuario.id, 'user', mensajeTexto, { tipo_mensaje: 'texto' });

    // 4. Contexto + historial + memoria semántica en paralelo
    const [historial, contexto, recuerdosSemanticos] = await Promise.all([
      obtenerHistorial(usuario.id, 15),
      cargarContextoUsuario(usuario.id),
      buscarEnMemoria(usuario.id, mensajeTexto, 5).catch((e) => {
        console.error('Error búsqueda semántica:', e.message);
        return [];
      })
    ]);
    contexto.usuario = usuario;
    contexto.recuerdos_semanticos = recuerdosSemanticos;

    // 5. PRIORIZAR entidades del contexto
    if (contexto.entidades_relevantes && contexto.entidades_relevantes.length > 0) {
      contexto.entidades_relevantes = priorizarParaContexto(contexto.entidades_relevantes, 10);
    }

    // 6. Procesar con Claude
    const claude = await procesarConClaude(mensajeTexto, historial, contexto);
    const { intencion, datos, memoria, respuesta } = claude;

    console.log(`👤 ${usuario.como_llamar || usuario.nombre} | Intención: ${intencion}`);

    // 7. PROCESAR EN PARALELO (no esperar):
    //    - Memoria + agregar al árbol
    //    - Emociones
    if (memoria) {
      procesarMemoria(usuario.id, memoria)
        .then(async (resultado) => {
          // Agregar entidades nuevas al árbol
          if (resultado && resultado.entidades_creadas) {
            for (const e of resultado.entidades_creadas) {
              if (e && e.id) await agregarAlArbolAuto(usuario.id, e);
            }
          }
        })
        .catch(e => console.error('Error memoria:', e.message));
    }
    
    // Emociones (background)
    procesarEmocionMensaje(usuario.id, mensajeTexto, [])
      .catch(e => console.error('Error emocion:', e.message));

    // 8. EJECUTAR ACCIÓN
    let respuestaFinal = respuesta;

    switch (intencion) {
      case 'gasto':
        respuestaFinal = await ejecutarGasto(usuario.id, datos, respuesta);
        break;
      case 'ingreso':
        respuestaFinal = await ejecutarIngreso(usuario.id, datos, respuesta);
        break;
      case 'nota':
        respuestaFinal = await ejecutarNota(usuario.id, datos, respuesta, mensajeTexto);
        break;
     case 'tarea':
      case 'recordatorio':
        respuestaFinal = await ejecutarTarea(usuario.id, datos, respuesta);
        break;
      case 'idea':
        respuestaFinal = await ejecutarIdea(usuario.id, datos, respuesta);
        break;
      case 'crear_evento':
        respuestaFinal = await ejecutarCrearEvento(usuario, datos, respuesta);
        break;
      case 'consulta_agenda':
        respuestaFinal = await consultarAgenda(usuario.id, datos);
        break;
      case 'consulta_gastos':
        respuestaFinal = await consultarGastos(usuario.id, datos);
        break;
      case 'consulta_resumen':
        respuestaFinal = await consultarResumen(usuario.id);
        break;
      case 'consulta_personas':
        respuestaFinal = await consultarPersonas(usuario.id);
        break;
      case 'consulta_arbol':
        respuestaFinal = await formatearArbolWhatsApp(usuario.id);
        break;
      case 'saludo':
        respuestaFinal = ejecutarSaludo(usuario);
        break;
      default:
        respuestaFinal = respuesta;
        break;
    }

    // 9. Guardar respuesta
    await guardarMensaje(usuario.id, 'assistant', respuestaFinal, {
      intencion: intencion,
      modelo: process.env.CLAUDE_MODEL,
      tokens: claude.tokens_usados
    });

    return respuestaFinal;

  } catch (e) {
    console.error('❌ Error procesarMensaje:', e.message);
    console.error('Stack:', e.stack);
    return 'Tuve un problema interno 😅 Intenta de nuevo.';
  }
}

// ─────────────────────────────────────────
// EJECUTORES
// ─────────────────────────────────────────

async function ejecutarGasto(usuarioId, datos, respuestaClaude) {
  if (!datos.monto || datos.monto <= 0) return 'No entendí el monto.';
  const r = await registrarGasto(usuarioId, {
    monto: datos.monto,
    descripcion: datos.descripcion,
    lugar: datos.lugar,
    metodo_pago: datos.metodo_pago || 'efectivo',
    fecha: datos.fecha || new Date().toISOString().split('T')[0]
  });

  if (r) {
    enviarNotificacionPush(usuarioId, {
      titulo: 'Gasto registrado',
      mensaje: `${datos.descripcion || 'Gasto'} · $${Number(datos.monto).toLocaleString('es-CO')}`,
      url: '/dashboard/gastos',
      tipo: 'gasto',
    }).catch(() => {});
  }

  return r ? respuestaClaude : 'No pude guardar el gasto.';
}

async function ejecutarIngreso(usuarioId, datos, respuestaClaude) {
  if (!datos.monto || datos.monto <= 0) return 'No entendí el monto.';

  // Si el mensaje trae una fuente concreta (no "otro"), puede ser la respuesta
  // a la pregunta "¿de dónde viene?" de un ingreso ya guardado hace poco con
  // fuente provisional. En ese caso actualizamos ese registro en vez de
  // insertar uno nuevo, para no duplicar el mismo ingreso.
  let r;
  const fuenteEsConcreta = datos.fuente && datos.fuente !== 'otro';
  const pendiente = fuenteEsConcreta ? await obtenerIngresoPendiente(usuarioId) : null;

  if (pendiente) {
    r = await actualizarIngreso(pendiente.id, {
      fuente: datos.fuente,
      descripcion: datos.descripcion || pendiente.descripcion
    });
  } else {
    r = await registrarIngreso(usuarioId, {
      monto: datos.monto,
      descripcion: datos.descripcion,
      fuente: datos.fuente || 'otro'
    });
  }

  if (r) {
    enviarNotificacionPush(usuarioId, {
      titulo: 'Ingreso registrado',
      mensaje: `${datos.descripcion || 'Ingreso'} · +$${Number(datos.monto).toLocaleString('es-CO')}`,
      url: '/dashboard/gastos',
      tipo: 'ingreso',
    }).catch(() => {});
  }

  return r ? respuestaClaude : 'No pude guardar el ingreso.';
}

async function ejecutarNota(usuarioId, datos, respuestaClaude, mensajeOriginal) {
  if (!datos.contenido && !datos.titulo) return '¿Qué quieres que guarde?';
  const r = await crearNota(usuarioId, {
    titulo: datos.titulo || null,
    contenido: datos.contenido || datos.titulo,
    mensaje_original: mensajeOriginal
  });

  if (r) {
    enviarNotificacionPush(usuarioId, {
      titulo: 'Nota guardada',
      mensaje: datos.titulo || (datos.contenido || '').slice(0, 60),
      url: '/dashboard/notas',
      tipo: 'nota',
    }).catch(() => {});
  }

  return r ? respuestaClaude : 'No pude guardar la nota.';
}

async function ejecutarTarea(usuarioId, datos, respuestaClaude) {
  if (!datos.titulo) return '¿Qué tarea quieres agregar?';
  const r = await crearTarea(usuarioId, {
    titulo: datos.titulo,
    prioridad: datos.prioridad || 'media',
    fecha_vencimiento: datos.fecha_vencimiento || null,
    hora_vencimiento: datos.hora_vencimiento || null,
  });

  if (r) {
    // Push inmediato de confirmación
    enviarNotificacionPush(usuarioId, {
      titulo: 'Tarea creada',
      mensaje: datos.titulo,
      url: '/dashboard/tareas',
      tipo: 'tarea',
    }).catch(() => {});
  }

  return r ? respuestaClaude : 'No pude crear la tarea.';
}

async function ejecutarIdea(usuarioId, datos, respuestaClaude) {
  if (!datos.descripcion) return '¿Cuál es la idea?';
  const r = await crearIdea(usuarioId, {
    titulo: datos.titulo || null,
    descripcion: datos.descripcion,
    categoria: datos.categoria
  });

  if (r) {
    enviarNotificacionPush(usuarioId, {
      titulo: 'Idea guardada',
      mensaje: datos.titulo || (datos.descripcion || '').slice(0, 60),
      url: '/dashboard/ideas',
      tipo: 'idea',
    }).catch(() => {});
  }

  return r ? respuestaClaude : 'No pude guardar la idea.';
}

async function ejecutarCrearEvento(usuario, datos, respuestaClaude) {
  if (!datos.titulo || !datos.fecha || !datos.hora_inicio || !datos.hora_fin) {
    return '¿Me confirmas título, fecha y el horario (inicio y fin) del evento?';
  }

  const choque = await obtenerChoqueCalendario(usuario.id, datos.fecha, datos.hora_inicio, datos.hora_fin);
  if (choque.length > 0) {
    const ev = choque[0];
    return `Ya tienes "${ev.titulo}" de ${ev.hora_inicio.slice(0, 5)} a ${ev.hora_fin.slice(0, 5)} ese día. ¿Igual lo agendo?`;
  }

  const r = await crearEventoCalendario(usuario.id, {
    titulo: datos.titulo,
    fecha: datos.fecha,
    hora_inicio: datos.hora_inicio,
    hora_fin: datos.hora_fin,
    categoria: datos.categoria,
  });

  if (r) {
    // Colombia es UTC-5 fijo: construir el instante directamente con el
    // offset explícito evita conversiones manuales propensas a error.
    const recordatorioISO = new Date(
      new Date(`${datos.fecha}T${datos.hora_inicio}:00-05:00`).getTime() - 5 * 60 * 1000
    ).toISOString();

    if (new Date(recordatorioISO) > new Date()) {
      await programarJob('recordatorio-calendario', {
        telefono: usuario.telefono,
        nombre: usuario.como_llamar || usuario.nombre,
        evento: `${datos.titulo} a las ${datos.hora_inicio}`,
        evento_id: r.id,
      }, recordatorioISO);
    }

    enviarNotificacionPush(usuario.id, {
      titulo: 'Evento agendado',
      mensaje: `${datos.titulo} · ${datos.fecha} ${datos.hora_inicio}`,
      url: '/dashboard/espacios/calendario',
      tipo: 'evento',
    }).catch(() => {});
  }

  return r ? respuestaClaude : 'No pude agendar el evento.';
}

function ejecutarSaludo(usuario) {
  const zonaHoraria = usuario.zona_horaria || 'America/Bogota';
  const hora = parseInt(
    new Date().toLocaleString('en-US', { timeZone: zonaHoraria, hour: 'numeric', hour12: false }),
    10
  );
  let saludo;
  if (hora >= 5 && hora < 12) saludo = 'Buenos días';
  else if (hora >= 12 && hora < 18) saludo = 'Buenas tardes';
  else saludo = 'Buenas noches';
  const c = usuario.como_llamar || usuario.nombre?.split(' ')[0] || 'amigo';
  return `${saludo} ${c} 👋\n\n¿En qué te ayudo?`;
}

// ─────────────────────────────────────────
// CONSULTAS
// ─────────────────────────────────────────

async function consultarGastos(usuarioId, datos) {
  const periodo = (datos && datos.periodo) || 'mes';
  let desde = null;
  const ahora = new Date();
  
  if (periodo === 'hoy') desde = new Date().toISOString().split('T')[0];
  else if (periodo === 'semana') {
    const s = new Date(ahora); s.setDate(ahora.getDate() - 7);
    desde = s.toISOString().split('T')[0];
  } else {
    desde = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`;
  }
  
  const gastos = await obtenerGastos(usuarioId, { desde, limite: 10 });
  if (!gastos || gastos.length === 0) return `No hay gastos ${periodo === 'hoy' ? 'hoy' : 'este ' + periodo}.`;
  
  const total = gastos.reduce((s, g) => s + Number(g.monto), 0);
  let texto = `💸 *Gastos* (${gastos.length})\n\n`;
  gastos.forEach(g => {
    texto += `• ${g.descripcion || 'Sin desc'}: $${Number(g.monto).toLocaleString('es-CO')}\n`;
  });
  texto += `\n*Total: $${total.toLocaleString('es-CO')}*`;
  return texto;
}

async function consultarResumen(usuarioId) {
  const r = await obtenerResumenMes(usuarioId);
  const signo = r.balance >= 0 ? '+' : '';
  const emoji = r.balance >= 0 ? '✅' : '⚠️';
  return `📊 *Resumen ${r.mes}*\n\n` +
         `💸 Gastos: $${Number(r.total_gastos).toLocaleString('es-CO')}\n` +
         `💰 Ingresos: $${Number(r.total_ingresos).toLocaleString('es-CO')}\n` +
         `${emoji} Balance: ${signo}$${Number(r.balance).toLocaleString('es-CO')}`;
}

async function consultarPersonas(usuarioId) {
  const personas = await obtenerEntidadesPorTipo(usuarioId, 'persona', 20);
  if (!personas || personas.length === 0) return '👥 Aún no me has hablado de personas importantes.';

  let texto = `👥 *Personas que conozco*\n\n`;
  personas.forEach(p => {
    const d = p.descripcion ? ` — ${p.descripcion}` : '';
    texto += `• ${p.nombre}${d}\n`;
  });
  return texto.trim();
}

function formatHora12(horaStr) {
  if (!horaStr) return '';
  const [hStr, m] = horaStr.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// Colombia es UTC-5 fijo (sin horario de verano). Vercel corre en UTC, así
// que "new Date()" solo no basta — mismo tipo de error que tuvimos con los
// saludos: hay que restar 5h para obtener la fecha local real del usuario.
function hoyColombiaISO() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function diffDiasDesdeHoy(fechaStr) {
  const hoy = new Date(hoyColombiaISO() + 'T12:00:00');
  hoy.setHours(0, 0, 0, 0);
  const d = new Date(fechaStr + 'T12:00:00');
  d.setHours(0, 0, 0, 0);
  return Math.round((d - hoy) / 86400000);
}

function formatFechaAgendaTitulo(fechaStr) {
  const largo = new Date(fechaStr + 'T12:00:00')
    .toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const diffDias = diffDiasDesdeHoy(fechaStr);
  if (diffDias === 0) return `Hoy ${largo}`;
  if (diffDias === 1) return `Mañana ${largo}`;
  if (diffDias === -1) return `Ayer ${largo}`;
  return largo.charAt(0).toUpperCase() + largo.slice(1);
}

async function consultarAgenda(usuarioId, datos) {
  const hoy = hoyColombiaISO();
  const desde = datos?.fecha_desde || hoy;
  const hasta = datos?.fecha_hasta || desde;

  const eventos = await obtenerEventosCalendario(usuarioId, desde, hasta);
  if (!eventos.length) {
    const diffDias = diffDiasDesdeHoy(desde);
    const etiqueta = diffDias === 0 ? 'Hoy' : diffDias === 1 ? 'Mañana' : diffDias === -1 ? 'Ayer' : 'Ese día';
    return `${etiqueta} no tienes nada agendado. ¿Quieres agendar algo?`;
  }

  const porFecha = {};
  for (const ev of eventos) {
    (porFecha[ev.fecha] ||= []).push(ev);
  }

  let texto = '';
  for (const fecha of Object.keys(porFecha).sort()) {
    texto += `📅 ${formatFechaAgendaTitulo(fecha)} tienes:\n`;
    for (const ev of porFecha[fecha]) {
      texto += `🕐 ${ev.titulo} de ${formatHora12(ev.hora_inicio)} a ${formatHora12(ev.hora_fin)}\n`;
      if (ev.break_inicio && ev.break_fin) {
        texto += `☕ Break de ${formatHora12(ev.break_inicio)} a ${formatHora12(ev.break_fin)}\n`;
      }
    }
    texto += '\n';
  }
  return texto.trim();
}