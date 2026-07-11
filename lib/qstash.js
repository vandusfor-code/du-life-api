// ============================================================
//  Du Life - QStash HTTP Client
//  lib/qstash.js
//  Sin SDK — fetch puro para evitar problemas ESM
// ============================================================

const QSTASH_URL = 'https://qstash.upstash.io/v2/publish';
const BASE_URL = 'https://app.dur.life';

// Publicar un job para ejecutarse en un momento exacto. Todos los jobs
// están consolidados en api/jobs/index.js (un único endpoint, no uno por
// job) para no exceder el límite de Serverless Functions del plan Hobby
// de Vercel; "tipo" selecciona internamente qué job correr.
export async function programarJob(tipo, body, cuandoISO) {
  const url = `${QSTASH_URL}/${BASE_URL}/api/jobs`;
  const notBefore = Math.floor(new Date(cuandoISO).getTime() / 1000);

  console.log('📤 QStash → URL:', url);
  console.log('📤 QStash → tipo:', tipo, '| body:', JSON.stringify(body));
  console.log('📤 QStash → cuandoISO:', cuandoISO, '| Upstash-Not-Before (unix):', notBefore);
  console.log('📤 QStash → QSTASH_TOKEN configurado:', !!process.env.QSTASH_TOKEN);

  const headers = {
    'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
    'Content-Type': 'application/json',
    'Upstash-Not-Before': String(notBefore),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tipo, ...body }),
    });

    const textoRespuesta = await response.text();
    console.log(`📥 QStash → respuesta [${response.status}]:`, textoRespuesta);

    if (!response.ok) {
      console.error(`❌ QStash error [${response.status}]:`, textoRespuesta);
      return null;
    }

    const data = textoRespuesta ? JSON.parse(textoRespuesta) : null;
    console.log(`✅ Job programado: ${tipo} para ${cuandoISO}`);
    return data;

  } catch (e) {
    console.error('❌ Error programarJob:', e.message);
    return null;
  }
}

// La verificación de que un request entrante viene de QStash de verdad se
// hace en api/jobs/index.js con Receiver.verify (@upstash/qstash), validando
// la firma criptográfica sobre el raw body. La antigua esLlamadaQStash (que
// solo miraba si el header existía) se eliminó por insegura.
