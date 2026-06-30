// ============================================================
//  Du Life - API Usuario (GET y PATCH)
//  api/dashboard/usuario.js
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
    // GET: Obtener usuario
    if (req.method === 'GET') {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, nombre, como_llamar, telefono, pais, plan, tratamiento, zona_horaria, creado_en')
        .eq('id', sesion.usuario_id)
        .single();
      
      return res.status(200).json({ usuario });
    }
    
    // PATCH: Actualizar
    if (req.method === 'PATCH') {
      const { como_llamar, tratamiento } = req.body;
      
      const updates = {};
      if (como_llamar !== undefined) updates.como_llamar = como_llamar;
      if (tratamiento !== undefined) updates.tratamiento = tratamiento;
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Nada que actualizar' });
      }
      
      const { data, error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('id', sesion.usuario_id)
        .select()
        .single();
      
      if (error) {
        return res.status(500).json({ error: 'Error actualizando' });
      }
      
      return res.status(200).json({ usuario: data });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (e) {
    console.error('Error usuario:', e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}