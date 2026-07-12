// ============================================================
//  TEMPORAL — Re-verificación de la GEMINI_API_KEY nueva. BORRAR tras usar.
//  api/debug-gemini.js
//  Prueba una llamada simple y una con grounding (googleSearch), y
//  devuelve el resultado/error real. NUNCA devuelve la API key.
// ============================================================

import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

const TOKEN_ESPERADO = 'e46c87581116511b29c8059342497973a2efaffa9ee51835';

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

  const MODELO = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const out = { key_presente: !!process.env.GEMINI_API_KEY, modelo: MODELO };
  const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const r = await gemini.models.generateContent({ model: MODELO, contents: 'Di "ok" y nada más.' });
    out.simple = { ok: true, texto: (r.text || '').slice(0, 40) };
  } catch (e) {
    out.simple = { ok: false, error: e.message, name: e.name };
  }

  try {
    const r = await gemini.models.generateContent({
      model: MODELO,
      contents: '¿precio del dólar en Colombia hoy?',
      config: { tools: [{ googleSearch: {} }], thinkingConfig: { thinkingBudget: 0 } },
    });
    out.grounding = { ok: true, texto: (r.text || '').slice(0, 80) };
  } catch (e) {
    out.grounding = { ok: false, error: e.message, name: e.name };
  }

  return res.status(200).json(out);
}
