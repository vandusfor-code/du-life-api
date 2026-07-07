'use client';

import { useEffect, useState } from 'react';
import { IconClock } from '@tabler/icons-react';

function timeAgo(fechaISO) {
  if (!fechaISO) return null;
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace segundos';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas}h`;
  return `hace ${Math.floor(horas / 24)}d`;
}

export default function CronJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/admin_cron_jobs')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setJobs(data.jobs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Cron Jobs</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Jobs asíncronos reales del sistema (QStash) y cuándo corrieron por última vez.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        {loading ? (
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Cargando...</div>
        ) : (
          jobs.map((j, i) => (
            <div key={j.id} className="flex items-start gap-3 px-4 py-4">
              <IconClock size={16} color="var(--accent)" style={{ marginTop: '2px' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{j.nombre}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {timeAgo(j.ultima_ejecucion) || 'sin marcador en la BD'}
                  </span>
                </div>
                <div className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>{j.descripcion}</div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{j.disparador}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
