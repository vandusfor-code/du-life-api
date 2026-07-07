'use client';

import { useEffect, useState } from 'react';
import { IconApps } from '@tabler/icons-react';

export default function ModulosPage() {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/admin_modulos')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setModulos(data.modulos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const max = Math.max(1, ...modulos.map((m) => m.usos));

  return (
    <div className="p-8 flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Módulos</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Funcionalidades de Du Life y cuánto se usa cada una (registros reales, todos los usuarios).
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        {loading ? (
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Cargando...</div>
        ) : (
          modulos.map((m, i) => (
            <div key={m.id} className="flex items-center gap-4 px-4 py-3.5">
              <IconApps size={16} color="var(--text-secondary)" />
              <span className="text-[13px] font-semibold w-32 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{m.nombre}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--border-color)' }}>
                <div className="h-2 rounded-full" style={{ width: `${(m.usos / max) * 100}%`, background: 'var(--accent)' }} />
              </div>
              <span className="text-[12px] w-16 text-right flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{m.usos.toLocaleString('es-CO')}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
