'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Lógica compartida entre LoginMobile y LoginDesktop: mismo formulario,
// mismo endpoint, misma validación — solo cambia la presentación.
export function useLoginForm() {
  const [telefono, setTelefono] = useState('');
  const [pais, setPais] = useState('57');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const enviarCodigo = async () => {
    setError('');
    if (!telefono || telefono.length < 7) {
      setError('Ingresa un número válido');
      return;
    }
    setLoading(true);
    try {
      const telefonoCompleto = pais + telefono.replace(/\s/g, '');
      const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: telefonoCompleto, zona_horaria: zonaHoraria }),
      });
      const data = await response.json();
      if (response.ok) {
        sessionStorage.setItem('login_telefono', telefonoCompleto);
        router.push('/verify');
      } else {
        setError(data.error || 'Hubo un error. Intenta de nuevo.');
      }
    } catch (e) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return { telefono, setTelefono, pais, setPais, loading, error, enviarCodigo };
}
