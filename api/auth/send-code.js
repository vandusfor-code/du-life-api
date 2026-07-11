// ============================================================
//  Du Life - Enviar código OTP
//  api/auth/send-code.js
// ============================================================

import { supabase } from '../../lib/supabase.js';
import { verificarLimite, obtenerIP } from '../../lib/ratelimit.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { telefono } = req.body;

  if (!telefono || telefono.length < 7) {
    return res.status(400).json({ error: 'Número inválido' });
  }

  // Rate limit: 3 códigos por número cada 15 min (frena gasto de saldo
  // WhatsApp) y 10 por IP cada 1 h (frena enumeración masiva). Fail-open.
  const porTelefono = await verificarLimite('send_code_telefono', telefono);
  if (!porTelefono.permitido) {
    return res.status(429).json({ error: 'Pediste demasiados códigos. Espera unos minutos e intenta de nuevo.' });
  }
  const porIP = await verificarLimite('send_code_ip', obtenerIP(req));
  if (!porIP.permitido) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta más tarde.' });
  }

  try {
    // 1. Generar código de 6 dígitos con un CSPRNG (crypto.randomInt), no
    //    Math.random() que es predecible. randomInt(100000, 1000000) da un
    //    entero uniforme en [100000, 999999] → siempre 6 dígitos.
    const codigo = crypto.randomInt(100000, 1000000).toString();
    
    // 2. Expiración (5 minutos)
    const expiracion = new Date();
    expiracion.setMinutes(expiracion.getMinutes() + 5);
    
    // 3. Invalidar códigos anteriores
    await supabase
      .from('codigos_otp')
      .update({ usado: true })
      .eq('telefono', telefono)
      .eq('usado', false);
    
    // 4. Guardar código nuevo
    const { error: dbError } = await supabase
      .from('codigos_otp')
      .insert({
        telefono: telefono,
        codigo: codigo,
        expira_en: expiracion.toISOString(),
        usado: false,
        intentos: 0
      });
    
    if (dbError) {
      console.error('Error guardando código:', dbError);
      return res.status(500).json({ error: 'Error guardando código' });
    }
    
    // 5. Enviar plantilla por WhatsApp
    const url = `https://graph.facebook.com/${process.env.WA_API_VERSION}/${process.env.WA_PHONE_NUMBER_ID}/messages`;
    
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
          name: 'clave',
          language: { code: 'es' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: codigo },
                { type: 'text', text: 'Iniciar sesión' },
                { type: 'text', text: '3148127388' }
              ]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                { type: 'text', text: codigo }
              ]
            }
          ]
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error WhatsApp:', errorText);
      return res.status(500).json({ error: 'No pude enviar el código por WhatsApp' });
    }
    
    // NUNCA loguear el código OTP ni el teléfono: los logs de Vercel no son
    // un lugar para secretos ni PII.
    console.log('✅ Código OTP enviado');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Código enviado por WhatsApp' 
    });
    
  } catch (e) {
    console.error('Error send-code:', e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}