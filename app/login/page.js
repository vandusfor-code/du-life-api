'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [telefono, setTelefono] = useState('');
  const [pais, setPais] = useState('57'); // Colombia por defecto
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validar
    if (!telefono || telefono.length < 7) {
      setError('Ingresa un número válido');
      return;
    }
    
    setLoading(true);
    
    try {
      const telefonoCompleto = pais + telefono.replace(/\s/g, '');
      
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: telefonoCompleto })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Guardar teléfono en sessionStorage para usar en verify
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
            🧠 Du Life
          </h1>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>
            Ingresa con tu WhatsApp
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
            Tu número de WhatsApp
          </label>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <select
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              style={{
                padding: '0.75rem',
                fontSize: '1rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="57">🇨🇴 +57</option>
              <option value="52">🇲🇽 +52</option>
              <option value="34">🇪🇸 +34</option>
              <option value="1">🇺🇸 +1</option>
              <option value="54">🇦🇷 +54</option>
              <option value="51">🇵🇪 +51</option>
              <option value="56">🇨🇱 +56</option>
            </select>
            
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="3001234567"
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '1rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                outline: 'none'
              }}
              maxLength={15}
            />
          </div>

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
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading ? '#999' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Enviando código...' : 'Enviar código'}
          </button>

          <p style={{
            textAlign: 'center',
            color: '#888',
            fontSize: '0.85rem',
            marginTop: '1.5rem'
          }}>
            Te enviaremos un código por WhatsApp para verificar tu número.
          </p>
        </form>
      </div>
    </main>
  );
}