// ============================================================
//  Du Life - WhatsApp Cloud API
//  lib/whatsapp.js
// ============================================================

const WA_API_URL = `https://graph.facebook.com/${process.env.WA_API_VERSION || 'v20.0'}/${process.env.WA_PHONE_NUMBER_ID}`;
const WA_TIMEOUT_MS = 8000;

// ─────────────────────────────────────────
// ENVIAR MENSAJE DE TEXTO
// ─────────────────────────────────────────

export async function enviarMensaje(telefono, texto) {
  const url = `${WA_API_URL}/messages`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: telefono,
        type: 'text',
        text: { body: texto }
      }),
      signal: AbortSignal.timeout(WA_TIMEOUT_MS)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error enviando WhatsApp [${response.status}]:`, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Mensaje enviado');
    return data;
    
  } catch (e) {
    console.error('❌ Error enviarMensaje:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// MARCAR COMO LEÍDO
// ─────────────────────────────────────────

// Marca el mensaje entrante como leído (doble check azul) Y muestra el
// indicador de "escribiendo…" en el chat del usuario. La WhatsApp Cloud API
// combina ambas cosas en el mismo request (status:read + typing_indicator).
// El "escribiendo…" dura hasta 25s o hasta que Du Life envíe su respuesta —
// lo que ocurra primero — así que se ve natural mientras Claude procesa.
export async function marcarLeido(messageId) {
  const url = `${WA_API_URL}/messages`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: { type: 'text' }
      }),
      signal: AbortSignal.timeout(WA_TIMEOUT_MS)
    });
  } catch (e) {
    // Silent fail
  }
}

// ─────────────────────────────────────────
// ENVIAR IMAGEN
// ─────────────────────────────────────────

export async function enviarImagen(telefono, urlImagen, caption = '') {
  try {
    const response = await fetch(`${WA_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefono,
        type: 'image',
        image: {
          link: urlImagen,
          caption
        }
      }),
      signal: AbortSignal.timeout(WA_TIMEOUT_MS)
    });
    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Error enviando imagen [${response.status}]:`, JSON.stringify(data));
      return null;
    }

    console.log('📸 Imagen enviada:', JSON.stringify(data));
    return data;
  } catch (e) {
    console.error('❌ Error enviarImagen:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// ENVIAR CON TYPING (simula que está escribiendo)
// ─────────────────────────────────────────

export async function enviarConTyping(telefono, texto, delayMs = 600) {
  // Por ahora solo delay artificial antes de responder
  await new Promise(r => setTimeout(r, delayMs));
  return enviarMensaje(telefono, texto);
}

// ─────────────────────────────────────────
// ENVIAR PLANTILLA DE META
// ─────────────────────────────────────────

export async function enviarPlantilla(telefono, nombrePlantilla, variables = {}, header = null) {
  const url = `${WA_API_URL}/messages`;

  const components = [];

  if (header) {
    components.push({
      type: 'header',
      parameters: [{ type: 'text', text: header }]
    });
  }

  // Variables nombradas (ej: {{nombre}}, {{tarea}}), no posicionales ({{1}}, {{2}}):
  // cada parámetro debe incluir parameter_name con el nombre exacto de la
  // variable configurada en la plantilla de Meta.
  const parameters = Object.entries(variables).map(([key, value]) => ({
    type: 'text',
    parameter_name: key,
    text: String(value)
  }));

  if (parameters.length > 0) {
    components.push({ type: 'body', parameters });
  }

  const bodyPayload = {
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'template',
    template: {
      name: nombrePlantilla,
      language: { code: 'es_CO' },
      components
    }
  };

  console.log('📤 Enviando plantilla:', JSON.stringify(bodyPayload));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(WA_TIMEOUT_MS)
    });

    const data = await response.json();
    console.log('📥 Respuesta Meta:', JSON.stringify(data));

    if (!response.ok) {
      console.error(`❌ Error plantilla ${nombrePlantilla} [${response.status}]:`, JSON.stringify(data));
      return null;
    }

    console.log(`✅ Plantilla ${nombrePlantilla} enviada`);
    return data;

  } catch (e) {
    console.error('❌ Error enviarPlantilla:', e.message);
    return null;
  }
}

// Plantilla con botones (quick reply)
export async function enviarPlantillaConBotones(telefono, nombrePlantilla, variables = {}) {
  const url = `${WA_API_URL}/messages`;

  // Variables nombradas: cada parámetro incluye parameter_name con el nombre
  // exacto de la variable configurada en la plantilla de Meta.
  const params = Object.entries(variables).map(([key, value]) => ({
    type: 'text',
    parameter_name: key,
    text: String(value)
  }));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefono,
        type: 'template',
        template: {
          name: nombrePlantilla,
          language: { code: 'es_CO' },
          components: params.length > 0
            ? [{ type: 'body', parameters: params }]
            : []
        }
      }),
      signal: AbortSignal.timeout(WA_TIMEOUT_MS)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`❌ Error plantilla botones [${response.status}]:`, err);
      return null;
    }

    return await response.json();
  } catch (e) {
    console.error('❌ Error enviarPlantillaConBotones:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// MENSAJES INTERACTIVOS (no son plantillas — no requieren aprobación de
// Meta, solo funcionan dentro de la ventana de 24h de conversación activa)
// ─────────────────────────────────────────

// Máximo 3 botones, cada "title" máximo 20 caracteres (límite de Meta).
export async function enviarBotonesWhatsApp(telefono, textoCuerpo, botones = []) {
  const url = `${WA_API_URL}/messages`;

  const bodyPayload = {
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: textoCuerpo },
      action: {
        buttons: botones.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: String(b.title).slice(0, 20) }
        }))
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(WA_TIMEOUT_MS)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`❌ Error botones interactivos [${response.status}]:`, JSON.stringify(data));
      return null;
    }
    return data;
  } catch (e) {
    console.error('❌ Error enviarBotonesWhatsApp:', e.message);
    return null;
  }
}

// Lista desplegable — para cuando hay más de 3 opciones (máx 10 filas).
export async function enviarListaWhatsApp(telefono, textoCuerpo, opciones = [], textoBoton = 'Seleccionar') {
  const url = `${WA_API_URL}/messages`;

  const bodyPayload = {
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: textoCuerpo },
      action: {
        button: textoBoton,
        sections: [{
          title: 'Opciones',
          rows: opciones.slice(0, 10).map((o) => ({
            id: String(o.id),
            title: String(o.title).slice(0, 24)
          }))
        }]
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(WA_TIMEOUT_MS)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`❌ Error lista interactiva [${response.status}]:`, JSON.stringify(data));
      return null;
    }
    return data;
  } catch (e) {
    console.error('❌ Error enviarListaWhatsApp:', e.message);
    return null;
  }
}