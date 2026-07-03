// ============================================================
//  Du Life - Cliente QStash
//  lib/qstash.js
//  Programa recordatorios que llegan a la hora exacta
// ============================================================

import { Client } from '@upstash/qstash';

let client = null;

function getClient() {
  if (client) return client;
  if (!process.env.QSTASH_TOKEN) return null;
  client = new Client({ token: process.env.QSTASH_TOKEN });
  return client;
}

/**
 * Programa un mensaje HTTP para que QStash lo dispare en fecha/hora exacta.
 * QStash llama a nuestra API cuando llega el momento → esta ejecuta la lógica.
 *
 * @param {object} params
 * @param {string} params.destination - URL a llamar cuando venza (nuestro endpoint)
 * @param {object} params.body - payload que llegará a nuestro endpoint
 * @param {Date} params.notBefore - fecha/hora en la que debe dispararse
 * @returns {Promise<string|null>} messageId de QStash (para poder cancelar luego)
 */
export async function programarRecordatorio({ destination, body, notBefore }) {
  try {
    const qs = getClient();
    if (!qs) {
      console.error('[QStash] Cliente no inicializado (falta QSTASH_TOKEN)');
      return null;
    }

    const notBeforeSeconds = Math.floor(notBefore.getTime() / 1000);
    const ahora = Math.floor(Date.now() / 1000);

    // Si ya pasó, no programar
    if (notBeforeSeconds <= ahora) {
      console.log('[QStash] Recordatorio ya venció, no se programa');
      return null;
    }

    const resp = await qs.publishJSON({
      url: destination,
      body,
      notBefore: notBeforeSeconds,
    });

    console.log(`[QStash] Programado: messageId=${resp.messageId}`);
    return resp.messageId;
  } catch (e) {
    console.error('[QStash] Error programando:', e.message);
    return null;
  }
}

/**
 * Cancela un recordatorio programado antes de que se dispare.
 *
 * @param {string} messageId - ID que devolvió programarRecordatorio
 */
export async function cancelarRecordatorio(messageId) {
  try {
    if (!messageId) return false;
    const qs = getClient();
    if (!qs) return false;

    await qs.messages.delete(messageId);
    return true;
  } catch (e) {
    console.error('[QStash] Error cancelando:', e.message);
    return false;
  }
}