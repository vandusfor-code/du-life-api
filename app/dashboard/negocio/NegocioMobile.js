'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconCoins, IconReceipt2, IconTrendingUp, IconPackage,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

const formatCOP = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');

function timeAgo(fechaISO) {
  if (!fechaISO) return '';
  const dias = Math.floor((Date.now() - new Date(fechaISO).getTime()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias}d`;
}

export default function NegocioMobile() {
  const [dashboard, setDashboard] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard/negocio').then((r) => r.json()),
      fetch('/api/dashboard/negocio?vista=historial').then((r) => r.json()),
    ])
      .then(([d, h]) => {
        if (!d.error) setDashboard(d);
        if (!h.error) setVentas(h.ventas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  if (loading || !dashboard) {
    return (
      <div className="px-5 pt-4 pb-32 bg-page min-h-screen">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full animate-pulse bg-surface" />
          <div className="h-6 w-32 rounded animate-pulse bg-surface" />
        </div>
        <div className="rounded-2xl h-[220px] animate-pulse bg-surface" />
      </div>
    );
  }

  const { contadores, top_productos, producto_mas_vendido } = dashboard;

  return (
    <div className="px-5 pt-4 pb-32 bg-page min-h-screen">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/espacios" className="w-10 h-10 rounded-full flex items-center justify-center bg-surface border border-hairline">
          <IconArrowLeft size={18} color="var(--text-primary)" />
        </Link>
        <div>
          <div className="text-[13px] text-muted">Modo negocio</div>
          <div className="text-[19px] font-bold tracking-tight text-ink">Negocio</div>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="text-[12px] text-muted">Ventas de hoy</div>
        <div className="text-[28px] font-bold text-ink tracking-tight mt-0.5">{formatCOP(contadores.ventas_hoy)}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <IconCoins size={16} color="var(--accent)" />
          <div className="text-[11px] text-muted mt-2">Esta semana</div>
          <div className="text-[16px] font-bold text-ink mt-0.5">{formatCOP(contadores.ventas_semana)}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <IconTrendingUp size={16} color="var(--accent)" />
          <div className="text-[11px] text-muted mt-2">Este mes</div>
          <div className="text-[16px] font-bold text-ink mt-0.5">{formatCOP(contadores.ventas_mes)}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <IconReceipt2 size={16} color="var(--accent)" />
          <div className="text-[11px] text-muted mt-2">Ticket promedio</div>
          <div className="text-[16px] font-bold text-ink mt-0.5">{formatCOP(contadores.ticket_promedio)}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <IconPackage size={16} color="var(--accent)" />
          <div className="text-[11px] text-muted mt-2">Producto estrella</div>
          <div className="text-[13px] font-bold text-ink mt-0.5 truncate">{producto_mas_vendido || 'Sin datos'}</div>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[17px] font-bold tracking-tight text-ink mb-2">Ventas recientes</div>
        {ventas.length === 0 ? (
          <div className="text-center text-muted text-[13px] py-8">Cuéntale a Du Life tu primera venta por WhatsApp.</div>
        ) : (
          <div className="rounded-2xl px-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            {ventas.slice(0, 8).map((v) => (
              <div key={v.id} className="flex items-center justify-between py-3.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-ink truncate">{v.producto}</div>
                  <div className="text-[11px] text-soft mt-0.5">
                    {v.clientes_negocio?.nombre ? `${v.clientes_negocio.nombre} · ` : ''}{timeAgo(v.fecha)}
                  </div>
                </div>
                <div className="text-[14px] font-bold flex-shrink-0" style={{ color: 'var(--accent)' }}>{formatCOP(v.valor_total)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
