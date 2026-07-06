'use client';

import { useEffect, useState } from 'react';
import {
  IconArrowRight, IconFileCode, IconServer2, IconTable, IconX,
} from '@tabler/icons-react';

// Mapa de la arquitectura real (primera versión funcional): flujo lineal
// de nodos clickeables. No es una librería de diagramas de terceros —
// solo cajas conectadas con flechas, con un panel de detalle que muestra
// datos reales del repo (archivos, servicios, tablas) por nodo.
export default function ArquitecturaViva() {
  const [nodos, setNodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard/admin_arquitectura')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setNodos(data.nodos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const nodo = nodos.find((n) => n.id === seleccionado);

  return (
    <div className="p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Arquitectura Viva
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Click en cualquier nodo para ver archivos, tablas y servicios reales.
        </p>
      </div>

      {loading ? (
        <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
      ) : (
        <div className="flex flex-wrap items-center gap-1 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {nodos.map((n, i) => (
            <div key={n.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSeleccionado(n.id)}
                className="px-4 py-3 rounded-xl text-[13px] font-semibold transition-colors whitespace-nowrap"
                style={{
                  background: seleccionado === n.id ? 'var(--accent)' : 'var(--bg-card-hover)',
                  color: seleccionado === n.id ? 'var(--accent-text)' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {n.nombre}
              </button>
              {i < nodos.length - 1 && <IconArrowRight size={16} color="var(--text-muted)" />}
            </div>
          ))}
        </div>
      )}

      {nodo && (
        <div className="rounded-2xl p-5 relative" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => setSeleccionado(null)}
            className="absolute top-4 right-4"
          >
            <IconX size={16} color="var(--text-secondary)" />
          </button>
          <div className="text-[16px] font-bold" style={{ color: 'var(--accent)' }}>{nodo.nombre}</div>
          <div className="text-[13px] mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>{nodo.descripcion}</div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                <IconFileCode size={13} /> Archivos
              </div>
              {nodo.archivos.length === 0 ? (
                <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</div>
              ) : (
                nodo.archivos.map((a) => (
                  <div key={a} className="text-[12px] font-mono mb-1" style={{ color: 'var(--text-primary)' }}>{a}</div>
                ))
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                <IconServer2 size={13} /> Servicios
              </div>
              {nodo.servicios.length === 0 ? (
                <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</div>
              ) : (
                nodo.servicios.map((s) => (
                  <div key={s} className="text-[12px] mb-1" style={{ color: 'var(--text-primary)' }}>{s}</div>
                ))
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                <IconTable size={13} /> Tablas
              </div>
              {nodo.tablas.length === 0 ? (
                <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</div>
              ) : (
                nodo.tablas.map((t) => (
                  <div key={t} className="text-[12px] font-mono mb-1" style={{ color: 'var(--text-primary)' }}>{t}</div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
