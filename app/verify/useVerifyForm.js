'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Lógica compartida entre VerifyMobile y VerifyDesktop: teléfono desde
// sessionStorage, timer de reenvío, y las llamadas a verify-code/send-code.
// El manejo de los 6 inputs (foco, paste, borrado) queda en cada variante,
// porque está atado a sus propios refs del DOM.
export function useVerifyForm() {
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tiempoRestante, setTiempoRestante] = useState(300);
  const router = useRouter();

  useEffect(() => {
    const tel = sessionStorage.getItem('login_telefono');
    if (!tel) {
      router.push('/login');
      return;
    }
    setTelefono(tel);
    const interval = setInterval(() => {
      setTiempoRestante((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  const verificar = async (codigoStr, onError) => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, codigo: codigoStr }),
      });
      const data = await response.json();
      if (response.ok) {
        sessionStorage.removeItem('login_telefono');
        router.push('/dashboard');
      } else {
        setError(data.error || 'Código incorrecto');
        onError?.();
      }
    } catch (e) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const reenviarCodigo = async (onSuccess) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono }),
      });
      if (response.ok) {
        setTiempoRestante(300);
        onSuccess?.();
      } else {
        setError('No pude reenviar el código');
      }
    } catch (e) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return { telefono, loading, error, tiempoRestante, verificar, reenviarCodigo };
}

export function formatearTiempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}:${seg.toString().padStart(2, '0')}`;
}

export function formatearTelefono(tel) {
  if (!tel) return '';
  return '+' + tel.slice(0, 2) + ' ' + tel.slice(2, 5) + ' ' + tel.slice(5, 8) + ' ' + tel.slice(8);
}
