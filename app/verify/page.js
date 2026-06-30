'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const [codigo, setCodigo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tiempoRestante, setTiempoRestante] = useState(300); // 5 minutos
  const router = useRouter();

  useEffect(() => {
    // Recuperar teléfono del sessionStorage
    const tel = sessionStorage.getItem('login_telefono');
    if (!tel) {
      router.push('/login');
      return;
    }
    setTelefono(tel);
    
    // Cronómetro
    const interval = setInterval(() => {
      setTiempoRestante(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [router]);

  const formatearTiempo = (segundos) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg.toString().padStart(2, '0')}`;
  };

  const formatearTelefono = (tel) => {
    if (!tel) return '';
    return '+' + tel.slice(0, 2) + ' ' + tel.slice(2, 5) + ' ' + tel.slice(5, 8) + ' ' + tel.slice(8);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (codigo.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, codigo })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        sessionStorage.removeItem('login_telefono');
        router.push('/dashboard');
      } else {
        setError(data.error || 'Código incorrecto');
      }
    } catch (e) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const reenviarCodigo = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono })
      });
      
      if (response.ok) {
        setTiempoRestante(300);
        setError('');
        alert('Código reenviado a tu WhatsApp');
      } else {
        setError('No pude reenviar el código');
      }
    } catch (e) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        padding: '2.5rem',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '420px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', margin: 0, color: '#1a1a1a' }}>
            🔐 Verificación
          </h1>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>
            Ingresa el código que te enviamos a
          </p>
          <p style={{ color: '#1a1a1a', fontWeight: '500', marginTop: '0.25rem' }}>
            {formatearTelefono(telefono)}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
            Código de 6 dígitos
          </label>
          
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            maxLength={6}
            inputMode="numeric"
            autoFocus
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '2rem',
              textAlign: 'center',
              letterSpacing: '0.5rem',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              marginBottom: '1rem',
              outline: 'none',
              fontFamily: 'monospace',
              boxSizing: 'border-box'
            }}
          />

          {error && (
            <div style={{
              background: '#fee',
              color: '#c00',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || codigo.length !== 6}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading || codigo.length !== 6 ? '#999' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: loading || codigo.length !== 6 ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Verificando...' : 'Verificar y entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          {tiempoRestante > 0 ? (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>
              El código vence en <strong>{formatearTiempo(tiempoRestante)}</strong>
            </p>
          ) : (
            <button
              onClick={reenviarCodigo}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textDecoration: 'underline'
              }}
            >
              Reenviar código
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a href="/login" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Cambiar número
          </a>
        </div>
      </div>
    </main>
  );
}