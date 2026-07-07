'use client';

import { useEffect, useState } from 'react';
import { IconCircleCheck, IconCircleX } from '@tabler/icons-react';

export default function ConfiguracionPage() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/admin_configuracion')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setDatos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !datos) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 rounded animate-pulse mb-6" style={{ background: 'var(--bg-card)' }} />
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Configuración</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Solo lectura. Los valores sensibles nunca se muestran, solo si están configurados.
          </p>
        </div>
        <span
          className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-md"
          style={{ background: 'rgba(196,233,56,0.10)', color: 'var(--accent)' }}
        >
          {datos.entorno}
        </span>
      </div>

      <section>
        <div className="text-[12px] font-black uppercase mb-3" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          Valores actuales
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {datos.visibles.map((v, i) => (
            <div key={v.label} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : 'none' }}>
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{v.label}</span>
              <span className="text-[13px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{v.valor || 'no configurado'}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="text-[12px] font-black uppercase mb-3" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          Variables sensibles
        </div>
        <div className="rounded-2xl overflow-hidden grid grid-cols-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {datos.sensibles.map((s) => (
            <div key={s.nombre} className="flex items-center gap-2 px-4 py-2.5" style={{ borderTop: '1px solid var(--border-color)' }}>
              {s.configurada ? <IconCircleCheck size={14} color="var(--cc-success)" /> : <IconCircleX size={14} color="var(--cc-danger)" />}
              <span className="text-[12px] font-mono" style={{ color: 'var(--text-primary)' }}>{s.nombre}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
