'use client';

import { useEffect, useState } from 'react';
import { IconBell, IconX } from '@tabler/icons-react';

const DISMISSED_KEY = 'dulife_push_dismissed_at';
const REMINDER_DAYS = 7; // reaparece a los 7 días si el usuario lo cierra

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function EnableNotifications() {
  const [status, setStatus] = useState('checking'); // checking | show | hidden | subscribing
  const [error, setError] = useState('');

  useEffect(() => {
    // Solo browsers que soporten
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return setStatus('hidden');
    if (!('serviceWorker' in navigator)) return setStatus('hidden');
    if (!('PushManager' in window)) return setStatus('hidden');

    // Si ya aceptó, ocultar
    if (Notification.permission === 'granted') return setStatus('hidden');
    // Si bloqueó, ocultar (no podemos volver a pedir)
    if (Notification.permission === 'denied') return setStatus('hidden');

    // Si el usuario lo cerró hace poco, ocultar temporalmente
    try {
      const dismissedAt = localStorage.getItem(DISMISSED_KEY);
      if (dismissedAt) {
        const diff = Date.now() - Number(dismissedAt);
        const dias = diff / (1000 * 60 * 60 * 24);
        if (dias < REMINDER_DAYS) return setStatus('hidden');
      }
    } catch (e) {}

    setStatus('show');
  }, []);

  const activar = async () => {
    setStatus('subscribing');
    setError('');

    try {
      // 1. Pedir permiso
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('hidden');
        return;
      }

      // 2. Registrar service worker (por si no está listo)
      const registration = await navigator.serviceWorker.ready;

      // 3. Suscribirse al push manager
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setError('Falta VAPID key en el frontend');
        setStatus('show');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 4. Enviar la suscripción al backend
      const resp = await fetch('/api/dashboard/push_subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suscripcion: subscription }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data.error || 'No pude guardar la suscripción');
        setStatus('show');
        return;
      }

      setStatus('hidden');
    } catch (e) {
      console.error('[EnableNotifications]', e);
      setError('Error al activar notificaciones');
      setStatus('show');
    }
  };

  const cerrar = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch (e) {}
    setStatus('hidden');
  };

  if (status === 'checking' || status === 'hidden') return null;

  return (
    <div
      className="mx-5 mt-4 rounded-card p-4 flex items-center gap-3 relative"
      style={{
        background: 'linear-gradient(135deg, rgba(196,233,56,0.15) 0%, rgba(196,233,56,0.05) 100%)',
        border: '1px solid rgba(196,233,56,0.3)',
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: '#C4E938' }}
      >
        <IconBell size={19} color="#0A0A0A" />
      </div>
      <div className="flex-1 pr-6">
        <div className="text-[13px] font-bold text-white leading-tight">
          Activa las notificaciones
        </div>
        <div className="text-[11px] text-muted leading-snug mt-0.5">
          Recibe tus registros al instante
        </div>
        {error && (
          <div className="text-[10px] text-red-400 mt-1">{error}</div>
        )}
        <button
          onClick={activar}
          disabled={status === 'subscribing'}
          className="mt-2 px-3 py-1.5 rounded-full text-[12px] font-bold"
          style={{
            background: '#C4E938',
            color: '#0A0A0A',
            opacity: status === 'subscribing' ? 0.5 : 1,
          }}
        >
          {status === 'subscribing' ? 'Activando...' : 'Activar'}
        </button>
      </div>
      <button
        onClick={cerrar}
        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <IconX size={12} color="#A1A1AA" />
      </button>
    </div>
  );
}