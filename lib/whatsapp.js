// ============================================================
//  Du Life - WhatsApp Cloud API
//  lib/whatsapp.js
// ============================================================

const WA_API_URL = `https://graph.facebook.com/${process.env.WA_API_VERSION || 'v20.0'}/${process.env.WA_PHONE_NUMBER_ID}`;

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
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error enviando WhatsApp [${response.status}]:`, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log(`✅ Mensaje enviado a ${telefono}`);
    return data;
    
  } catch (e) {
    console.error('❌ Error enviarMensaje:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// MARCAR COMO LEÍDO
// ─────────────────────────────────────────

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
        message_id: messageId
      })
    });
  } catch (e) {
    // Silent fail
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