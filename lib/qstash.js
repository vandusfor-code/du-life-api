// ============================================================
//  Du Life - Cliente QStash (fetch directo, sin SDK)
//  lib/qstash.js
// ============================================================

/**
 * Programa un recordatorio con QStash HTTP API directamente.
 */
export async function programarRecordatorio({ destination, body, notBefore }) {
  try {
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      console.error('[QStash] Falta QSTASH_TOKEN');
      return null;
    }

    const notBeforeSeconds = Math.floor(notBefore.getTime() / 1000);
    const ahora = Math.floor(Date.now() / 1000);

    if (notBeforeSeconds <= ahora) {
      console.log('[QStash] Recordatorio ya venció, no se programa');
      return null;
    }

    const resp = await fetch(`https://qstash.upstash.io/v2/publish/${encodeURIComponent(destination)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Upstash-Not-Before': String(notBeforeSeconds),
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      console.error(`[QStash] Error ${resp.status}:`, errTxt);
      return null;
    }

    const data = await resp.json();
    console.log(`[QStash] Programado: messageId=${data.messageId}`);
    return data.messageId;
  } catch (e) {
    console.error('[QStash] Error programando:', e.message);
    return null;
  }
}

export async function cancelarRecordatorio(messageId) {
  try {
    if (!messageId) return false;
    const token = process.env.QSTASH_TOKEN;
    if (!token) return false;

    const resp = await fetch(`https://qstash.upstash.io/v2/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return resp.ok;
  } catch (e) {
    console.error('[QStash] Error cancelando:', e.message);
    return false;
  }
}