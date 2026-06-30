'use client';

import { useEffect, useState } from 'react';

export default function GastosPage() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes');

  useEffect(() => {
    cargarGastos();
  }, [periodo]);

  const cargarGastos = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/dashboard/gastos?periodo=${periodo}`);
      if (r.ok) {
        const data = await r.json();
        setGastos(data.gastos || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatearMonto = (m) => Number(m || 0).toLocaleString('es-CO');
  const total = gastos.reduce((s, g) => s + Number(g.monto), 0);

  // Agrupar por categoría/descripción
  const grupos = {};
  gastos.forEach(g => {
    const cat = g.descripcion || 'Sin descripción';
    if (!grupos[cat]) grupos[cat] = { total: 0, count: 0 };
    grupos[cat].total += Number(g.monto);
    grupos[cat].count++;
  });
  
  const categoriasOrdenadas = Object.entries(grupos)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0, color: '#1a1a1a' }}>💸 Gastos</h1>
          <p style={{ color: '#666', marginTop: '0.25rem' }}>Tus registros de gastos</p>
        </div>
        
        {/* Filtros */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['hoy', 'semana', 'mes', 'año'].map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              style={{
                padding: '0.5rem 1rem',
                background: periodo === p ? '#667eea' : 'white',
                color: periodo === p ? 'white' : '#666',
                border: '1px solid ' + (periodo === p ? '#667eea' : '#ddd'),
                borderRadius: '6px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontSize: '0.9rem'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#666', fontSize: '0.85rem' }}>Total {periodo}</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff6b6b' }}>
              ${formatearMonto(total)}
            </div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: '0.85rem' }}>Movimientos</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1a1a1a' }}>
              {gastos.length}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem'
      }}>
        {/* Top categorías */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ fontSize: '1.1rem', marginTop: 0, color: '#1a1a1a' }}>
            🏆 Top 5 categorías
          </h2>
          {categoriasOrdenadas.length === 0 ? (
            <p style={{ color: '#999' }}>Sin datos</p>
          ) : (
            categoriasOrdenadas.map(([cat, datos], i) => {
              const pct = total > 0 ? (datos.total / total * 100).toFixed(1) : 0;
              return (
                <div key={i} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.9rem' }}>{cat}</span>
                    <strong>${formatearMonto(datos.total)}</strong>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '8px' }}>
                    <div style={{
                      background: '#667eea',
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: '4px',
                      transition: 'width 0.5s'
                    }} />
                  </div>
                  <small style={{ color: '#999' }}>{pct}% • {datos.count} movimientos</small>
                </div>
              );
            })
          )}
        </div>

        {/* Lista de gastos */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          maxHeight: '500px',
          overflowY: 'auto'
        }}>
          <h2 style={{ fontSize: '1.1rem', marginTop: 0, color: '#1a1a1a' }}>
            📋 Todos los movimientos
          </h2>
          {loading ? (
            <p style={{ color: '#999' }}>Cargando...</p>
          ) : gastos.length === 0 ? (
            <p style={{ color: '#999' }}>No hay gastos en este periodo</p>
          ) : (
            gastos.map((g, i) => (
              <div key={i} style={{
                padding: '0.75rem 0',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: '500' }}>{g.descripcion || 'Sin descripción'}</div>
                  <small style={{ color: '#999' }}>{g.fecha} • {g.metodo_pago || 'efectivo'}</small>
                </div>
                <strong style={{ color: '#ff6b6b' }}>${formatearMonto(g.monto)}</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}