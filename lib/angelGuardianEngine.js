// ============================================================
//  Du Life - Motor del Ángel Guardián
//  lib/angelGuardianEngine.js
//
//  Fase 1: flujo completo de acompañamiento nocturno opt-in.
//  - "Salidita" ofrece activar el Ángel Guardián.
//  - Al aceptar: disclaimer (1a vez), estado en usuarios.metadata (sin
//    migración), y se programan con QStash el primer chequeo, el cierre
//    automático a las 3:00 AM y el seguimiento del domingo al mediodía.
//  - Chequeos adaptativos: "Bien" (cada 2h), "Más o menos"/"No muy bien"
//    (cada 1h, más atento). Cada job relee el estado FRESCO y se
//    auto-cancela si el usuario ya cerró el Ángel Guardián.
//
//  Todos los mensajes nocturnos van como interactivos normales (no
//  plantillas): la ventana de 24h se mantiene abierta porque el usuario
//  respondió al tocar "Salidita".
// ============================================================

import { enviarMensaje, enviarBotonesWhatsApp } from './whatsapp.js';
import { programarJob } from './qstash.js';
import { supabase, actualizarUsuario } from './supabase.js';

const OFFSET_MS = 5 * 60 * 60 * 1000; // Colombia = UTC-5 fijo (sin DST)
const INTERVALO_NORMAL = 120; // min ("Bien")
const INTERVALO_ATENTO = 60;  // min ("Más o menos" / "No muy bien")
const HORA_PRIMER_CHEQUEO = 22; // 10:00 PM
const HORA_CORTE = 3;           // 3:00 AM — cierre automático
const HORA_SEGUIMIENTO = 12;    // 12:00 PM domingo

// ── Helpers de tiempo (Colombia) ──

function ahoraColombia() {
  return new Date(Date.now() - OFFSET_MS);
}

// Próxima ocurrencia (ISO UTC) de HH:00 hora Colombia; si ya pasó hoy, mañana.
function proximaHoraColombiaUTC(hora) {
  const now = Date.now();
  const col = new Date(now - OFFSET_MS);
  let targetUTC = Date.UTC(col.getUTCFullYear(), col.getUTCMonth(), col.getUTCDate(), hora, 0, 0) + OFFSET_MS;
  if (targetUTC <= now) targetUTC += 24 * 3600 * 1000;
  return new Date(targetUTC).toISOString();
}

// Próximo domingo al mediodía Colombia (ISO UTC).
function proximoDomingoMediodiaUTC() {
  const now = Date.now();
  const col = new Date(now - OFFSET_MS);
  const add = (7 - col.getUTCDay()) % 7; // 0 = hoy es domingo
  let targetUTC = Date.UTC(col.getUTCFullYear(), col.getUTCMonth(), col.getUTCDate() + add, HORA_SEGUIMIENTO, 0, 0) + OFFSET_MS;
  if (targetUTC <= now) targetUTC += 7 * 24 * 3600 * 1000;
  return new Date(targetUTC).toISOString();
}

// Momento del primer chequeo: 10PM si aún no son las 10PM; si no, en un
// intervalo desde ahora.
function primerChequeoUTC() {
  const col = ahoraColombia();
  if (col.getUTCHours() < HORA_PRIMER_CHEQUEO) return proximaHoraColombiaUTC(HORA_PRIMER_CHEQUEO);
  return new Date(Date.now() + INTERVALO_NORMAL * 60000).toISOString();
}

// ¿Ya pasó la hora de corte (3AM) y estamos en la madrugada/día? Los chequeos
// solo corren ~10PM–3AM; si un job cae fuera de esa franja, ya toca cerrar.
function pasoElCorte() {
  const h = ahoraColombia().getUTCHours();
  return h >= HORA_CORTE && h < HORA_PRIMER_CHEQUEO;
}

// ¿Un chequeo programado en `intervaloMin` caería antes del próximo corte?
function cabeAntesDelCorte(intervaloMin) {
  const proximo = Date.now() + intervaloMin * 60000;
  return proximo < new Date(proximaHoraColombiaUTC(HORA_CORTE)).getTime();
}

// ── Estado en metadata ──

function getEstado(usuario) {
  return usuario?.metadata?.angel_guardian || null;
}

async function guardarEstado(usuario, cambios) {
  const metadata = { ...(usuario.metadata || {}) };
  metadata.angel_guardian = { ...(metadata.angel_guardian || {}), ...cambios };
  await actualizarUsuario(usuario.id, { metadata });
  usuario.metadata = metadata;
  return metadata.angel_guardian;
}

async function marcarDisclaimerVisto(usuario) {
  const metadata = { ...(usuario.metadata || {}), ag_disclaimer_visto: true };
  await actualizarUsuario(usuario.id, { metadata });
  usuario.metadata = metadata;
}

async function cargarUsuario(usuarioId) {
  const { data } = await supabase.from('usuarios').select('*').eq('id', usuarioId).maybeSingle();
  return data || null;
}

// ── Botones de la plantilla del sábado ──

export async function manejarBotonPlantilla(usuario, telefono, textoBoton) {
  const texto = String(textoBoton || '').trim();

  if (texto === 'En casa') {
    return 'Genial, descanso y compartir en familia 🏡. Recuerda que puedes registrar tus gastos del día con solo escribirme, para llevar el control. 💚';
  }

  if (texto === 'Salidita') {
    return await ofrecerAngelGuardian(usuario, telefono);
  }

  return null;
}

// Ofrece activar el Ángel Guardián (botones) y deja una "oferta pendiente" en
// metadata, para poder aceptar/rechazar también por TEXTO ("sí"/"no") — no
// todos tocan el botón. Se usa desde el botón "Salidita", desde la detección
// de "salida" escrita en el chat, y desde el disparo manual.
export async function ofrecerAngelGuardian(usuario, telefono) {
  await enviarBotonesWhatsApp(
    telefono,
    '¿Quieres que active tu Ángel Guardián esta noche? Te voy a escribir un par de veces para ver cómo vas 🙌',
    [
      { id: 'ag_activar_si', title: 'Sí, actívalo' },
      { id: 'ag_activar_no', title: 'No, gracias' },
    ]
  );
  await setOfertaPendiente(usuario);
  return null;
}

async function setOfertaPendiente(usuario) {
  const metadata = { ...(usuario.metadata || {}), angel_guardian_pendiente: { expira: Date.now() + 30 * 60000 } };
  await actualizarUsuario(usuario.id, { metadata });
  usuario.metadata = metadata;
}

export function hayOfertaPendiente(usuario) {
  const p = usuario?.metadata?.angel_guardian_pendiente;
  return !!(p && p.expira > Date.now());
}

export async function limpiarOfertaPendiente(usuario) {
  const metadata = { ...(usuario.metadata || {}) };
  delete metadata.angel_guardian_pendiente;
  await actualizarUsuario(usuario.id, { metadata });
  usuario.metadata = metadata;
}

// Detecta que el usuario avisa que va a salir, escrito como texto (no botón):
// "salida", "salidita", "voy a salir", "me voy de rumba/fiesta", etc.
const RE_SALIDA = /^(salida|salidita|voy a salir|me voy de (salida|rumba|fiesta|farra|parranda)|voy de (rumba|fiesta|farra|parranda)|salgo (hoy|esta noche|ya)|me voy de parranda)\b/i;

export function esMensajeSalida(texto) {
  return RE_SALIDA.test(String(texto || '').trim());
}

// Respuesta por TEXTO a la oferta de activación (cuando hay oferta pendiente).
// Devuelve el mensaje a enviar, o null si el texto no fue un sí/no claro.
function primeraPalabra(t) {
  return String(t || '').trim().toLowerCase().split(/\s+/)[0].replace(/[^0-9a-záéíóúñ]/gi, '');
}
const SI_SET = new Set(['si', 'sí', 'sip', 'dale', 'activalo', 'actívalo', 'hazlo', 'bueno', 'ok', 'okay', 'claro', 'listo', 'yes', 'obvio', 'porfa']);
const NO_SET = new Set(['no', 'nop', 'nel', 'paso']);

export async function manejarRespuestaTextoActivacion(usuario, telefono, texto) {
  const w = primeraPalabra(texto);
  if (NO_SET.has(w)) {
    await limpiarOfertaPendiente(usuario);
    return 'Listo, que la pases muy bien 🎉';
  }
  if (SI_SET.has(w)) {
    await limpiarOfertaPendiente(usuario);
    return await activarAngelGuardian(usuario, telefono);
  }
  return null;
}

// Respuesta por TEXTO a un chequeo (cuando el Ángel está activo): mapea a los
// mismos ids que los botones para reusar manejarRespuestaAngel.
export function textoAChequeoId(texto) {
  const s = String(texto || '').trim().toLowerCase();
  if (/^(no muy bien|muy mal|me siento mal|mal\b)/.test(s)) return 'ag_mal';
  if (/^(m[aá]s o menos|masomenos|regular|ah[ií] voy)/.test(s)) return 'ag_masomenos';
  if (/^(bien|muy bien|todo bien|de lujo|excelente|genial)/.test(s)) return 'ag_bien';
  return null;
}

// ── Activación ──

export async function activarAngelGuardian(usuario, telefono) {
  // Disclaimer obligatorio solo la primera vez en el historial del usuario.
  if (!usuario.metadata?.ag_disclaimer_visto) {
    await enviarMensaje(telefono, 'Antes de activar: no soy un servicio de emergencias. Si estás en peligro real, llama al 123. 🙏');
    await marcarDisclaimerVisto(usuario);
  }

  await guardarEstado(usuario, {
    activo: true,
    inicio: new Date().toISOString(),
    ultimo_chequeo: null,
    intervalo_min: INTERVALO_NORMAL,
    ultima_respuesta: null,
  });

  // Programar primer chequeo + cierre 3AM + seguimiento del domingo.
  const payload = { usuario_id: usuario.id, telefono };
  await programarJob('angel-chequeo', payload, primerChequeoUTC());
  await programarJob('angel-cierre', payload, proximaHoraColombiaUTC(HORA_CORTE));
  await programarJob('angel-seguimiento', payload, proximoDomingoMediodiaUTC());

  return 'Listo, tu Ángel Guardián está activo 👼 Te voy a escribir cada cierto tiempo para ver cómo vas. ¡Que la pases increíble!';
}

// ── Respuestas del usuario (taps interactivos ag_*) ──

const MENSAJES_CHEQUEO = [
  '¿Cómo va todo por ahí? 🙌',
  '¿Todo tranquilo? 😊',
  '¿Cómo te sientes?',
  '¿Sigues bien? 💚',
];

const BOTONES_CHEQUEO = [
  { id: 'ag_bien', title: 'Bien' },
  { id: 'ag_masomenos', title: 'Más o menos' },
  { id: 'ag_mal', title: 'No muy bien' },
];

export function esRespuestaAngel(tapId) {
  return typeof tapId === 'string' && tapId.startsWith('ag_');
}

export async function manejarRespuestaAngel(usuario, telefono, tapId) {
  if (tapId === 'ag_activar_no') {
    await limpiarOfertaPendiente(usuario);
    return 'Listo, que la pases muy bien 🎉';
  }
  if (tapId === 'ag_activar_si') {
    await limpiarOfertaPendiente(usuario);
    return await activarAngelGuardian(usuario, telefono);
  }

  // Respuestas a un chequeo. Si el Ángel ya no está activo (cerró a las 3AM
  // o el usuario lo cerró), respondemos suave sin reprogramar nada.
  const estado = getEstado(usuario);
  if (!estado?.activo) {
    return 'Gracias por avisarme 💚 Que descanses.';
  }

  if (tapId === 'ag_bien') {
    await guardarEstado(usuario, { intervalo_min: INTERVALO_NORMAL, ultima_respuesta: 'bien' });
    await reprogramarChequeo(usuario, telefono, INTERVALO_NORMAL);
    return '¡Me alegra! Sigue disfrutando 🎉';
  }

  if (tapId === 'ag_masomenos') {
    await guardarEstado(usuario, { intervalo_min: INTERVALO_ATENTO, ultima_respuesta: 'mas_o_menos' });
    await reprogramarChequeo(usuario, telefono, INTERVALO_ATENTO);
    return 'Ok, tómate las cosas con calma. Te escribo en un rato para ver cómo sigues 💚';
  }

  if (tapId === 'ag_mal') {
    await guardarEstado(usuario, { intervalo_min: INTERVALO_ATENTO, ultima_respuesta: 'no_muy_bien' });
    await reprogramarChequeo(usuario, telefono, INTERVALO_ATENTO);
    // Solo acompañamiento y seguridad básica — NUNCA indicaciones médicas.
    return 'Tranquilo, aquí estoy contigo 💚\n\nHazme un favor: toma agua, y si estás fuera, pide un taxi o domicilio para volver a casa cuando puedas. Si puedes, avísale a alguien de confianza dónde estás.\n\nTe escribo en un rato para ver cómo sigues. Y recuerda: si es una emergencia real, llama al 123.';
  }

  return null;
}

async function reprogramarChequeo(usuario, telefono, intervaloMin) {
  if (!cabeAntesDelCorte(intervaloMin)) return; // ya no alcanza antes de las 3AM
  const cuando = new Date(Date.now() + intervaloMin * 60000).toISOString();
  await programarJob('angel-chequeo', { usuario_id: usuario.id, telefono }, cuando);
}

// ── Jobs (llamados desde api/jobs/index.js) ──

export async function ejecutarChequeoAngel(usuarioId, telefono) {
  const usuario = await cargarUsuario(usuarioId);
  const estado = getEstado(usuario);
  if (!usuario || !estado?.activo) return; // auto-cancelado: ya se cerró

  if (pasoElCorte()) {
    await cerrarAngelGuardian(usuario, telefono);
    return;
  }

  const texto = MENSAJES_CHEQUEO[Math.floor(Math.random() * MENSAJES_CHEQUEO.length)];
  await enviarBotonesWhatsApp(telefono, texto, BOTONES_CHEQUEO);
  await guardarEstado(usuario, { ultimo_chequeo: new Date().toISOString() });
}

export async function ejecutarCierreAngel(usuarioId, telefono) {
  const usuario = await cargarUsuario(usuarioId);
  const estado = getEstado(usuario);
  if (!usuario || !estado?.activo) return; // ya estaba cerrado
  await cerrarAngelGuardian(usuario, telefono);
}

export async function ejecutarSeguimientoDomingo(usuarioId, telefono) {
  await enviarMensaje(telefono, '¿Cómo amaneciste? Anoche estuve pendiente de ti 😊');
}

// ── Cierre ──

export async function cerrarAngelGuardian(usuario, telefono, { silencioso = false } = {}) {
  await guardarEstado(usuario, { activo: false });
  if (!silencioso) {
    await enviarMensaje(telefono, 'Qué bueno que la pasaste bien 🙌 Aquí estaré el próximo sábado.');
  }
}

// Cierre manual por texto ("ya llegué", "estoy bien", etc.) — se intercepta
// en lib/asistente.js ANTES de pasar el mensaje por Claude.
const RE_CIERRE = /\b(ya lleg[uü]é|ya llegue|llegu[eé] a casa|ya (estoy )?en casa|ya estoy bien|estoy bien gracias|todo bien gracias|ya me acost)/i;

export function esMensajeCierreAngel(texto) {
  return RE_CIERRE.test(String(texto || ''));
}

export function angelEstaActivo(usuario) {
  return !!getEstado(usuario)?.activo;
}
