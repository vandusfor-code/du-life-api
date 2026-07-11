// ============================================================
//  Du Life - Verificar código OTP
//  api/auth/verify-code.js
// ============================================================

import { supabase, obtenerOCrearUsuario } from '../../lib/supabase.js';
import crypto from 'crypto';

function generarToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${payloadStr}`;
  const secret = process.env.JWT_SECRET || 'dulife_secret_change_in_production';
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { telefono, codigo } = req.body;

  if (!telefono || !codigo) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  try {
    const { data: codigos } = await supabase
      .from('codigos_otp')
      .select('*')
      .eq('telefono', telefono)
      .eq('usado', false)
      .order('creado_en', { ascending: false })
      .limit(1);
    
    if (!codigos || codigos.length === 0) {
      return res.status(400).json({ error: 'No hay código pendiente. Solicita uno nuevo.' });
    }
    
    const registro = codigos[0];
    
    const ahora = new Date();
    const expiracion = new Date(registro.expira_en);
    if (ahora > expiracion) {
      return res.status(400).json({ error: 'El código expiró. Solicita uno nuevo.' });
    }
    
    if (registro.intentos >= 5) {
      await supabase.from('codigos_otp').update({ usado: true }).eq('id', registro.id);
      return res.status(400).json({ error: 'Demasiados intentos. Solicita un código nuevo.' });
    }
    
    if (registro.codigo !== codigo) {
      await supabase.from('codigos_otp').update({ intentos: registro.intentos + 1 }).eq('id', registro.id);
      return res.status(400).json({ error: 'Código incorrecto' });
    }
    
    await supabase.from('codigos_otp').update({ usado: true }).eq('id', registro.id);
    
    const usuario = await obtenerOCrearUsuario(telefono, 'Usuario');
    if (!usuario) {
      return res.status(500).json({ error: 'Error con el usuario' });
    }
    
    // 90 días + renovación deslizante en api/dashboard/[modulo].js: mientras
    // el usuario siga entrando, la sesión no se cierra nunca.
    const DURACION = 90 * 24 * 60 * 60;
    const token = generarToken({
      usuario_id: usuario.id,
      telefono: usuario.telefono,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + DURACION
    });

    res.setHeader('Set-Cookie', [
      `dulife_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DURACION}`
    ]);
    
    console.log(`✅ Login exitoso: ${telefono}`);
    
    return res.status(200).json({
      success: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        como_llamar: usuario.como_llamar,
        telefono: usuario.telefono,
        onboarding_completo: usuario.onboarding_completo
      }
    });
    
  } catch (e) {
    console.error('Error verify-code:', e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}