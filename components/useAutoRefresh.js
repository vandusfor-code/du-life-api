'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook que ejecuta una función de refresh cuando:
 * - La app vuelve al foco (usuario minimizó y volvió)
 * - Cada intervalo mientras la pestaña está visible (safety net)
 * - Cuando el service worker manda un mensaje de push recibido
 *
 * @param {Function} refreshFn - Función a llamar para refrescar datos
 * @param {number} intervalMs - Intervalo en ms (default 30 seg)
 */
export function useAutoRefresh(refreshFn, intervalMs = 30000) {
  const refreshRef = useRef(refreshFn);
  refreshRef.current = refreshFn;

  useEffect(() => {
    let intervalId;

    // 1. Refresh cuando la pestaña vuelve a estar visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshRef.current();
      }
    };

    // 2. Refresh cuando la ventana recibe foco
    const handleFocus = () => {
      refreshRef.current();
    };

    // 3. Refresh cuando el service worker manda mensaje "push-received"
    const handleSWMessage = (event) => {
      if (event.data?.type === 'push-received') {
        refreshRef.current();
      }
    };

    // 4. Interval mientras la pestaña está visible
    const startInterval = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refreshRef.current();
        }
      }, intervalMs);
    };

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker?.addEventListener?.('message', handleSWMessage);
    }
    startInterval();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker?.removeEventListener?.('message', handleSWMessage);
      }
      stopInterval();
    };
  }, [intervalMs]);
}