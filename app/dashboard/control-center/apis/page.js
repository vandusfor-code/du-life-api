'use client';

import { useEffect, useState } from 'react';
import { IconCircleCheck, IconCircleX } from '@tabler/icons-react';

function timeAgo(fechaISO) {
  if (!fechaISO) return 'sin actividad registrada';
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace segundos';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas}h`;
  return `hace ${Math.floor(horas / 24)}d`;
}

export default function ApisPage() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/admin_apis')
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
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>APIs</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Qué integraciones externas están configuradas — nunca se muestran los valores, solo si existen.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        {datos.servicios.map((s, i) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3.5" style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : 'none' }}>
            <div className="flex items-center gap-3">
              {s.configurado ? <IconCircleCheck size={18} color="var(--cc-success)" /> : <IconCircleX size={18} color="var(--cc-danger)" />}
              <div>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{s.nombre}</div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {s.variables.map((v) => `${v.nombre}: ${v.configurada ? '✓' : '✗'}`).join(' · ')}
                </div>
              </div>
            </div>
            {(s.id === 'claude' || s.id === 'whatsapp') && (
              <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {timeAgo(s.id === 'claude' ? datos.ultima_actividad.claude : datos.ultima_actividad.meta)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
