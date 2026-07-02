// ============================================================
//  Du Life - Sistema de Push Notifications
//  lib/push.js
// ============================================================

import webpush from 'web-push';
import { supabase } from './supabase.js';

// Configurar VAPID una sola vez al cargar el módulo
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@dulife.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Envía una notificación push a todos los dispositivos activos del usuario.
 * Fire-and-forget: nunca throw, solo loggea. No debe romper el flujo principal.
 *
 * @param {string} usuarioId - UUID del usuario
 * @param {object} payload - { titulo, mensaje, url?, tipo? }
 */
export async function enviarNotificacionPush(usuarioId, payload) {
  try {
    if (!usuarioId || !payload) return;

    // 1. Traer suscripciones activas del usuario
    const { data: suscripciones, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('activo', true);

    if (error) {
      console.error('[Push] Error trayendo suscripciones:', error.message);
      return;
    }

    if (!suscripciones || suscripciones.length === 0) {
      console.log(`[Push] Usuario ${usuarioId} sin dispositivos suscritos`);
      return;
    }

    // 2. Preparar payload
    const bodyPayload = JSON.stringify({
      titulo: payload.titulo || 'Du Life',
      mensaje: payload.mensaje || '',
      url: payload.url || '/dashboard',
      tipo: payload.tipo || 'general',
    });

    // 3. Enviar en paralelo a todos los dispositivos
    const resultados = await Promise.allSettled(
      suscripciones.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          bodyPayload
        )
      )
    );

    // 4. Procesar resultados (soft-delete de suscripciones muertas)
    for (let i = 0; i < resultados.length; i++) {
      const r = resultados[i];
      const sub = suscripciones[i];

      if (r.status === 'fulfilled') {
        // Éxito: actualizar ultimo_uso, resetear failed_count
        await supabase
          .from('push_subscriptions')
          .update({
            ultimo_uso: new Date().toISOString(),
            failed_count: 0,
          })
          .eq('id', sub.id);
      } else {
        // Falló
        const statusCode = r.reason?.statusCode;
        console.error(`[Push] Falló envío a ${sub.id}: ${statusCode || r.reason?.message}`);

        // 404 o 410 = suscripción muerta, desactivar de una
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .update({ activo: false })
            .eq('id', sub.id);
        } else {
          // Otros errores: incrementar failed_count, desactivar al llegar a 3
          const nuevoCount = (sub.failed_count || 0) + 1;
          await supabase
            .from('push_subscriptions')
            .update({
              failed_count: nuevoCount,
              activo: nuevoCount < 3,
            })
            .eq('id', sub.id);
        }
      }
    }

    const exitosos = resultados.filter((r) => r.status === 'fulfilled').length;
    console.log(`[Push] Enviado a ${exitosos}/${suscripciones.length} dispositivos del usuario ${usuarioId}`);
  } catch (e) {
    // NUNCA throw — push es fire-and-forget
    console.error('[Push] Error inesperado:', e.message);
  }
}

/**
 * Guarda o actualiza una suscripción push del usuario.
 * Usado por el endpoint /api/dashboard/push_subscribe
 */
export async function guardarSuscripcion(usuarioId, suscripcion, userAgent = null) {
  try {
    if (!suscripcion?.endpoint || !suscripcion?.keys?.p256dh || !suscripcion?.keys?.auth) {
      return { ok: false, error: 'Suscripción inválida' };
    }

    // Upsert por endpoint (único)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          usuario_id: usuarioId,
          endpoint: suscripcion.endpoint,
          p256dh: suscripcion.keys.p256dh,
          auth: suscripcion.keys.auth,
          user_agent: userAgent,
          activo: true,
          failed_count: 0,
          ultimo_uso: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

    if (error) {
      console.error('[Push] Error guardando suscripción:', error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (e) {
    console.error('[Push] Error en guardarSuscripcion:', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Elimina una suscripción push (cuando el usuario desactiva notificaciones)
 */
export async function eliminarSuscripcion(endpoint) {
  try {
    if (!endpoint) return { ok: false };

    await supabase
      .from('push_subscriptions')
      .update({ activo: false })
      .eq('endpoint', endpoint);

    return { ok: true };
  } catch (e) {
    console.error('[Push] Error en eliminarSuscripcion:', e.message);
    return { ok: false, error: e.message };
  }
}