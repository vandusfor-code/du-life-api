// ============================================================
//  Du Life - Rate limiting (Upstash Redis)
//  lib/ratelimit.js
//  Fail-open por diseño: si Redis no está configurado o no responde,
//  se DEJA PASAR el request y se loguea. Una caída de Upstash nunca
//  debe tumbar el login ni el bot. El precio del fail-open es que
//  durante una caída de Redis no hay protección de rate limit.
// ============================================================

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const configurado = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = configurado
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

if (!configurado) {
  console.warn('⚠️ Rate limiting DESACTIVADO: faltan UPSTASH_REDIS_REST_URL/TOKEN (fail-open)');
}

function crearLimiter(prefix, limite, ventana) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limite, ventana),
    prefix,
    analytics: false,
  });
}

// Los 4 límites aprobados en la auditoría (ronda 2, FIX 4 parte B).
const LIMITERS = {
  // send-code: 3 códigos por número cada 15 min (gasto de saldo WhatsApp)
  send_code_telefono: crearLimiter('rl:sendcode:tel', 3, '15 m'),
  // send-code: 10 códigos por IP cada 1 h (enumeración de números)
  send_code_ip: crearLimiter('rl:sendcode:ip', 10, '1 h'),
  // verify-code: 10 intentos por IP cada 15 min (fuerza bruta rotando números)
  verify_code_ip: crearLimiter('rl:verify:ip', 10, '15 m'),
  // pipeline Claude: 30 mensajes por usuario/teléfono cada 10 min (costo API)
  claude_usuario: crearLimiter('rl:claude:user', 30, '10 m'),
  // aviso de "vas muy rápido": máx 1 por usuario cada 10 min, para no
  // responder (y gastar saldo WhatsApp) en cada mensaje bloqueado.
  claude_aviso: crearLimiter('rl:claude:aviso', 1, '10 m'),
};

// Devuelve { permitido, restante, reset }. SIEMPRE permitido:true si no hay
// Redis configurado, si falta el identificador, o si Redis lanza un error.
export async function verificarLimite(nombre, identificador) {
  const limiter = LIMITERS[nombre];
  if (!limiter || !identificador) return { permitido: true, restante: null, reset: null };
  try {
    const r = await limiter.limit(String(identificador));
    return { permitido: r.success, restante: r.remaining, reset: r.reset };
  } catch (e) {
    console.error(`⚠️ Rate limit fail-open (${nombre}): Redis no respondió — ${e.message}`);
    return { permitido: true, restante: null, reset: null };
  }
}

// Extrae la IP del cliente detrás del proxy de Vercel. x-forwarded-for puede
// ser una lista "ip_cliente, proxy1, proxy2" — se toma la primera.
export function obtenerIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.headers['x-real-ip'] || 'desconocida';
}
