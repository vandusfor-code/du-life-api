'use client';

import { useEffect, useState } from 'react';

export default function PersonasPage() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarPersonas();
  }, []);

  const cargarPersonas = async () => {
    try {
      const r = await fetch('/api/dashboard/personas');
      if (r.ok) {
        const data = await r.json();
        setPersonas(data.personas || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const personasFiltradas = personas.filter(p => 
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Agrupar por importancia
  const VIP = personasFiltradas.filter(p => p.importancia >= 8);
  const importantes = personasFiltradas.filter(p => p.importancia >= 5 && p.importancia < 8);
  const otras = personasFiltradas.filter(p => p.importancia < 5);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0, color: '#1a1a1a' }}>
          👥 Personas
        </h1>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>
          {personas.length} personas que conozco
        </p>
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="🔍 Buscar persona..."
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          fontSize: '1rem',
          border: '1px solid #ddd',
          borderRadius: '8px',
          marginBottom: '2rem',
          boxSizing: 'border-box'
        }}
      />

      {loading ? (
        <p style={{ color: '#999' }}>Cargando...</p>
      ) : personas.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#999'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
          <p>Aún no me has hablado de personas importantes.</p>
          <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
            Cuéntale a Du Life sobre tu familia, amigos, parejas y se irán agregando aquí.
          </p>
        </div>
      ) : (
        <>
          {VIP.length > 0 && (
            <SeccionPersonas titulo="⭐ Más importantes" personas={VIP} color="#ffd700" />
          )}
          {importantes.length > 0 && (
            <SeccionPersonas titulo="✨ Importantes" personas={importantes} color="#667eea" />
          )}
          {otras.length > 0 && (
            <SeccionPersonas titulo="👤 Otras personas" personas={otras} color="#999" />
          )}
        </>
      )}
    </div>
  );
}

function SeccionPersonas({ titulo, personas, color }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '1rem' }}>
        {titulo} ({personas.length})
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem'
      }}>
        {personas.map((p, i) => (
          <div key={i} style={{
            background: 'white',
            padding: '1.25rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            borderLeft: `4px solid ${color}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1a1a1a' }}>
                {p.nombre}
              </h3>
              <span style={{
                background: '#f0f0f0',
                padding: '0.2rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                color: '#666'
              }}>
                ⭐ {p.importancia}/10
              </span>
            </div>
            
            {p.descripcion && (
              <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                {p.descripcion}
              </p>
            )}
            
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#999' }}>
              💬 Mencionada {p.veces_mencionada || 0} {p.veces_mencionada === 1 ? 'vez' : 'veces'}
            </div>
            
            {p.atributos && Object.keys(p.atributos).length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                {Object.entries(p.atributos).slice(0, 3).map(([k, v], j) => (
                  <span key={j} style={{
                    display: 'inline-block',
                    background: '#f0f4ff',
                    color: '#667eea',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    marginRight: '0.25rem',
                    marginTop: '0.25rem'
                  }}>
                    {k}: {String(v).substring(0, 20)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}