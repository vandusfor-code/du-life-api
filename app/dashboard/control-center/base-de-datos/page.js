'use client';

import { useEffect, useState } from 'react';
import { IconDatabase, IconAlertCircle } from '@tabler/icons-react';

export default function BaseDeDatosPage() {
  const [tablas, setTablas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/admin_base_de_datos')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setTablas(data.tablas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalFilas = tablas.reduce((s, t) => s + (t.filas || 0), 0);
  const maxFilas = Math.max(1, ...tablas.map((t) => t.filas || 0));

  return (
    <div className="p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Base de datos</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Conteo real de filas por tabla en Supabase.
          </p>
        </div>
        {!loading && (
          <div className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {totalFilas.toLocaleString('es-CO')} filas en total
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {tablas.map((t) => (
            <div key={t.tabla} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <IconDatabase size={14} color="var(--text-secondary)" />
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t.tabla}</span>
                </div>
                {t.error && <IconAlertCircle size={14} color="#F87171" />}
              </div>
              {t.error ? (
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No disponible</div>
              ) : (
                <>
                  <div className="text-[22px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {t.filas.toLocaleString('es-CO')}
                  </div>
                  <div className="mt-2 h-1.5 rounded-full" style={{ background: 'var(--border-color)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${(t.filas / maxFilas) * 100}%`, background: 'var(--accent)' }} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
