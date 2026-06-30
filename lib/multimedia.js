// ============================================================
//  Du Life - Multimedia v2
//  lib/multimedia.js
//  Procesa imágenes (con registro auto) y audios
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabase, registrarGasto } from './supabase.js';

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

export async function procesarImagen(usuarioId, mediaId, caption) {
  console.log(`📸 Procesando imagen`);
  
  const media = await descargarMedia(mediaId);
  if (!media) {
    return { exito: false, mensaje: 'No pude descargar la imagen.' };
  }
  
  const analisis = await analizarImagenClaude(media.base64, media.mimeType, caption);
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