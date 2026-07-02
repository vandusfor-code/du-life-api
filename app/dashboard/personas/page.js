'use client';

import { useEffect, useState } from 'react';

export default function PersonasPage() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/personas')
      .then(r => r.json())
      .then(data => {
        setPersonas(data.personas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="px-5 pt-4">
      <div className="mb-4">
        <div className="text-[19px] font-bold tracking-tight">Personas</div>
        <div className="text-[13px] text-muted">{personas.length} contactos</div>
      </div>

      {loading ? (
        <div className="text-muted text-center py-8">Cargando...</div>
      ) : personas.length === 0 ? (
        <div className="bg-white rounded-card p-8 shadow-card text-center text-muted text-[13px]">
          Aún no hay personas registradas.
        </div>
      ) : (
        <div className="bg-white rounded-card px-4 shadow-card">
          {personas.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 py-3.5 ${i < personas.length - 1 ? 'border-b border-hairline' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-hairline flex items-center justify-center flex-shrink-0 text-[15px] font-bold text-ink">
                {(p.nombre || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-bold text-ink">{p.nombre}</div>
                {p.descripcion && (
                  <div className="text-[12px] text-soft mt-0.5">{p.descripcion}</div>
                )}
              </div>
              <div className="text-[11px] text-soft">
                {p.veces_mencionada || 0}×
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}