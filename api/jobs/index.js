// ============================================================
//  Du Life - Dispatcher consolidado de Jobs (QStash)
//  api/jobs/index.js
//  El plan Hobby de Vercel permite máximo 12 Serverless Functions
//  por deployment. Antes cada job (recordatorio-tarea, reflexion-nocturna,
//  chequeo-semana, resumen-semanal, reactivacion, procesar-webhook)
//  era su propio archivo/función; se consolidan todos acá bajo un
//  único endpoint que despacha por el campo "tipo" del body.
// ============================================================

import { esLlamadaQStash, programarJob } from '../../lib/qstash.js';
import {
  enviarMensaje, marcarLeido, enviarPlantilla, enviarPlantillaConBotones,
  enviarListaWhatsApp,
} from '../../lib/whatsapp.js';
import { procesarMensaje } from '../../lib/asistente.js';
import { esperarPushesPendientes } from '../../lib/push.js';
import { procesarImagen, procesarAudio, procesarDocumento } from '../../lib/multimedia.js';
import {
  obtenerPreguntaPendiente, marcarPreguntado, guardarRespuestaPerfil,
  detectarDatosPasivos, detectarRecordatorio,
} from '../../lib/perfilamiento.js';
import {
  supabase, obtenerOCrearUsuario, crearTarea,
  obtenerTareaConRecordatorioPendiente, completarTarea,
  registrarIngreso, obtenerPrestamo, actualizarUsuario,
} from '../../lib/supabase.js';
import {
  confirmarCreacionPrestamo, reiniciarCreacionPrestamo, cancelarCreacionPrestamo,
  obtenerDecisionPendiente, limpiarDecisionPendiente, guardarDecisionPendiente,
  resolverPrestamoParaPago, aplicarPagoYFormatear,
} from '../../lib/prestamosEngine.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const MODULOS_REACTIVACION = [
  { tabla: 'gastos', texto: 'gastos' },
  { tabla: 'tareas', texto: 'tareas' },
  { tabla: 'entidades', texto: 'personas' },
  { tabla: 'notas', texto: 'notas' },
  { tabla: 'ideas', texto: 'ideas' },
];

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    if (!esLlamadaQStash(req)) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { tipo } = body;
    console.log(`🔔 Job recibido: ${tipo}`);

    switch (tipo) {
      case 'procesar-webhook':
        return await jobProcesarWebhook(body, res);
      case 'recordatorio-tarea':
        return await jobRecordatorioTarea(body, res);
      case 'reflexion-nocturna':
        return await jobReflexionNocturna(body, res);
      case 'recordatorio-onboarding':
        return await jobRecordatorioOnboarding(body, res);
      case 'chequeo-semana':
        return await jobChequeoSemana(body, res);
      case 'resumen-semanal':
        return await jobResumenSemanal(body, res);
      case 'reactivacion':
        return await jobReactivacion(body, res);
      case 'recordatorio-calendario':
        return await jobRecordatorioCalendario(body, res);
      case 'revisar-calendario':
        return await jobRevisarCalendario(body, res);
      default:
        console.error('❌ Tipo de job desconocido:', tipo);
        return res.status(400).json({ error: `Tipo desconocido: ${tipo}` });
    }
  } catch (err) {
    console.error('❌ Error en jobs/index:', err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────
// PROCESAR MENSAJE ENTRANTE DE WHATSAPP
// ─────────────────────────────────────────

async function jobProcesarWebhook(body, res) {
  const { telefono, nombre, messageId, mensaje } = body;

  if (!telefono || !mensaje) {
    console.error('❌ procesar-webhook: faltan datos en el body');
    return res.status(400).json({ error: 'Faltan datos' });
  }

  // Marcar leído (no bloquea)
  if (messageId) marcarLeido(messageId).catch(() => {});

  let respuesta = null;

  if (mensaje.type === 'text') {
    const textoMensaje = mensaje.text.body;
    console.log(`📱 ${telefono} (${nombre}): "${textoMensaje}"`);

    // ¿Es la confirmación de un recordatorio ("Listo", "ya", "hecho")?
    // Si el usuario tiene una tarea con recordatorio enviado hace poco y
    // sin completar, se cierra esa tarea en vez de mandarlo por el
    // pipeline normal de Claude (que reenviaría la plantilla completa).
    const esConfirmacionRecordatorio = /^(listo|ya|ya está|ya esta|hecho|dale|list0)[\s!.]*$/i.test(textoMensaje.trim());
    let recordatorioConfirmado = false;

    if (esConfirmacionRecordatorio) {
      const usuarioActual = await obtenerOCrearUsuario(telefono, nombre);
      const tareaPendiente = usuarioActual
        ? await obtenerTareaConRecordatorioPendiente(usuarioActual.id)
        : null;

      if (tareaPendiente) {
        await completarTarea(tareaPendiente.id);
        respuesta = '¡Perfecto! Me alegra haberte recordado. 😊';
        recordatorioConfirmado = true;
      }
    }

    if (!recordatorioConfirmado) {
      respuesta = await procesarMensaje(telefono, nombre, textoMensaje);
    }

    // Perfilamiento progresivo + detección de recordatorios en lenguaje natural.
    // Se salta si este mensaje ya se resolvió como confirmación de recordatorio.
    // Envuelto en try/catch: si algo falla acá, la respuesta normal ya calculada
    // igual se envía.
    try {
      const usuarioActual = recordatorioConfirmado ? null : await obtenerOCrearUsuario(telefono, nombre);

      if (usuarioActual?.onboarding_completo && respuesta) {
        const nombrePerfil = usuarioActual.como_llamar || usuarioActual.nombre || 'amigo';

        // ¿Hay una pregunta de perfil hecha en un turno ANTERIOR esperando respuesta?
        const { data: preguntaActiva } = await supabase
          .from('usuario_perfil_estado')
          .select('campo')
          .eq('usuario_id', usuarioActual.id)
          .eq('estado', 'preguntada')
          .order('fecha_preguntada', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (preguntaActiva) {
          // Este mensaje es la respuesta a esa pregunta: no detectar ni preguntar nada nuevo.
          await guardarRespuestaPerfil(usuarioActual.id, preguntaActiva.campo, textoMensaje);
        } else {
          const deteccion = await detectarDatosPasivos(usuarioActual.id, textoMensaje);
          if (deteccion.detectado && deteccion.tipo === 'persona') {
            respuesta += `\n\n¿Quieres que guarde a ${deteccion.valor} como ${deteccion.relacion || 'contacto'} en Personas?`;
          }

          if (!deteccion.detectado) {
            const preguntaPendiente = await obtenerPreguntaPendiente(usuarioActual.id);
            if (preguntaPendiente) {
              respuesta += `\n\n${preguntaPendiente.pregunta}`;
              await marcarPreguntado(usuarioActual.id, preguntaPendiente.campo);
            }
          }
        }

        // Detección de recordatorio en lenguaje natural
        const intencionRecordatorio = await detectarRecordatorio(textoMensaje, nombrePerfil);
        if (intencionRecordatorio?.detectado) {
          const fechaUTC = new Date(intencionRecordatorio.fechaISO);
          // Colombia es UTC-5 fijo (sin horario de verano): convertir a hora local
          // para guardar fecha_vencimiento/hora_vencimiento igual que el resto de la app.
          const local = new Date(fechaUTC.getTime() - 5 * 60 * 60 * 1000);
          const fechaLocal = local.toISOString().split('T')[0];
          const horaLocal = local.toISOString().split('T')[1].slice(0, 8);

          const tareaCreada = await crearTarea(usuarioActual.id, {
            titulo: intencionRecordatorio.tarea,
            fecha_vencimiento: fechaLocal,
            hora_vencimiento: horaLocal,
          });

          await programarJob('recordatorio-tarea', {
            usuario_id: usuarioActual.id,
            telefono,
            nombre: nombrePerfil,
            tarea: intencionRecordatorio.tarea,
            tarea_id: tareaCreada?.id,
          }, intencionRecordatorio.fechaISO);

          console.log(`⏰ Recordatorio programado: "${intencionRecordatorio.tarea}" para ${intencionRecordatorio.fechaISO}`);
        }
      }
    } catch (e) {
      console.error('Error en perfilamiento/recordatorio:', e.message);
    }

  } else if (mensaje.type === 'image') {
    console.log(`📸 Imagen recibida de ${telefono}`);

    const usuario = await obtenerOCrearUsuario(telefono, nombre);

    if (!usuario) {
      respuesta = 'Disculpa, hubo un error.';
    } else if (!usuario.onboarding_completo) {
      respuesta = 'Primero termina tu registro escribiéndome por texto. 😊';
    } else {
      const caption = mensaje.image.caption || null;
      const result = await procesarImagen(usuario, mensaje.image.id, caption);
      respuesta = result.mensaje;
    }

  } else if (mensaje.type === 'audio' || mensaje.type === 'voice') {
    console.log(`🎤 Audio recibido de ${telefono}`);

    const usuario = await obtenerOCrearUsuario(telefono, nombre);

    if (!usuario) {
      respuesta = 'Disculpa, hubo un error.';
    } else if (!usuario.onboarding_completo) {
      respuesta = 'Primero termina tu registro escribiéndome por texto. 😊';
    } else {
      const audioId = mensaje.audio?.id || mensaje.voice?.id;
      const result = await procesarAudio(usuario.id, audioId);

      if (result.exito && result.transcripcion) {
        console.log(`📝 Transcripción: "${result.transcripcion}"`);
        respuesta = await procesarMensaje(telefono, nombre, result.transcripcion);
      } else {
        respuesta = result.mensaje;
      }
    }

  } else if (mensaje.type === 'document') {
    console.log(`📄 Documento recibido de ${telefono}`);

    const usuario = await obtenerOCrearUsuario(telefono, nombre);

    if (!usuario) {
      respuesta = 'Disculpa, hubo un error.';
    } else if (!usuario.onboarding_completo) {
      respuesta = 'Primero termina tu registro escribiéndome por texto. 😊';
    } else {
      const doc = mensaje.document;
      const caption = doc.caption || null;
      const result = await procesarDocumento(usuario, doc.id, doc.mime_type, doc.filename, caption);
      respuesta = result.mensaje;
    }

  } else if (mensaje.type === 'interactive') {
    // Respuesta a un botón o a una lista (préstamos: confirmar/editar/
    // cancelar creación, resolver ambigüedad pago vs ingreso, elegir a cuál
    // préstamo corresponde un pago).
    const tapId = mensaje.interactive?.button_reply?.id || mensaje.interactive?.list_reply?.id;
    console.log(`🔘 Interactivo recibido de ${telefono}: ${tapId}`);

    const usuario = await obtenerOCrearUsuario(telefono, nombre);
    respuesta = await procesarRespuestaInteractiva(usuario, telefono, tapId);

  } else {
    console.log(`⏭️ Tipo ignorado: ${mensaje.type}`);
    respuesta = `Por ahora solo entiendo texto, imágenes, audios y documentos PDF. 😊`;
  }

  // Enviar respuesta para Du Life
  if (respuesta) {
    await enviarMensaje(telefono, respuesta);
  }

  // Mantener viva la función hasta que los push disparados dentro de
  // procesarMensaje terminen de salir — si respondemos antes, Vercel
  // congela la función y la notificación muere en vuelo.
  await esperarPushesPendientes();

  return res.status(200).json({ status: 'ok' });
}

// ─────────────────────────────────────────
// RESPUESTAS A BOTONES/LISTAS DE PRÉSTAMOS
// ─────────────────────────────────────────

async function procesarRespuestaInteractiva(usuario, telefono, tapId) {
  if (!usuario || !tapId) return null;

  switch (tapId) {
    case 'guardar_prestamo': {
      const prestamo = await confirmarCreacionPrestamo(usuario);
      if (!prestamo) return 'No encontré el préstamo en progreso para guardar. ¿Quieres empezar de nuevo?';
      return `✅ Préstamo guardado: ${prestamo.nombre_deudor}, ${prestamo.cantidad_cuotas} cuotas de $${Number(prestamo.valor_cuota).toLocaleString('es-CO')}.`;
    }

    case 'editar_prestamo':
      return await reiniciarCreacionPrestamo(usuario);

    case 'cancelar_prestamo':
      await cancelarCreacionPrestamo(usuario);
      return 'Listo, cancelé el registro del préstamo.';

    case 'pago_prestamo': {
      const decision = obtenerDecisionPendiente(usuario);
      if (!decision || decision.tipo !== 'ambiguedad_pago') return 'Ya no tengo ese pago pendiente por confirmar.';
      await limpiarDecisionPendiente(usuario);

      const candidatos = await resolverPrestamoParaPago(usuario.id, null);
      if (candidatos.length === 0) return 'No tienes préstamos activos registrados.';
      if (candidatos.length === 1) return await aplicarPagoYFormatear(candidatos[0], decision.datos.monto);

      await guardarDecisionPendiente(usuario, 'seleccion_prestamo_pago', { monto: decision.datos.monto });
      await enviarListaWhatsApp(
        telefono,
        '¿A cuál de tus préstamos corresponde este pago?',
        candidatos.map((p) => ({ id: p.id, title: p.nombre_deudor }))
      );
      return null;
    }

    case 'ingreso_personal': {
      const decision = obtenerDecisionPendiente(usuario);
      if (!decision || decision.tipo !== 'ambiguedad_pago') return 'Ya no tengo ese monto pendiente por confirmar.';
      await limpiarDecisionPendiente(usuario);
      await registrarIngreso(usuario.id, { monto: decision.datos.monto, descripcion: 'Ingreso personal', fuente: 'otro' });
      return `✅ Registrado como ingreso: $${Number(decision.datos.monto).toLocaleString('es-CO')}.`;
    }

    case 'otro':
      await limpiarDecisionPendiente(usuario);
      return 'Ok, cuéntame con más detalle de qué se trata y lo registro. 😊';

    default: {
      // No es un id fijo: puede ser la selección de un préstamo específico
      // (id = UUID del préstamo) para un pago con varios candidatos.
      const decision = obtenerDecisionPendiente(usuario);
      if (decision?.tipo === 'seleccion_prestamo_pago') {
        await limpiarDecisionPendiente(usuario);
        const prestamo = await obtenerPrestamo(tapId);
        if (!prestamo) return 'No encontré ese préstamo.';
        return await aplicarPagoYFormatear(prestamo, decision.datos.monto);
      }
      return null;
    }
  }
}

// ─────────────────────────────────────────
// RECORDATORIO DE TAREA
// ─────────────────────────────────────────

async function jobRecordatorioTarea(body, res) {
  const { telefono, nombre, tarea, tarea_id } = body;
  console.log('Body parseado (recordatorio-tarea):', { telefono, nombre, tarea, tarea_id });

  if (!telefono || !nombre || !tarea) {
    console.error('❌ recordatorio-tarea: faltan datos en el body');
    return res.status(400).json({ error: 'Faltan datos' });
  }

  // El header "Recordatorio" de esta plantilla es texto fijo (sin {{1}}),
  // así que NO se envía componente header: Meta lo pinta solo. Enviarlo
  // causa "(#100) Invalid parameter / Parameter name is missing or empty".
  const resultado = await enviarPlantilla(telefono, 'recordatorio_du', { nombre, tarea });
  console.log('📨 Resultado enviarPlantilla:', JSON.stringify(resultado));

  // Deja rastro de cuándo se envió el recordatorio para poder detectar
  // en el webhook si un "Listo" posterior confirma esta tarea puntual.
  if (tarea_id) {
    await supabase
      .from('tareas')
      .update({ recordatorio_enviado_en: new Date().toISOString() })
      .eq('id', tarea_id);
  }

  return res.status(200).json({ ok: true });
}

// ─────────────────────────────────────────
// REFLEXIÓN NOCTURNA (lunes, miércoles, viernes 8PM)
// ─────────────────────────────────────────

async function jobReflexionNocturna(body, res) {
  const { telefono, nombre } = body;
  console.log('Body parseado (reflexion-nocturna):', { telefono, nombre });

  if (!telefono || !nombre) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const resultado = await enviarPlantilla(telefono, 'reflexion_nocturna', { nombre });
  console.log(`✅ Reflexión nocturna enviada a ${nombre}:`, JSON.stringify(resultado));

  return res.status(200).json({ ok: true });
}

// ─────────────────────────────────────────
// RECORDATORIO DE ONBOARDING INCOMPLETO
// Mensaje libre (sin plantilla): se programa para pocas horas después del
// último mensaje del usuario, así que sigue dentro de la ventana de 24h de
// servicio al cliente. Se re-consulta el usuario en este momento (no se
// confía en el payload programado hace horas) para no molestar a alguien
// que ya terminó su registro o que ya recibió este mismo recordatorio antes.
// ─────────────────────────────────────────

async function jobRecordatorioOnboarding(body, res) {
  const { usuario_id, telefono, nombre } = body;
  console.log('Body parseado (recordatorio-onboarding):', { usuario_id, telefono });

  if (!usuario_id || !telefono) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('onboarding_completo, metadata')
    .eq('id', usuario_id)
    .maybeSingle();

  if (!usuario || usuario.onboarding_completo || usuario.metadata?.recordatorio_onboarding_enviado) {
    return res.status(200).json({ ok: true, omitido: true });
  }

  const mensaje = `Hola${nombre ? ' ' + nombre : ''} 👋 Vi que quedamos a medias con tu registro — no hay afán.\n\n` +
    'Cuando quieras seguir, solo escríbeme lo que te pregunté y retomamos justo ahí. 😊';

  await enviarMensaje(telefono, mensaje);

  await actualizarUsuario(usuario_id, {
    metadata: { ...(usuario.metadata || {}), recordatorio_onboarding_enviado: true },
  });

  console.log(`✅ Recordatorio de onboarding enviado a ${telefono}`);
  return res.status(200).json({ ok: true });
}

// ─────────────────────────────────────────
// CHEQUEO DE FIN DE SEMANA
// ─────────────────────────────────────────

async function jobChequeoSemana(body, res) {
  const { telefono, nombre } = body;
  console.log('Body parseado (chequeo-semana):', { telefono, nombre });

  if (!telefono || !nombre) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const resultado = await enviarPlantillaConBotones(telefono, 'chequeo_fin_semana', { nombre });
  console.log('📨 Resultado:', JSON.stringify(resultado));

  return res.status(200).json({ ok: true });
}

// ─────────────────────────────────────────
// RESUMEN SEMANAL
// ─────────────────────────────────────────

async function jobResumenSemanal(body, res) {
  const { usuario_id, telefono, nombre } = body;
  console.log('Body parseado (resumen-semanal):', { usuario_id, telefono, nombre });

  if (!usuario_id || !telefono || !nombre) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const hace7DiasStr = hace7Dias.toISOString().split('T')[0];
  const hace7DiasISO = hace7Dias.toISOString();

  const [gastos, tareas, notas, animo] = await Promise.all([
    supabase.from('gastos').select('monto, categoria').eq('usuario_id', usuario_id).is('eliminado_en', null).gte('fecha', hace7DiasStr),
    supabase.from('tareas').select('titulo, completada_en').eq('usuario_id', usuario_id).is('eliminado_en', null).gte('creado_en', hace7DiasISO),
    supabase.from('notas').select('contenido').eq('usuario_id', usuario_id).is('eliminado_en', null).gte('creado_en', hace7DiasISO),
    supabase.from('registro_animo').select('puntaje').eq('usuario_id', usuario_id).gte('created_at', hace7DiasISO),
  ]);

  const totalGastos = gastos.data?.reduce((s, g) => s + (Number(g.monto) || 0), 0) || 0;
  const tareasOk = tareas.data?.filter((t) => t.completada_en).length || 0;
  const promedioAnimo = animo.data?.length
    ? (animo.data.reduce((s, a) => s + a.puntaje, 0) / animo.data.length).toFixed(1)
    : null;

  const response = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Genera un resumen semanal personal para ${nombre} en 3-4 líneas, tono cálido, segunda persona. Datos: gastos $${totalGastos.toLocaleString('es-CO')}, tareas completadas ${tareasOk} de ${tareas.data?.length || 0}, notas guardadas ${notas.data?.length || 0}${promedioAnimo ? `, ánimo promedio ${promedioAnimo}/10` : ''}. Sin saludos ni títulos. Máximo 280 caracteres.`,
    }],
  });

  const resumen = response.content[0]?.text?.trim() || '';

  const resultado = await enviarPlantilla(telefono, 'resumen_semanal', { nombre, resumen });
  console.log('📨 Resultado enviarPlantilla:', JSON.stringify(resultado));

  await supabase.from('resumen_semanal').insert({
    usuario_id,
    semana_inicio: getLunes(),
    semana_fin: new Date().toISOString().split('T')[0],
    texto_resumen: resumen,
    fecha_generado: new Date().toISOString(),
  });

  return res.status(200).json({ ok: true });
}

function getLunes() {
  const d = new Date();
  const dia = d.getUTCDay();
  const diff = d.getUTCDate() - dia + (dia === 0 ? -6 : 1);
  return new Date(d.setUTCDate(diff)).toISOString().split('T')[0];
}

// ─────────────────────────────────────────
// REACTIVACIÓN POR INACTIVIDAD
// ─────────────────────────────────────────

async function jobReactivacion(body, res) {
  const { usuario_id, telefono, nombre } = body;
  console.log('Body parseado (reactivacion):', { usuario_id, telefono, nombre });

  if (!usuario_id || !telefono || !nombre) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  let moduloElegido = MODULOS_REACTIVACION[0];
  for (const mod of MODULOS_REACTIVACION) {
    let query = supabase
      .from(mod.tabla)
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', usuario_id);
    if (mod.tabla === 'entidades') query = query.eq('tipo_entidad', 'persona');
    const { count } = await query;
    if ((count || 0) === 0) {
      moduloElegido = mod;
      break;
    }
  }

  const resultado = await enviarPlantilla(telefono, 'reactivacion_modulo', {
    nombre,
    modulo: moduloElegido.texto,
  });
  console.log('📨 Resultado enviarPlantilla:', JSON.stringify(resultado));

  return res.status(200).json({ ok: true });
}

// ─────────────────────────────────────────
// RECORDATORIO DE EVENTO DE CALENDARIO (agendado 5 min antes desde el chat)
// ─────────────────────────────────────────

async function jobRecordatorioCalendario(body, res) {
  const { telefono, nombre, evento, evento_id } = body;
  console.log('Body parseado (recordatorio-calendario):', { telefono, nombre, evento, evento_id });

  if (!telefono || !nombre || !evento) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  // Se reclama el evento ANTES de enviar, con un update condicionado a que
  // todavía no se haya enviado: si jobRevisarCalendario (la red de seguridad)
  // ya lo reclamó primero en la misma ventana de tiempo, este update no
  // afecta ninguna fila y se omite el envío — evita el duplicado que se
  // veía cuando ambos jobs coincidían sobre el mismo evento.
  if (evento_id) {
    const { data: reclamado } = await supabase
      .from('calendario_eventos')
      .update({ recordatorio_enviado: true })
      .eq('id', evento_id)
      .eq('recordatorio_enviado', false)
      .select('id')
      .maybeSingle();
    if (!reclamado) {
      console.log(`⏭️ Recordatorio de evento ${evento_id} ya enviado por otro job, se omite.`);
      return res.status(200).json({ ok: true, omitido: true });
    }
  }

  // El header "EN 5 MINUTOS" y el footer de esta plantilla son texto fijo:
  // solo se envía el componente body con {{nombre}} y {{evento}}.
  const resultado = await enviarPlantilla(telefono, 'recordatorio_evento_calendario', { nombre, evento });
  console.log('📨 Resultado enviarPlantilla:', JSON.stringify(resultado));

  return res.status(200).json({ ok: true });
}

// ─────────────────────────────────────────
// REVISIÓN PERIÓDICA DEL CALENDARIO (cron QStash cada 5 min)
// Red de seguridad para eventos que no tienen un job puntual programado
// (ej. los importados en bloque desde una foto de horario).
// ─────────────────────────────────────────

async function jobRevisarCalendario(body, res) {
  const ahora = new Date();
  const colombiaTime = new Date(ahora.getTime() - 5 * 60 * 60 * 1000);
  const fechaHoy = colombiaTime.toISOString().split('T')[0];
  const horaActual = colombiaTime.toTimeString().slice(0, 5);
  const horaEn5 = new Date(colombiaTime.getTime() + 5 * 60 * 1000).toTimeString().slice(0, 5);

  console.log(`📅 Revisando calendario: ${fechaHoy} entre ${horaActual} y ${horaEn5}`);

  const { data: eventos, error } = await supabase
    .from('calendario_eventos')
    .select('*, usuarios(telefono, como_llamar)')
    .eq('fecha', fechaHoy)
    .eq('recordatorio_enviado', false)
    .gte('hora_inicio', horaActual)
    .lte('hora_inicio', horaEn5);

  if (error) console.error('❌ Error consultando calendario_eventos:', error.message);
  console.log(`📋 Eventos próximos: ${eventos?.length || 0}`);

  for (const evento of (eventos || [])) {
    const nombre = evento.usuarios?.como_llamar || 'amigo';
    const telefono = evento.usuarios?.telefono;
    if (!telefono) continue;

    // Mismo patrón de reclamo atómico que jobRecordatorioCalendario: si el
    // job puntual programado desde el chat ya lo marcó como enviado, este
    // update no afecta ninguna fila y se omite (evita el duplicado).
    const { data: reclamado } = await supabase
      .from('calendario_eventos')
      .update({ recordatorio_enviado: true })
      .eq('id', evento.id)
      .eq('recordatorio_enviado', false)
      .select('id')
      .maybeSingle();
    if (!reclamado) continue;

    const textoEvento = `${evento.titulo} a las ${evento.hora_inicio.slice(0, 5)}`;
    await enviarPlantilla(telefono, 'recordatorio_evento_calendario', { nombre, evento: textoEvento });

    console.log(`✅ Recordatorio enviado: ${textoEvento} a ${nombre}`);
  }

  return res.status(200).json({ ok: true, procesados: eventos?.length || 0 });
}
