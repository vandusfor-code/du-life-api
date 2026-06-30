'use client';

import { useEffect, useState } from 'react';

export default function TareasPage() {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendientes');

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      const r = await fetch('/api/dashboard/tareas');
      if (r.ok) {
        const data = await r.json();
        setTareas(data.tareas || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTarea = async (id, completada) => {
    try {
      await fetch('/api/dashboard/tareas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completada: !completada })
      });
      cargar();
    } catch (e) {
      console.error(e);
    }
  };

  const tareasFiltradas = tareas.filter(t => {
    if (filtro === 'pendientes') return !t.completada;
    if (filtro === 'completadas') return t.completada;
    return true;
  });

  const colorPrioridad = (p) => {
    if (p === 'alta') return '#ff6b6b';
    if (p === 'media') return '#ffd43b';
    return '#51cf66';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0, color: '#1a1a1a' }}>✅ Tareas</h1>
          <p style={{ color: '#666', marginTop: '0.25rem' }}>
            {tareas.filter(t => !t.completada).length} pendientes • {tareas.filter(t => t.completada).length} completadas
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['pendientes', 'completadas', 'todas'].map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              style={{
                padding: '0.5rem 1rem',
                background: filtro === f ? '#667eea' : 'white',
                color: filtro === f ? 'white' : '#666',
                border: '1px solid ' + (filtro === f ? '#667eea' : '#ddd'),
                borderRadius: '6px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontSize: '0.9rem'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>Cargando...</p>
      ) : tareasFiltradas.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#999'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <p>No hay tareas {filtro === 'pendientes' ? 'pendientes' : filtro === 'completadas' ? 'completadas' : ''}.</p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          {tareasFiltradas.map((t, i) => (
            <div key={i} style={{
              padding: '1rem 1.5rem',
              borderBottom: i < tareasFiltradas.length - 1 ? '1px solid #f5f5f5' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <input
                type="checkbox"
                checked={t.completada}
                onChange={() => toggleTarea(t.id, t.completada)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              
              <div style={{ flex: 1 }}>
                <div style={{
                  textDecoration: t.completada ? 'line-through' : 'none',
                  color: t.completada ? '#999' : '#1a1a1a'
                }}>
                  {t.titulo}
                </div>
                {t.fecha_vencimiento && (
                  <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
                    📅 Vence: {t.fecha_vencimiento}
                  </div>
                )}
              </div>
              
              <span style={{
                background: colorPrioridad(t.prioridad),
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {t.prioridad || 'media'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}