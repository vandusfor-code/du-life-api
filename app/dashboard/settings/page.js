'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  
  const [form, setForm] = useState({
    como_llamar: '',
    tratamiento: 'tu'
  });

  useEffect(() => {
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    try {
      const r = await fetch('/api/dashboard/usuario');
      if (r.ok) {
        const data = await r.json();
        setUsuario(data.usuario);
        setForm({
          como_llamar: data.usuario.como_llamar || data.usuario.nombre || '',
          tratamiento: data.usuario.tratamiento || 'tu'
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    
    try {
      const r = await fetch('/api/dashboard/usuario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (r.ok) {
        setMensaje('✅ Cambios guardados');
        cargarUsuario();
        setTimeout(() => setMensaje(''), 3000);
      } else {
        setMensaje('❌ Error al guardar');
      }
    } catch (e) {
      setMensaje('❌ Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Cargando...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0, color: '#1a1a1a' }}>⚙️ Ajustes</h1>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>
          Configura cómo Du Life se dirige a ti
        </p>
      </div>

      <div style={{ maxWidth: '600px' }}>
        {/* INFO DEL USUARIO */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.1rem', marginTop: 0, color: '#1a1a1a' }}>
            👤 Tu información
          </h2>
          
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: '#666', fontSize: '0.85rem' }}>Teléfono</div>
            <div style={{ color: '#1a1a1a', fontWeight: '500' }}>
              +{usuario?.telefono}
            </div>
          </div>
          
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: '#666', fontSize: '0.85rem' }}>País</div>
            <div style={{ color: '#1a1a1a', fontWeight: '500' }}>
              {usuario?.pais || 'No definido'}
            </div>
          </div>
          
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: '#666', fontSize: '0.85rem' }}>Plan</div>
            <div style={{ color: '#1a1a1a', fontWeight: '500', textTransform: 'capitalize' }}>
              {usuario?.plan || 'free'}
            </div>
          </div>
        </div>

        {/* PREFERENCIAS */}
        <form onSubmit={guardar} style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.1rem', marginTop: 0, color: '#1a1a1a' }}>
            ⚡ Preferencias
          </h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              ¿Cómo te llamo?
            </label>
            <input
              type="text"
              value={form.como_llamar}
              onChange={(e) => setForm({ ...form, como_llamar: e.target.value })}
              placeholder="Tu nombre o apodo"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              Tratamiento
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <label style={{
                flex: 1,
                padding: '0.75rem',
                border: '2px solid ' + (form.tratamiento === 'tu' ? '#667eea' : '#ddd'),
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                background: form.tratamiento === 'tu' ? '#f0f4ff' : 'white'
              }}>
                <input
                  type="radio"
                  value="tu"
                  checked={form.tratamiento === 'tu'}
                  onChange={(e) => setForm({ ...form, tratamiento: e.target.value })}
                  style={{ display: 'none' }}
                />
                Tú / Tus
              </label>
              <label style={{
                flex: 1,
                padding: '0.75rem',
                border: '2px solid ' + (form.tratamiento === 'usted' ? '#667eea' : '#ddd'),
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                background: form.tratamiento === 'usted' ? '#f0f4ff' : 'white'
              }}>
                <input
                  type="radio"
                  value="usted"
                  checked={form.tratamiento === 'usted'}
                  onChange={(e) => setForm({ ...form, tratamiento: e.target.value })}
                  style={{ display: 'none' }}
                />
                Usted / Sus
              </label>
            </div>
          </div>
          
          {mensaje && (
            <div style={{
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              background: mensaje.includes('✅') ? '#d3f9d8' : '#fee',
              color: mensaje.includes('✅') ? '#2b8a3e' : '#c00',
              fontSize: '0.9rem'
            }}>
              {mensaje}
            </div>
          )}
          
          <button
            type="submit"
            disabled={guardando}
            style={{
              padding: '0.75rem 2rem',
              background: guardando ? '#999' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: guardando ? 'not-allowed' : 'pointer'
            }}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>

        {/* ZONA DE PELIGRO */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #ffe3e3'
        }}>
          <h2 style={{ fontSize: '1.1rem', marginTop: 0, color: '#c92a2a' }}>
            ⚠️ Zona de peligro
          </h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Para eliminar tu cuenta o todos tus datos, escríbele a Du Life por WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}