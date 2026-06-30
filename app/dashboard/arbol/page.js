'use client';

import { useEffect, useState } from 'react';

export default function ArbolPage() {
  const [arbol, setArbol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarArbol();
  }, []);

  const cargarArbol = async () => {
    try {
      const r = await fetch('/api/dashboard/arbol');
      if (r.ok) {
        const data = await r.json();
        setArbol(data.arbol);
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
        <h1 style={{ fontSize: '2rem', margin: 0, color: '#1a1a1a' }}>
          🌳 Árbol de Vida
        </h1>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>
          Estructura de tu vida organizada por ramas
        </p>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>Cargando...</p>
      ) : !arbol || arbol.total === 0 ? (
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#999'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌱</div>
          <h2 style={{ color: '#1a1a1a' }}>Tu árbol está creciendo</h2>
          <p>A medida que le cuentes cosas a Du Life, tu árbol se irá llenando con personas, lugares, proyectos y más.</p>
        </div>
      ) : (
        <>
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <div style={{ color: '#666', fontSize: '0.85rem' }}>Total nodos</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
                  {arbol.total}
                </div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '0.85rem' }}>Ramas activas</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#51cf66' }}>
                  {Object.keys(arbol.ramas || {}).length}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}>
            {Object.entries(arbol.ramas || {})
              .sort((a, b) => (a[1].orden || 99) - (b[1].orden || 99))
              .map(([nombreRama, datos]) => (
                <Rama key={nombreRama} nombre={nombreRama} datos={datos} />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function Rama({ nombre, datos }) {
  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      borderTop: `4px solid ${datos.color || '#667eea'}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{datos.icono || '📌'}</span>
        <h2 style={{ 
          margin: 0, 
          fontSize: '1.1rem', 
          color: '#1a1a1a',
          textTransform: 'capitalize'
        }}>
          {nombre}
        </h2>
        <span style={{
          marginLeft: 'auto',
          background: '#f0f0f0',
          color: '#666',
          padding: '0.2rem 0.6rem',
          borderRadius: '12px',
          fontSize: '0.8rem'
        }}>
          {datos.entidades?.length || 0}
        </span>
      </div>
      
      {datos.entidades && datos.entidades.length > 0 ? (
        <div>
          {datos.entidades.slice(0, 8).map((e, i) => (
            <div key={i} style={{
              padding: '0.5rem 0',
              borderBottom: i < datos.entidades.length - 1 ? '1px solid #f5f5f5' : 'none',
              fontSize: '0.9rem'
            }}>
              <div style={{ color: '#1a1a1a' }}>
                {e.nombre || 'Sin nombre'}
              </div>
              {e.descripcion && (
                <div style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                  {e.descripcion.substring(0, 60)}
                  {e.descripcion.length > 60 ? '...' : ''}
                </div>
              )}
            </div>
          ))}
          {datos.entidades.length > 8 && (
            <div style={{
              padding: '0.5rem 0',
              color: '#999',
              fontSize: '0.85rem',
              fontStyle: 'italic'
            }}>
              ... y {datos.entidades.length - 8} más
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: '#bbb', fontSize: '0.9rem' }}>Vacía</p>
      )}
    </div>
  );
}