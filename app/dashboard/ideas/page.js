'use client';

import { useEffect, useState } from 'react';

export default function IdeasPage() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      const r = await fetch('/api/dashboard/ideas');
      if (r.ok) {
        const data = await r.json();
        setIdeas(data.ideas || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar por categoría
  const grupos = {};
  ideas.forEach(idea => {
    const cat = idea.categoria || 'general';
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(idea);
  });

  const colores = ['#667eea', '#51cf66', '#ff6b6b', '#ffd43b', '#a78bfa', '#fb7185'];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0, color: '#1a1a1a' }}>💡 Ideas</h1>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>
          {ideas.length} ideas guardadas
        </p>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>Cargando...</p>
      ) : ideas.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#999'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💡</div>
          <p>No hay ideas guardadas.</p>
          <p style={{ fontSize: '0.9rem' }}>
            Cuéntale a Du Life "tengo una idea..." y aparecerán aquí.
          </p>
        </div>
      ) : (
        <>
          {Object.entries(grupos).map(([categoria, lista], idx) => (
            <div key={categoria} style={{ marginBottom: '2rem' }}>
              <h2 style={{ 
                fontSize: '1.1rem', 
                color: '#1a1a1a',
                marginBottom: '1rem',
                textTransform: 'capitalize'
              }}>
                {categoria} ({lista.length})
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem'
              }}>
                {lista.map((idea, i) => {
                  const color = colores[(idx + i) % colores.length];
                  return (
                    <div key={i} style={{
                      background: 'white',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      borderTop: `4px solid ${color}`
                    }}>
                      {idea.titulo && (
                        <h3 style={{ 
                          margin: 0, 
                          fontSize: '1rem', 
                          color: '#1a1a1a', 
                          marginBottom: '0.5rem' 
                        }}>
                          {idea.titulo}
                        </h3>
                      )}
                      <p style={{ 
                        color: '#555', 
                        fontSize: '0.9rem',
                        margin: 0,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {idea.descripcion}
                      </p>
                      <div style={{ 
                        marginTop: '0.75rem', 
                        fontSize: '0.75rem', 
                        color: '#999'
                      }}>
                        {new Date(idea.creado_en).toLocaleDateString('es-CO')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}