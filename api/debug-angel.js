// ============================================================
//  TEMPORAL — Disparo manual de la oferta del Ángel Guardián.
//  api/debug-angel.js  ·  BORRAR tras usar.
//  Envía la pregunta de activación (botones + oferta pendiente) al número
//  que se pase por query. Protegido por token.
// ============================================================

import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';
import { ofrecerAngelGuardian } from '../lib/angelGuardianEngine.js';

const TOKEN_ESPERADO = '4320048f58f78c4acc7cfd293a9bdbd9306e37e5063bf578';

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

  const telefono = String(req.query.telefono || '').replace(/[^0-9]/g, '');
  if (!telefono) return res.status(400).json({ error: 'falta telefono' });

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('telefono', telefono)
    .maybeSingle();

  if (!usuario) return res.status(404).json({ ok: false, motivo: 'usuario no encontrado' });

  await ofrecerAngelGuardian(usuario, telefono);
  return res.status(200).json({ ok: true, enviado: 'oferta de activación (Sí/No)' });
}
