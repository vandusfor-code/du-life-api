'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  IconCoins, IconReceipt2, IconTrendingUp, IconUsers, IconPackage,
  IconArrowUpRight, IconBriefcase,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';
import { useTheme } from '../../../components/ThemeProvider';
import { GraficoAreaLinea, GraficoBarras, formatCOP } from '../InicioMobile';

function timeAgo(fechaISO) {
  if (!fechaISO) return '';
  const dias = Math.floor((Date.now() - new Date(fechaISO).getTime()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias}d`;
}

function Tarjeta({ children, className = '', style = {} }) {
  return (
    <div
      className={`rounded-2xl p-5 border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-200 ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', ...style }}
    >
      {children}
    </div>
  );
}

function Chip({ icon: Icon, children }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border shadow-[var(--shadow-sm)]"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
    >
      {Icon && <Icon size={13} color="var(--text-secondary)" />}
      {children}
    </div>
  );
}

function EncabezadoSeccion({ titulo }) {
  return (
    <div className="mb-3">
      <span className="text-[12px] font-black uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
        {titulo}
      </span>
    </div>
  );
}

// Ranking de productos con barras de progreso proporcionales al valor
// vendido — mismo espíritu que las mini-gráficas de Inicio, sin depender
// de una librería de charts genérica para algo que es, en el fondo, una
// lista ordenada.
function RankingProductos({ datos, color }) {
  const max = Math.max(...datos.map((d) => d.total), 1);
  return (
    <div className="flex flex-col gap-3.5">
      {datos.map((d, i) => (
        <div key={d.producto}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                style={{ background: i === 0 ? 'var(--accent-bg)' : 'var(--bg-primary)', color: i === 0 ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {i + 1}
              </span>
              <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{d.producto}</span>
            </div>
            <span className="text-[12.5px] font-bold flex-shrink-0 ml-2" style={{ color: 'var(--text-secondary)' }}>{formatCOP(d.total)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(4, (d.total / max) * 100)}%`, background: color, opacity: i === 0 ? 1 : 0.55 - i * 0.06 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NegocioDesktop() {
  const { theme } = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const ACCENT = theme === 'light' ? '#027A48' : '#C4E938';
  const ACCENT_RGB = theme === 'light' ? '2, 122, 72' : '196, 233, 56';

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
      <div className="p-8 flex flex-col gap-6">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-3xl h-[200px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-3xl h-[130px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      </div>
    );
  }

  const { contadores, tendencia_7_dias, top_productos, producto_mas_vendido, cliente_mas_importante } = dashboard;
  const serieTendencia = tendencia_7_dias.map((d) => d.total);
  const serieUltimos6 = serieTendencia.slice(-6);

  return (
    <div className="p-8 flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-[28px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Negocio</h1>
        <p className="text-[13px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>
          Todo lo que le cuentas a Du Life por WhatsApp sobre tus ventas, en un solo lugar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip icon={IconReceipt2}>{contadores.numero_ventas_mes} ventas este mes</Chip>
        {producto_mas_vendido && <Chip icon={IconPackage}>Estrella: {producto_mas_vendido}</Chip>}
        {cliente_mas_importante && <Chip icon={IconUsers}>Top: {cliente_mas_importante}</Chip>}
      </div>

      {/* Hero — ventas del mes, con el mismo resplandor que el Balance general de Inicio */}
      <Tarjeta
        style={{
          background: `radial-gradient(120% 140% at 85% 0%, rgba(${ACCENT_RGB}, 0.16) 0%, rgba(${ACCENT_RGB}, 0.04) 45%, var(--bg-card) 75%)`,
        }}
      >
        <div className="grid grid-cols-[minmax(0,240px)_1fr] gap-6 items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
                <IconBriefcase size={14} color={ACCENT} />
              </div>
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Ventas del mes</span>
            </div>
            <div className="font-black tracking-tight leading-tight mt-1 text-[32px] md:text-[36px] antialiased" style={{ color: ACCENT }}>
              {formatCOP(contadores.ventas_mes)}
            </div>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-semibold mt-3"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
            >
              {contadores.numero_ventas_mes} venta{contadores.numero_ventas_mes === 1 ? '' : 's'} · ticket prom. {formatCOP(contadores.ticket_promedio)}
            </span>
          </div>
          <GraficoAreaLinea valores={serieTendencia} color={ACCENT} alto={140} conEje />
        </div>
      </Tarjeta>

      {/* Ventas hoy / semana / ticket / N° ventas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta>
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Ventas hoy</div>
            <IconCoins size={16} color="var(--text-secondary)" />
          </div>
          <div className="text-[20px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            {formatCOP(contadores.ventas_hoy)}
          </div>
          <div className="mt-3"><GraficoBarras valores={serieUltimos6} color={ACCENT} alto={40} /></div>
        </Tarjeta>

        <Tarjeta>
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Ventas semana</div>
            <IconTrendingUp size={16} color="var(--text-secondary)" />
          </div>
          <div className="text-[20px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            {formatCOP(contadores.ventas_semana)}
          </div>
          <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>desde el lunes</div>
        </Tarjeta>

        <Tarjeta>
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Ticket promedio</div>
            <IconReceipt2 size={16} color="var(--text-secondary)" />
          </div>
          <div className="text-[20px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            {formatCOP(contadores.ticket_promedio)}
          </div>
          <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>por venta, este mes</div>
        </Tarjeta>

        <Tarjeta>
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Cliente más importante</div>
            <IconUsers size={16} color="var(--text-secondary)" />
          </div>
          <div className="text-[18px] font-black tracking-tight mt-1 truncate" style={{ color: 'var(--text-primary)' }}>
            {cliente_mas_importante || 'Sin datos'}
          </div>
          <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>por valor comprado este mes</div>
        </Tarjeta>
      </div>

      {/* Top productos */}
      <section>
        <EncabezadoSeccion titulo="Productos más vendidos" />
        <Tarjeta>
          {top_productos.length === 0 ? (
            <div className="py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>Sin ventas todavía este mes.</div>
          ) : (
            <RankingProductos datos={top_productos} color={ACCENT} />
          )}
        </Tarjeta>
      </section>

      {/* Historial */}
      <section>
        <EncabezadoSeccion titulo="Historial de ventas" />
        {ventas.length === 0 ? (
          <Tarjeta className="flex flex-col items-center text-center gap-1 py-10">
            <IconReceipt2 size={26} strokeWidth={1.5} color="var(--text-secondary)" />
            <div className="text-[13px] font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>Todavía no hay ventas</div>
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Cuéntale tu primera venta a Du Life por WhatsApp.</div>
          </Tarjeta>
        ) : (
          <Tarjeta className="!p-2">
            {ventas.slice(0, 15).map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-3 py-3">
                <div
                  className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                >
                  <IconReceipt2 size={16} strokeWidth={1.6} color="var(--text-primary)" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{v.producto}</div>
                  <div className="text-[12px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {v.clientes_negocio?.nombre || 'Sin cliente'} · {new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <div className="text-[14px] font-black flex-shrink-0" style={{ color: ACCENT }}>{formatCOP(v.valor_total)}</div>
              </div>
            ))}
          </Tarjeta>
        )}
      </section>

      {/* Clientes */}
      <section>
        <EncabezadoSeccion titulo="Clientes" />
        {clientes.length === 0 ? (
          <Tarjeta className="flex flex-col items-center text-center gap-1 py-10">
            <IconUsers size={26} strokeWidth={1.5} color="var(--text-secondary)" />
            <div className="text-[13px] font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>Sin clientes todavía</div>
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Cuando le vendas a alguien y menciones su nombre, aparece aquí solo.</div>
          </Tarjeta>
        ) : (
          <Tarjeta className="!p-2">
            {clientes.slice(0, 10).map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-black"
                  style={{ background: 'var(--accent-bg)', color: ACCENT }}
                >
                  {c.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{c.nombre}</div>
                  <div className="text-[12px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {c.numero_compras} compra{c.numero_compras === 1 ? '' : 's'} · última {timeAgo(c.ultima_compra)}
                  </div>
                </div>
                <div className="text-[14px] font-black flex-shrink-0 flex items-center gap-1" style={{ color: ACCENT }}>
                  <IconArrowUpRight size={13} color={ACCENT} />
                  {formatCOP(c.total_comprado)}
                </div>
              </div>
            ))}
          </Tarjeta>
        )}
      </section>
    </div>
  );
}
