'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconCoins, IconReceipt2, IconTrendingUp, IconPackage,
  IconBriefcase, IconUsers,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';
import { GraficoBarras, formatCOP } from '../InicioMobile';
import { emojiParaProducto } from '../../../lib/emojiProductos';

const LIMA = '#C4E938';

function timeAgo(fechaISO) {
  if (!fechaISO) return '';
  const dias = Math.floor((Date.now() - new Date(fechaISO).getTime()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias}d`;
}

function TarjetaMetrica({ icon: Icon, label, valor, chart }) {
  return (
    <div className="rounded-3xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', minHeight: '128px' }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,233,56,0.14)' }}>
          <Icon size={16} color={LIMA} strokeWidth={1.8} />
        </div>
        <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <div className="text-[18px] font-black tracking-tight mt-3 truncate" style={{ color: 'var(--text-primary)' }}>{valor}</div>
      {chart && <div className="mt-2">{chart}</div>}
    </div>
  );
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
        <div className="rounded-3xl h-[150px] animate-pulse bg-surface" />
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="rounded-3xl h-[128px] animate-pulse bg-surface" />)}
        </div>
      </div>
    );
  }

  const { nombre_negocio, contadores, tendencia_7_dias, producto_mas_vendido, cliente_mas_importante } = dashboard;
  const serieUltimos6 = tendencia_7_dias.map((d) => d.total).slice(-6);

  return (
    <div className="px-5 pt-4 pb-32 bg-page min-h-screen">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/espacios" className="w-10 h-10 rounded-full flex items-center justify-center bg-surface border border-hairline">
          <IconArrowLeft size={18} color="var(--text-primary)" />
        </Link>
        <div>
          <div className="text-[13px] text-muted">Modo negocio</div>
          <div className="text-[19px] font-bold tracking-tight text-ink">{nombre_negocio || 'Negocio'}</div>
        </div>
      </div>

      {/* Hero — ventas del mes, con el mismo resplandor lima que el resto de la app */}
      <div
        className="relative rounded-3xl overflow-hidden p-5"
        style={{ background: 'radial-gradient(120% 140% at 88% 20%, rgba(196,233,56,0.14) 0%, var(--bg-card) 55%)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(196,233,56,0.16)' }}>
            <IconBriefcase size={14} color={LIMA} />
          </div>
          <span className="text-[12.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Ventas del mes</span>
        </div>
        <div className="text-[30px] font-black tracking-tight mt-2" style={{ color: LIMA }}>{formatCOP(contadores.ventas_mes)}</div>
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold mt-2"
          style={{ background: 'rgba(196,233,56,0.14)', color: LIMA }}
        >
          {contadores.numero_ventas_mes} venta{contadores.numero_ventas_mes === 1 ? '' : 's'} · ticket {formatCOP(contadores.ticket_promedio)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <TarjetaMetrica
          icon={IconCoins}
          label="Ventas hoy"
          valor={formatCOP(contadores.ventas_hoy)}
          chart={<GraficoBarras valores={serieUltimos6} color={LIMA} alto={30} />}
        />
        <TarjetaMetrica icon={IconTrendingUp} label="Esta semana" valor={formatCOP(contadores.ventas_semana)} />
        <TarjetaMetrica icon={IconPackage} label="Top producto" valor={producto_mas_vendido || 'Sin datos'} />
        <TarjetaMetrica icon={IconUsers} label="Top cliente" valor={cliente_mas_importante || 'Sin datos'} />
      </div>

      <div className="mt-6">
        <div className="text-[17px] font-bold tracking-tight text-ink mb-2">Ventas recientes</div>
        {ventas.length === 0 ? (
          <div className="rounded-3xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <IconReceipt2 size={26} strokeWidth={1.5} color="var(--text-secondary)" style={{ margin: '0 auto 8px' }} />
            <div className="text-[13px] font-semibold text-ink">Cuéntale tu primera venta</div>
            <div className="text-[12px] text-muted mt-1">Escríbele a Du Life por WhatsApp cuando vendas algo.</div>
          </div>
        ) : (
          <div className="rounded-3xl px-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            {ventas.slice(0, 8).map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-2 py-3">
                <div
                  className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0 text-[16px]"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                >
                  {emojiParaProducto(v.producto)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-ink truncate">{v.producto}</div>
                  <div className="text-[11.5px] text-soft mt-0.5 truncate">
                    {v.clientes_negocio?.nombre ? `${v.clientes_negocio.nombre} · ` : ''}{timeAgo(v.fecha)}
                  </div>
                </div>
                <div className="text-[14px] font-black flex-shrink-0" style={{ color: LIMA }}>{formatCOP(v.valor_total)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
