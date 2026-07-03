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
  obtenerResumenMes,
  obtenerGastos,
  obtenerEntidadesPorTipo,
  cargarContextoUsuario,
  crearNota,
  crearTarea,
  crearIdea
} from './supabase.js';

import { procesarConClaude } from './claude.js';
import { procesarMemoria } from './memoryEngine.js';
import { procesarOnboarding } from './onboarding.js';
import { priorizarParaContexto } from './priorityEngine.js';
import { procesarEmocionMensaje } from './emocionalEngine.js';
import { agregarAlArbolAuto, formatearArbolWhatsApp } from './arbolVida.js';
import { enviarNotificacionPush } from './push.js';
import { programarRecordatorio } from './qstash.js';

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

    // 4. Contexto + historial en paralelo
    const [historial, contexto] = await Promise.all([
      obtenerHistorial(usuario.id, 15),
      cargarContextoUsuario(usuario.id)
    ]);
    contexto.usuario = usuario;
    
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
        respuestaFinal = await ejecutarTarea(usuario.id, datos, respuesta);
        break;
      case 'idea':
        respuestaFinal = await ejecutarIdea(usuario.id, datos, respuesta);
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
  const r = await registrarIngreso(usuarioId, {
    monto: datos.monto,
    descripcion: datos.descripcion,
    fuente: datos.fuente || 'otro'
  });

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

    // Programar recordatorio si hay fecha + hora
    if (datos.fecha_vencimiento && datos.hora_vencimiento && r.id) {
      const fechaHora = new Date(`${datos.fecha_vencimiento}T${datos.hora_vencimiento}`);
      const minutosAntes = datos.notificar_antes_minutos || 0;
      const notBefore = new Date(fechaHora.getTime() - minutosAntes * 60 * 1000);

      const appUrl = process.env.APP_URL || 'https://du-life-api.vercel.app';
      programarRecordatorio({
        destination: `${appUrl}/api/cron/recordatorios`,
        body: { tarea_id: r.id },
        notBefore,
      }).catch(() => {});
    }
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

function ejecutarSaludo(usuario) {
  const hora = new Date().getHours();
  let saludo;
  if (hora < 12) saludo = 'Buenos días';
  else if (hora < 18) saludo = 'Buenas tardes';
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