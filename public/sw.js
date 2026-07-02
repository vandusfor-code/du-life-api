// ============================================================
//  Du Life - Service Worker
//  public/sw.js
//  Maneja notificaciones push + instalación PWA
// ============================================================

const CACHE_VERSION = 'dulife-v1';

// Instalación
self.addEventListener('install', (event) => {
  console.log('[SW] Instalado');
  self.skipWaiting();
});

// Activación
self.addEventListener('activate', (event) => {
  console.log('[SW] Activado');
  event.waitUntil(clients.claim());
});

// Recibir notificación push
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { titulo: 'Du Life', mensaje: event.data.text() };
  }

  const titulo = payload.titulo || 'Du Life';
  const opciones = {
    body: payload.mensaje || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || '/dashboard',
      tipo: payload.tipo || 'general',
    },
    tag: payload.tag || 'dulife-notification',
    renotify: true,
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(titulo, opciones),
      // Avisar a todas las pestañas abiertas para que refresquen
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'push-received', tipo: payload.tipo });
        });
      }),
    ])
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si hay una ventana abierta con la app, la enfoca y navega
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(url);
          }
          return;
        }
      }
      // Si no hay ninguna abierta, abre una nueva
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});