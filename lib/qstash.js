// ============================================================
//  Du Life - QStash HTTP Client
//  lib/qstash.js
//  Sin SDK — fetch puro para evitar problemas ESM
// ============================================================

const QSTASH_URL = 'https://qstash.upstash.io/v2/publish';
const BASE_URL = 'https://du-life-api.vercel.app';

// Publicar un job para ejecutarse en una URL en un momento exacto
export async function programarJob(path, body, cuandoISO) {
  const url = `${QSTASH_URL}/${BASE_URL}${path}`;

  const headers = {
    'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
    'Content-Type': 'application/json',
    'Upstash-Not-Before': String(Math.floor(new Date(cuandoISO).getTime() / 1000)),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`❌ QStash error [${response.status}]:`, err);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Job programado: ${path} para ${cuandoISO}`);
    return data;

  } catch (e) {
    console.error('❌ Error programarJob:', e.message);
    return null;
  }
}

// Verificación básica de que la llamada viene de QStash (suficiente para MVP,
// no valida la firma HMAC — ver nota de seguridad en el resumen de la tarea).
export function esLlamadaQStash(req) {
  const token = req.headers['upstash-signature'];
  return !!token;
}
