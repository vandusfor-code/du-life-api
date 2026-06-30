'use client';

import { useEffect, useState } from 'react';

export default function NotasPage() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      const r = await fetch('/api/dashboard/notas');
      if (r.ok) {
        const data = await r.json();
        setNotas(data.notas || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0, color: '#1a1a1a' }}>📝 Notas</h1>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>
          {notas.length} notas guardadas
        </p>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>Cargando...</p>
      ) : notas.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#999'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
          <p>No hay notas guardadas.</p>
          <p style={{ fontSize: '0.9rem' }}>
            Dile a Du Life "anota..." o "guarda esto..." y aparecerán aquí.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1rem'
        }}>
          {notas.map((n, i) => (
            <div key={i} style={{
              background: 'white',
              padding: '1.25rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              borderLeft: '4px solid #ffd43b'
            }}>
              {n.titulo && (
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#1a1a1a', marginBottom: '0.5rem' }}>
                  {n.titulo}
                </h3>
              )}
              <p style={{ 
                color: '#555', 
                fontSize: '0.9rem',
                margin: 0,
                whiteSpace: 'pre-wrap'
              }}>
                {n.contenido}
              </p>
              <div style={{ 
                marginTop: '0.75rem', 
                fontSize: '0.75rem', 
                color: '#999'
              }}>
                {new Date(n.creado_en).toLocaleString('es-CO')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}