// ============================================================
//  TEMPORAL — Disparo manual del flujo del Ángel Guardián.
//  api/debug-angel.js  ·  BORRAR tras usar.
//  Simula el tap de "Salidita" para el número del owner: envía la
//  pregunta de activación con botones. Protegido por token; fijado al
//  OWNER_PHONE (nunca acepta un número arbitrario).
// ============================================================

import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';
import { manejarBotonPlantilla } from '../lib/angelGuardianEngine.js';

const TOKEN_ESPERADO = '2c2886f879fd6aebe290993d2eac0118539a4897f1f11b66';
const TELEFONO = process.env.OWNER_PHONE || '573148127388';

function tokenValido(recibido) {
  if (!recibido) return false;
  const a = Buffer.from(String(recibido));
  const b = Buffer.from(TOKEN_ESPERADO);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (!tokenValido(req.query.token)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('telefono', TELEFONO)
    .maybeSingle();

  if (!usuario) {
    return res.status(404).json({ ok: false, motivo: 'usuario no encontrado' });
  }

  // Simula el tap de "Salidita" → envía la pregunta de activación con botones.
  await manejarBotonPlantilla(usuario, TELEFONO, 'Salidita');

  return res.status(200).json({ ok: true, enviado: 'pregunta de activación (Sí/No)' });
}
