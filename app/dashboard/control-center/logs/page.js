'use client';

import { useEffect, useState } from 'react';
import {
  IconMessageCircle, IconSend, IconUserPlus, IconCoins, IconBellRinging, IconWallet,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../../components/useAutoRefresh';

function timeAgo(fechaISO) {
  if (!fechaISO) return '—';
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace segundos';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas}h`;
  return `hace ${Math.floor(horas / 24)}d`;
}

const ICONO_EVENTO = {
  mensaje_entrante: IconMessageCircle,
  mensaje_saliente: IconSend,
  usuario_nuevo: IconUserPlus,
  prestamo: IconCoins,
  recordatorio: IconBellRinging,
  gasto: IconWallet,
};

export default function LogsPage() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    fetch('/api/dashboard/admin_logs')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setEventos(data.eventos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);
  useAutoRefresh(cargar, 10000);

  return (
    <div className="p-8 flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Logs</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Actividad reciente real del sistema. Para logs de errores del servidor (excepciones, stack traces), revisa el dashboard de Vercel — no se capturan acá.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        {loading ? (
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Cargando...</div>
        ) : eventos.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Sin actividad todavía.</div>
        ) : (
          eventos.map((e, i) => {
            const Icon = ICONO_EVENTO[e.tipo] || IconMessageCircle;
            return (
              <div key={`${e.tipo}-${e.fecha}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <Icon size={16} color="var(--accent)" />
                <span className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>{e.texto}</span>
                <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(e.fecha)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
