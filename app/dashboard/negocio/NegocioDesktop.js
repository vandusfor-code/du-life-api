'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  IconCoins, IconCalendarStats, IconReceipt2, IconTrendingUp, IconUsers,
  IconChartBar, IconPackage,
} from '@tabler/icons-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

const formatCOP = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
const PALETA = ['#C4E938', '#7DD3FC', '#F59E0B', '#A78BFA', '#F87171', '#55555F'];

function timeAgo(fechaISO) {
  if (!fechaISO) return '';
  const dias = Math.floor((Date.now() - new Date(fechaISO).getTime()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias}d`;
}

function MetricCard({ icon: Icon, label, valor, nota }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
          <Icon size={15} color="var(--accent)" />
        </div>
      </div>
      <div className="text-[26px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{valor}</div>
      {nota && <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{nota}</div>}
    </div>
  );
}

function TendenciaVentas({ datos }) {
  const data = datos.map((d) => ({
    dia: new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short' }),
    total: d.total,
  }));

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Ventas de los últimos 7 días</div>
      <div className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>Total vendido por día</div>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="dia" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
            <Tooltip
              formatter={(v) => formatCOP(v)}
              contentStyle={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--text-primary)' }}
              cursor={{ fill: 'var(--accent-bg)' }}
            />
            <Bar dataKey="total" fill="#C4E938" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopProductos({ datos }) {
  const total = datos.reduce((s, d) => s + d.total, 0);

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Productos más vendidos</div>
      <div className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>Este mes, por valor vendido</div>

      {total === 0 ? (
        <div className="h-[160px] flex items-center justify-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Sin ventas todavía este mes.
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div style={{ width: 130, height: 130, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={datos} dataKey="total" nameKey="producto" innerRadius={34} outerRadius={58} paddingAngle={2} strokeWidth={0}>
                  {datos.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {datos.map((d, i) => {
              const pct = Math.round((d.total / total) * 100);
              return (
                <div key={d.producto} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PALETA[i % PALETA.length] }} />
                  <span className="text-[12px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{d.producto}</span>
                  <span className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TablaHistorial({ ventas }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="px-5 pt-4 pb-3 text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>Historial de ventas</div>
      {ventas.length === 0 ? (
        <div className="px-5 pb-5 text-[12px]" style={{ color: 'var(--text-muted)' }}>Sin ventas registradas todavía.</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr style={{ borderTop: '1px solid var(--border-color)' }}>
              <th className="text-left px-5 py-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Fecha</th>
              <th className="text-left px-5 py-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Cliente</th>
              <th className="text-left px-5 py-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Producto</th>
              <th className="text-right px-5 py-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {ventas.slice(0, 15).map((v) => (
              <tr key={v.id}>
                <td className="px-5 py-2.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                </td>
                <td className="px-5 py-2.5 text-[13px]" style={{ color: 'var(--text-primary)' }}>
                  {v.clientes_negocio?.nombre || '—'}
                </td>
                <td className="px-5 py-2.5 text-[13px]" style={{ color: 'var(--text-primary)' }}>{v.producto}</td>
                <td className="px-5 py-2.5 text-[13px] font-bold text-right" style={{ color: 'var(--accent)' }}>{formatCOP(v.valor_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TablaClientes({ clientes }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="px-5 pt-4 pb-3 text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>Clientes</div>
      {clientes.length === 0 ? (
        <div className="px-5 pb-5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Cuando le vendas a alguien y menciones su nombre, aparece aquí automáticamente.
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr style={{ borderTop: '1px solid var(--border-color)' }}>
              <th className="text-left px-5 py-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Nombre</th>
              <th className="text-right px-5 py-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Compras</th>
              <th className="text-right px-5 py-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Total comprado</th>
              <th className="text-right px-5 py-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Última compra</th>
            </tr>
          </thead>
          <tbody>
            {clientes.slice(0, 10).map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-2.5 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.nombre}</td>
                <td className="px-5 py-2.5 text-[13px] text-right" style={{ color: 'var(--text-secondary)' }}>{c.numero_compras}</td>
                <td className="px-5 py-2.5 text-[13px] font-bold text-right" style={{ color: 'var(--accent)' }}>{formatCOP(c.total_comprado)}</td>
                <td className="px-5 py-2.5 text-[12px] text-right" style={{ color: 'var(--text-secondary)' }}>{timeAgo(c.ultima_compra)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function NegocioDesktop() {
  const [dashboard, setDashboard] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard/negocio').then((r) => r.json()),
      fetch('/api/dashboard/negocio?vista=historial').then((r) => r.json()),
      fetch('/api/dashboard/negocio?vista=clientes').then((r) => r.json()),
    ])
      .then(([d, h, c]) => {
        if (!d.error) setDashboard(d);
        if (!h.error) setVentas(h.ventas || []);
        if (!c.error) setClientes(c.clientes || []);
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
      <div className="p-8">
        <div className="h-8 w-48 rounded animate-pulse mb-6" style={{ background: 'var(--bg-card)' }} />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      </div>
    );
  }

  const { contadores, tendencia_7_dias, top_productos, producto_mas_vendido, cliente_mas_importante } = dashboard;

  return (
    <div className="p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Negocio</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Todo lo que le cuentas a Du Life por WhatsApp sobre tus ventas, en un solo lugar.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard icon={IconCoins} label="Ventas hoy" valor={formatCOP(contadores.ventas_hoy)} />
        <MetricCard icon={IconCalendarStats} label="Ventas semana" valor={formatCOP(contadores.ventas_semana)} />
        <MetricCard icon={IconTrendingUp} label="Ventas mes" valor={formatCOP(contadores.ventas_mes)} nota={`${contadores.numero_ventas_mes} ventas`} />
        <MetricCard icon={IconReceipt2} label="Ticket promedio" valor={formatCOP(contadores.ticket_promedio)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard icon={IconPackage} label="Producto más vendido" valor={producto_mas_vendido || 'Sin datos'} />
        <MetricCard icon={IconUsers} label="Cliente más importante" valor={cliente_mas_importante || 'Sin datos'} />
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '3fr 2fr' }}>
        <TendenciaVentas datos={tendencia_7_dias} />
        <TopProductos datos={top_productos} />
      </div>

      <TablaHistorial ventas={ventas} />
      <TablaClientes clientes={clientes} />
    </div>
  );
}
