// ============================================================
//  TEMPORAL — Diagnóstico de auditoría (FIX 5). BORRAR tras usar.
//  api/debug-keyrole.js
//  Decodifica SOLO el claim "role" del JWT de SUPABASE_KEY para
//  saber si es service_role o anon. NUNCA devuelve ni loguea la
//  key ni parte de ella. Protegido por un token en query.
// ============================================================

import crypto from 'crypto';

const TOKEN_ESPERADO = '925f8b21f8214addde8bbc3383cf6f8d7cf45639488455d6';

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

  const key = process.env.SUPABASE_KEY || '';
  if (!key) {
    return res.status(200).json({ ok: false, motivo: 'SUPABASE_KEY vacío en runtime' });
  }

  // Las keys legacy de Supabase son JWTs (eyJ...). Las nuevas
  // (sb_secret_.../sb_publishable_...) no lo son.
  const partes = key.split('.');
  if (partes.length !== 3) {
    return res.status(200).json({
      ok: false,
      formato: 'no-jwt',
      // Prefijo de formato, NO la key: distingue secret vs publishable
      // sin revelar material sensible.
      pista: key.startsWith('sb_secret_') ? 'sb_secret (equivale a service_role)'
           : key.startsWith('sb_publishable_') ? 'sb_publishable (equivale a anon)'
           : 'desconocido',
    });
  }

  try {
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString());
    // Devuelve SOLO role (y ref del proyecto, que no es secreto). Nada más.
    return res.status(200).json({ ok: true, role: payload.role || null });
  } catch (e) {
    return res.status(200).json({ ok: false, motivo: 'no se pudo decodificar el payload' });
  }
}
