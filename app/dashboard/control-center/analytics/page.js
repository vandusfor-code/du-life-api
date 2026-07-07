'use client';

import { useEffect, useState } from 'react';

function GraficoBarras14({ dias, valores, color }) {
  const max = Math.max(1, ...valores);
  return (
    <div className="flex items-end gap-1.5" style={{ height: '90px' }}>
      {dias.map((d, i) => {
        const alto = Math.max(2, (valores[i] / max) * 78);
        const fecha = new Date(`${d}T00:00:00`);
        const label = fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
        return (
          <div key={d} className="flex-1 flex flex-col items-center justify-end gap-1.5" title={`${label}: ${valores[i]}`}>
            <div className="w-full rounded-t-md" style={{ height: `${alto}px`, background: color, opacity: valores[i] === 0 ? 0.25 : 1 }} />
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{fecha.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

function TarjetaSerie({ titulo, total, dias, valores, color }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{titulo}</span>
        <span className="text-[20px] font-black" style={{ color: 'var(--text-primary)' }}>{total}</span>
      </div>
      <GraficoBarras14 dias={dias} valores={valores} color={color} />
    </div>
  );
}

export default function AnalyticsPage() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/admin_analytics')
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
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}
        </div>
      </div>
    );
  }

  const suma = (arr) => arr.reduce((s, n) => s + n, 0);

  return (
    <div className="p-8 flex flex-col gap-7">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Tendencias reales de los últimos 14 días.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <TarjetaSerie titulo="Usuarios nuevos" total={suma(datos.usuarios_nuevos)} dias={datos.dias} valores={datos.usuarios_nuevos} color="var(--accent)" />
        <TarjetaSerie titulo="Mensajes recibidos" total={suma(datos.mensajes)} dias={datos.dias} valores={datos.mensajes} color="var(--accent)" />
        <TarjetaSerie titulo="Gastos registrados" total={suma(datos.gastos)} dias={datos.dias} valores={datos.gastos} color="var(--accent)" />
      </div>
    </div>
  );
}
