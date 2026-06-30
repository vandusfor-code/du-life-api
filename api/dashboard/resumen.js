// ============================================================
//  Du Life - Dashboard Resumen
//  api/dashboard/resumen.js
// ============================================================

import { supabase, obtenerResumenMes, obtenerGastos, obtenerEntidadesPorTipo } from '../../lib/supabase.js';
import crypto from 'crypto';

// Validar JWT
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
    
    // Verificar expiración
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return decoded;
  } catch (e) {
    return null;
  }
}

// Parsear cookies del header
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {});
}

export default async function handler(req, res) {
  // Validar autenticación
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.dulife_token;
  
  const sesion = verificarToken(token);
  if (!sesion || !sesion.usuario_id) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const usuarioId = sesion.usuario_id;
    
    // Obtener usuario
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nombre, como_llamar, telefono, pais, plan')
      .eq('id', usuarioId)
      .single();
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Cargar datos en paralelo
    const [resumenMes, ultimosGastos, personas] = await Promise.all([
      obtenerResumenMes(usuarioId),
      obtenerGastos(usuarioId, { limite: 5 }),
      obtenerEntidadesPorTipo(usuarioId, 'persona', 5)
    ]);

    // Total personas
    const { count: totalPersonas } = await supabase
      .from('entidades')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('tipo_entidad', 'persona')
      .eq('activo', true);

    return res.status(200).json({
      usuario: usuario,
      resumen: {
        total_gastos: resumenMes.total_gastos,
        total_ingresos: resumenMes.total_ingresos,
        balance: resumenMes.balance,
        total_personas: totalPersonas || 0,
        ultimos_gastos: ultimosGastos || [],
        personas: personas || []
      }
    });
    
  } catch (e) {
    console.error('Error resumen:', e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}