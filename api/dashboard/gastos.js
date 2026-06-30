// ============================================================
//  Du Life - API Gastos
//  api/dashboard/gastos.js
// ============================================================

import { supabase } from '../../lib/supabase.js';
import crypto from 'crypto';

function verificarToken(token) {
  if (!token) return null;
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return null;
    const [header, payload, signature] = partes;
    const secret = process.env.JWT_SECRET || 'dulife_secret_change_in_production';
    const data = `${header}.${payload}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (signature !== expected) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch (e) {
    return null;
  }
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {});
}

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.dulife_token;
  const sesion = verificarToken(token);
  
  if (!sesion || !sesion.usuario_id) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const periodo = req.query.periodo || 'mes';
    const ahora = new Date();
    let desde = null;

    if (periodo === 'hoy') {
      desde = new Date().toISOString().split('T')[0];
    } else if (periodo === 'semana') {
      const s = new Date(ahora);
      s.setDate(ahora.getDate() - 7);
      desde = s.toISOString().split('T')[0];
    } else if (periodo === 'año') {
      desde = `${ahora.getFullYear()}-01-01`;
    } else {
      // mes
      desde = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`;
    }

    const { data: gastos } = await supabase
      .from('gastos')
      .select('*')
      .eq('usuario_id', sesion.usuario_id)
      .is('eliminado_en', null)
      .gte('fecha', desde)
      .order('fecha', { ascending: false })
      .limit(200);

    return res.status(200).json({
      periodo,
      desde,
      gastos: gastos || []
    });
    
  } catch (e) {
    console.error('Error gastos:', e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}