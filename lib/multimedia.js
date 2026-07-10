// ============================================================
//  Du Life - Multimedia v2
//  lib/multimedia.js
//  Procesa imágenes (con registro auto) y audios
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabase, registrarGasto, crearEventoCalendario, actualizarUsuario } from './supabase.js';
import {
  analizarImagenGemini, analizarTablaHorariosGemini,
  construirPromptTablaHorarios,
  subirPDFAGemini, preguntarSobrePDF,
} from './gemini.js';

const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────
// DESCARGAR MEDIA DE WHATSAPP
// ─────────────────────────────────────────

async function descargarMedia(mediaId) {
  try {
    const urlMedia = `https://graph.facebook.com/${process.env.WA_API_VERSION}/${mediaId}`;
    const responseUrl = await fetch(urlMedia, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}` }
    });
    
    if (!responseUrl.ok) return null;
    const dataUrl = await responseUrl.json();
    if (!dataUrl.url) return null;
    
    const responseFile = await fetch(dataUrl.url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}` }
    });
    
    if (!responseFile.ok) return null;
    const buffer = await responseFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    
    return {
      buffer: buffer,
      base64: base64,
      mimeType: dataUrl.mime_type,
      sizeBytes: buffer.byteLength
    };
  } catch (e) {
    console.error('Error descargarMedia:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// ANALIZAR IMAGEN CON CLAUDE VISION
// ─────────────────────────────────────────

async function analizarImagenClaude(base64, mimeType, contexto) {
  const prompt = `Analiza esta imagen y responde en JSON puro (sin markdown):
{
  "tipo_imagen": "factura|recibo|documento|persona|lugar|comida|producto|captura_chat|otra",
  "descripcion": "qué se ve (1-2 oraciones)",
  "texto_extraido": "todo el texto visible",
  "datos_extraidos": {
    "monto": NUMBER|null,
    "comercio": STRING|null,
    "fecha": "YYYY-MM-DD"|null,
    "metodo_pago": "efectivo|nequi|daviplata|tarjeta_debito|tarjeta_credito|transferencia"|null,
    "categoria": "alimentacion|transporte|salud|entretenimiento|hogar|servicios|otros"|null,
    "items": []
  }
}

IMPORTANTE para facturas/recibos:
- monto: el TOTAL final (no items individuales)
- comercio: nombre del lugar/empresa
- fecha: si está visible, formato YYYY-MM-DD
- Si NO ves un total claro, usa null

${contexto ? 'CONTEXTO: ' + contexto : ''}`;

  try {
    const response = await claude.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64
            }
          },
          { type: 'text', text: prompt }
        ]
      }]
    });
    
    const texto = response.content[0].text;
    const limpio = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
    const inicio = limpio.indexOf('{');
    const fin = limpio.lastIndexOf('}');
    
    if (inicio === -1 || fin === -1) return null;
    return JSON.parse(limpio.substring(inicio, fin + 1));
  } catch (e) {
    console.error('Error Claude Vision:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// ANALIZAR TABLA DE HORARIOS CON CLAUDE VISION
// ─────────────────────────────────────────

async function analizarTablaHorarios(base64, mimeType, caption = null) {
  const prompt = construirPromptTablaHorarios(caption);

  try {
    const response = await claude.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 }
          },
          { type: 'text', text: prompt }
        ]
      }]
    });

    const texto = response.content[0].text;
    const limpio = texto.replace(/```json/gi, '').replace(/```/g, '').trim();

    if (/"detectado"\s*:\s*false/.test(limpio)) return null;

    const inicio = limpio.indexOf('{');
    const fin = limpio.lastIndexOf('}');
    if (inicio === -1 || fin === -1) return null;

    const resultado = JSON.parse(limpio.substring(inicio, fin + 1));
    if (!resultado || !Array.isArray(resultado.eventos) || resultado.eventos.length === 0) return null;
    return resultado;
  } catch (e) {
    console.error('Error Claude Vision (horarios):', e.message);
    return null;
  }
}

// Gemini primero (más barato que Claude Vision), Claude como red de
// seguridad si Gemini falla — mismo contrato JSON en ambos lados, así que
// el resto de procesarImagen() no distingue cuál respondió.
async function analizarImagen(base64, mimeType, contexto) {
  const r = await analizarImagenGemini(base64, mimeType, contexto);
  return r || await analizarImagenClaude(base64, mimeType, contexto);
}

async function analizarTabla(base64, mimeType, caption = null) {
  const r = await analizarTablaHorariosGemini(base64, mimeType, caption);
  return r || await analizarTablaHorarios(base64, mimeType, caption);
}

const CATEGORIAS_EVENTO_VALIDAS = ['trabajo', 'estudio', 'personal', 'salud'];

async function importarEventosDesdeHorario(usuarioId, eventos) {
  let insertados = 0;
  let primerEvento = null;

  for (const ev of eventos) {
    if (!ev.fecha || !ev.hora_inicio || !ev.hora_fin || !ev.titulo) continue;
    // Fecha debe ser YYYY-MM-DD real: si el modelo devolvió "lunes" u otro
    // texto, descartar la fila en vez de intentar un insert que va a fallar.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ev.fecha))) continue;
    if (!/^\d{1,2}:\d{2}/.test(String(ev.hora_inicio)) || !/^\d{1,2}:\d{2}/.test(String(ev.hora_fin))) continue;

    const r = await crearEventoCalendario(usuarioId, {
      titulo: ev.titulo,
      fecha: ev.fecha,
      hora_inicio: ev.hora_inicio,
      hora_fin: ev.hora_fin,
      categoria: CATEGORIAS_EVENTO_VALIDAS.includes(ev.categoria) ? ev.categoria : 'trabajo',
      origen: 'importacion_masiva',
      break_inicio: ev.break_inicio || null,
      break_fin: ev.break_fin || null,
    });

    if (r) {
      insertados++;
      if (!primerEvento || `${r.fecha}T${r.hora_inicio}` < `${primerEvento.fecha}T${primerEvento.hora_inicio}`) {
        primerEvento = r;
      }
    }
  }

  if (insertados === 0 || !primerEvento) {
    return {
      exito: false,
      mensaje: 'Vi tu tabla de horarios pero no logré leer bien las fechas u horas. 🙏 ¿Me la reenvías escribiendo en el mensaje de qué semana es? (ej: "horario de esta semana")',
    };
  }

  const fechaLarga = new Date(primerEvento.fecha + 'T12:00:00')
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });

  return {
    exito: true,
    eventos_importados: insertados,
    mensaje: `✅ Importé ${insertados} evento${insertados === 1 ? '' : 's'} a tu calendario. El próximo es ${primerEvento.titulo} el ${fechaLarga} a las ${primerEvento.hora_inicio.slice(0, 5)}.`,
  };
}

// ─────────────────────────────────────────
// HORARIO PENDIENTE — tabla sin fechas explícitas (usuarios.metadata),
// mismo patrón que pdf_activo: JSONB genérico, sin tabla/migración nueva.
// Se activa cuando la tabla solo trae días de la semana ("lunes",
// "martes"...) sin ninguna fecha real visible, y se resuelve en cuanto
// el usuario confirma en qué fecha cae el primer día del horario.
// ─────────────────────────────────────────

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

function normalizarDia(dia) {
  return String(dia || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, ''); // quita tildes: miércoles -> miercoles
}

async function guardarHorarioPendiente(usuario, datos) {
  const nuevoMetadata = {
    ...(usuario.metadata || {}),
    horario_pendiente: { ...datos, expira: Date.now() + 24 * 60 * 60 * 1000 },
  };
  await actualizarUsuario(usuario.id, { metadata: nuevoMetadata });
  usuario.metadata = nuevoMetadata;
}

export function obtenerHorarioPendiente(usuario) {
  const h = usuario.metadata?.horario_pendiente;
  if (!h) return null;
  if (h.expira && Date.now() > h.expira) return null;
  return h;
}

async function limpiarHorarioPendiente(usuario) {
  const nuevoMetadata = { ...(usuario.metadata || {}) };
  delete nuevoMetadata.horario_pendiente;
  await actualizarUsuario(usuario.id, { metadata: nuevoMetadata });
  usuario.metadata = nuevoMetadata;
}

const MESES_ES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

// Acepta "Julio 13", "13 de julio", "13 julio", "13/07", "13-07-2026", con
// año opcional (asume el año actual, o el siguiente si la fecha resultante
// quedaría más de 60 días en el pasado — normal en horarios, siempre son
// fechas cercanas, nunca del año anterior).
function parsearFechaAncla(texto) {
  const t = normalizarDia((texto || '').trim());
  let dia, mes, anio;

  let m = t.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(?:de\s+)?(\d{4}))?$/);
  if (m && MESES_ES[m[1]]) {
    mes = MESES_ES[m[1]]; dia = parseInt(m[2], 10); anio = m[3] ? parseInt(m[3], 10) : null;
  }

  if (!mes) {
    m = t.match(/^(\d{1,2})\s+(?:de\s+)?([a-z]+)(?:\s+(?:de\s+)?(\d{4}))?$/);
    if (m && MESES_ES[m[2]]) {
      dia = parseInt(m[1], 10); mes = MESES_ES[m[2]]; anio = m[3] ? parseInt(m[3], 10) : null;
    }
  }

  if (!mes) {
    m = t.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?$/);
    if (m) {
      dia = parseInt(m[1], 10); mes = parseInt(m[2], 10); anio = m[3] ? parseInt(m[3], 10) : null;
    }
  }

  if (!mes || !dia || dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;

  const hoy = new Date();
  if (!anio) anio = hoy.getFullYear();
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const diffDias = (hoy - fecha) / 86400000;
  if (diffDias > 60 && !texto.match(/\d{4}/)) fecha.setUTCFullYear(anio + 1);

  return fecha.toISOString().split('T')[0];
}

function calcularFechasDesdeAncla(eventos, primerDiaSemana, fechaAncla) {
  const idxAncla = DIAS_SEMANA.indexOf(normalizarDia(primerDiaSemana));
  if (idxAncla === -1) return null;

  const anclaDate = new Date(fechaAncla + 'T00:00:00Z');

  return eventos.map((ev) => {
    const idxEvento = DIAS_SEMANA.indexOf(normalizarDia(ev.dia_semana));
    if (idxEvento === -1) return ev;
    const offset = (idxEvento - idxAncla + 7) % 7;
    const fechaEvento = new Date(anclaDate);
    fechaEvento.setUTCDate(fechaEvento.getUTCDate() + offset);
    return { ...ev, fecha: fechaEvento.toISOString().split('T')[0] };
  });
}

// Se llama desde procesarMensaje() mientras haya un horario_pendiente
// activo: el próximo mensaje de texto se asume que es la fecha ancla.
export async function procesarConfirmacionHorario(usuario, mensajeTexto) {
  const pendiente = obtenerHorarioPendiente(usuario);
  if (!pendiente) return null;

  if (/^(olvida el horario|ya no|otra cosa|cambia de tema)/i.test(mensajeTexto.trim())) {
    await limpiarHorarioPendiente(usuario);
    return 'Listo, olvidé ese horario. Si quieres, reenvíame la foto cuando la tengas clara. 😊';
  }

  const fechaAncla = parsearFechaAncla(mensajeTexto);
  if (!fechaAncla) {
    return `No logré entender esa fecha. ¿Me confirmas en qué fecha cae el *${pendiente.primer_dia_semana}*? Respóndeme así: *Julio 13*`;
  }

  const eventosConFecha = calcularFechasDesdeAncla(pendiente.eventos, pendiente.primer_dia_semana, fechaAncla);
  await limpiarHorarioPendiente(usuario);

  if (!eventosConFecha) {
    return 'Tuve un problema calculando las fechas. ¿Puedes reenviarme la foto del horario?';
  }

  const resultado = await importarEventosDesdeHorario(usuario.id, eventosConFecha);
  return resultado.mensaje;
}

// ─────────────────────────────────────────
// TRANSCRIBIR AUDIO CON WHISPER
// ─────────────────────────────────────────

async function transcribirAudio(buffer, mimeType) {
  try {
    const blob = new Blob([buffer], { type: mimeType });
    const file = new File([blob], 'audio.ogg', { type: mimeType });
    
    const transcripcion = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'es'
    });
    
    return transcripcion.text;
  } catch (e) {
    console.error('Error Whisper:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// GUARDAR REGISTRO MULTIMEDIA
// ─────────────────────────────────────────

async function guardarArchivoMultimedia(usuarioId, datos) {
  const { data } = await supabase
    .from('archivos_multimedia')
    .insert({
      usuario_id: usuarioId,
      tipo_archivo: datos.tipo_archivo,
      tamano_bytes: datos.tamano_bytes,
      formato: datos.formato,
      texto_extraido: datos.texto_extraido,
      descripcion_ai: datos.descripcion_ai,
      contexto: datos.contexto,
      procesado: true,
      fecha_procesado: new Date().toISOString(),
      metadata: datos.metadata || {}
    })
    .select()
    .single();
  return data;
}

// ─────────────────────────────────────────
// PROCESAR IMAGEN
// Con registro AUTOMÁTICO si es factura
// ─────────────────────────────────────────

export async function procesarImagen(usuario, mediaId, caption) {
  console.log(`📸 Procesando imagen`);
  const usuarioId = usuario.id;

  const media = await descargarMedia(mediaId);
  if (!media) {
    return { exito: false, mensaje: 'No pude descargar la imagen.' };
  }

  // ¿Es una tabla de horarios? Se revisa primero porque implica un flujo
  // totalmente distinto (múltiples eventos) al análisis genérico de abajo.
  // El caption viaja al prompt: "horario de esta semana" ayuda a fechar
  // tablas que solo traen días de la semana.
  const horario = await analizarTabla(media.base64, media.mimeType, caption);
  if (horario) {
    console.log(`🗓️ Tabla de horarios detectada: ${horario.eventos.length} eventos`);

    if (horario.fechas_explicitas) {
      return await importarEventosDesdeHorario(usuarioId, horario.eventos);
    }

    // Sin fechas reales en la imagen (solo días de la semana): se guarda
    // pendiente y se le pregunta al usuario en qué fecha cae el primer día,
    // en vez de adivinar la semana (los horarios rotan semana a semana).
    await guardarHorarioPendiente(usuario, {
      eventos: horario.eventos,
      primer_dia_semana: horario.primer_dia_semana,
    });

    return {
      exito: true,
      mensaje: `Vi tu horario, pero no trae fechas exactas. ¿Me confirmas qué fecha es el *${horario.primer_dia_semana}* (el primer día del horario)? Respóndeme así: *Julio 13*`,
    };
  }

  const analisis = await analizarImagen(media.base64, media.mimeType, caption);
  if (!analisis) {
    return { exito: false, mensaje: 'Recibí la imagen pero no la entendí. ¿Me cuentas qué hay?' };
  }

  // Guardar archivo
  await guardarArchivoMultimedia(usuarioId, {
    tipo_archivo: 'imagen',
    formato: media.mimeType,
    tamano_bytes: media.sizeBytes,
    texto_extraido: analisis.texto_extraido,
    descripcion_ai: analisis.descripcion,
    contexto: caption,
    metadata: {
      tipo_imagen: analisis.tipo_imagen,
      datos_extraidos: analisis.datos_extraidos
    }
  });
  
  // ─────────────────────────────────────
  // SI ES FACTURA/RECIBO CON MONTO → REGISTRAR AUTO
  // ─────────────────────────────────────
  
  const datos = analisis.datos_extraidos || {};
  const esFactura = ['factura', 'recibo'].includes(analisis.tipo_imagen);
  
  if (esFactura && datos.monto && datos.monto > 0) {
    console.log(`💰 Registrando gasto automáticamente: $${datos.monto}`);
    
    const descripcion = datos.comercio 
      ? `${datos.comercio}${datos.categoria ? ' - ' + datos.categoria : ''}`
      : (analisis.descripcion || 'Compra');
    
    const gasto = await registrarGasto(usuarioId, {
      monto: datos.monto,
      descripcion: descripcion,
      lugar: datos.comercio,
      metodo_pago: datos.metodo_pago || 'efectivo',
      fecha: datos.fecha || new Date().toISOString().split('T')[0]
    });
    
    if (gasto) {
      const formatearMonto = (m) => Number(m).toLocaleString('es-CO');
      return {
        exito: true,
        analisis,
        gasto_registrado: true,
        mensaje: `✅ *Gasto registrado*\n\n` +
                 `📌 ${descripcion}\n` +
                 `💵 $${formatearMonto(datos.monto)}\n` +
                 `💳 ${datos.metodo_pago || 'efectivo'}\n` +
                 `📅 ${datos.fecha || 'hoy'}\n\n` +
                 `Si algo está mal, dímelo y lo corrijo. 😊`
      };
    }
  }
  
  // Si NO es factura o no se pudo registrar
  return {
    exito: true,
    analisis,
    mensaje: generarRespuestaImagen(analisis)
  };
}

// ─────────────────────────────────────────
// PROCESAR AUDIO
// ─────────────────────────────────────────

export async function procesarAudio(usuarioId, mediaId) {
  console.log(`🎤 Procesando audio`);
  
  const media = await descargarMedia(mediaId);
  if (!media) {
    return { exito: false, mensaje: 'No pude descargar el audio.' };
  }
  
  const transcripcion = await transcribirAudio(media.buffer, media.mimeType);
  if (!transcripcion) {
    return { exito: false, mensaje: 'No pude entender el audio. ¿Puedes escribirme?' };
  }
  
  console.log(`✅ Audio transcrito: "${transcripcion}"`);
  
  await guardarArchivoMultimedia(usuarioId, {
    tipo_archivo: 'audio',
    formato: media.mimeType,
    tamano_bytes: media.sizeBytes,
    texto_extraido: transcripcion
  });
  
  return {
    exito: true,
    transcripcion: transcripcion
  };
}

// ─────────────────────────────────────────
// PDF ACTIVO (usuarios.metadata) — mismo patrón que prestamo_en_progreso
// en lib/prestamosEngine.js: JSONB genérico, sin tabla/migración nueva.
// Ventana de 24h (más corta que las ~48h reales del File API de Gemini,
// por margen de seguridad) para las preguntas de seguimiento.
// ─────────────────────────────────────────

async function guardarPDFActivo(usuario, datos) {
  const nuevoMetadata = {
    ...(usuario.metadata || {}),
    pdf_activo: { ...datos, expira: Date.now() + 24 * 60 * 60 * 1000 },
  };
  await actualizarUsuario(usuario.id, { metadata: nuevoMetadata });
  usuario.metadata = nuevoMetadata;
}

export function obtenerPDFActivo(usuario) {
  const p = usuario.metadata?.pdf_activo;
  if (!p) return null;
  if (p.expira && Date.now() > p.expira) return null;
  return p;
}

export async function limpiarPDFActivo(usuario) {
  const nuevoMetadata = { ...(usuario.metadata || {}) };
  delete nuevoMetadata.pdf_activo;
  await actualizarUsuario(usuario.id, { metadata: nuevoMetadata });
  usuario.metadata = nuevoMetadata;
}

// ─────────────────────────────────────────
// PROCESAR DOCUMENTO (PDF)
// ─────────────────────────────────────────

export async function procesarDocumento(usuario, mediaId, mimeType, filename, caption) {
  console.log(`📄 Procesando documento: ${filename}`);

  if (mimeType !== 'application/pdf') {
    return { exito: false, mensaje: 'Por ahora solo puedo leer archivos PDF. 📄' };
  }

  const media = await descargarMedia(mediaId);
  if (!media) {
    return { exito: false, mensaje: 'No pude descargar el documento.' };
  }

  const archivo = await subirPDFAGemini(media.buffer, mimeType, filename);
  if (!archivo) {
    return { exito: false, mensaje: 'No pude procesar el PDF. Intenta de nuevo.' };
  }

  await guardarArchivoMultimedia(usuario.id, {
    tipo_archivo: 'documento',
    formato: mimeType,
    tamano_bytes: media.sizeBytes,
    contexto: caption,
    metadata: { filename },
  });

  await guardarPDFActivo(usuario, { file_uri: archivo.uri, mime_type: archivo.mimeType, filename });

  const pregunta = caption || 'Hazme un resumen breve de este documento (máximo 4-5 líneas).';
  const respuestaTexto = await preguntarSobrePDF(archivo.uri, archivo.mimeType, pregunta);

  return {
    exito: true,
    mensaje: respuestaTexto || `📄 Recibí "${filename}". ¿Qué quieres que te diga sobre él?`,
  };
}

// ─────────────────────────────────────────
// GENERAR RESPUESTA PARA IMÁGENES NO-FACTURA
// ─────────────────────────────────────────

function generarRespuestaImagen(analisis) {
  if (!analisis) return '📸 Recibí la imagen, gracias.';
  
  switch (analisis.tipo_imagen) {
    case 'documento':
      return `📄 Veo un documento: ${analisis.descripcion}`;
    case 'producto':
      return `📦 Veo un producto: ${analisis.descripcion}`;
    case 'captura_chat':
      return `💬 Veo una captura. ${analisis.descripcion}`;
    case 'comida':
      return `🍽️ Veo: ${analisis.descripcion}`;
    case 'persona':
      return `👤 Veo: ${analisis.descripcion}`;
    case 'lugar':
      return `📍 Veo: ${analisis.descripcion}`;
    default:
      return `📸 Veo: ${analisis.descripcion}`;
  }
}