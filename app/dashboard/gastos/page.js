'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconArrowUp, IconArrowDown, IconChevronRight,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

const formatCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const formatCOPCorto = (n) => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'k';
  return '$' + Math.round(n);
};
const formatEje = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

function calcularEscala(maxValor) {
  if (!maxValor || maxValor <= 0) return { step: 100, niceMax: 300 };
  const rawStep = maxValor / 3;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / magnitude;
  let niceNorm;
  if (norm <= 1) niceNorm = 1;
  else if (norm <= 2) niceNorm = 2;
  else if (norm <= 5) niceNorm = 5;
  else niceNorm = 10;
  const step = niceNorm * magnitude;
  return { step, niceMax: step * 3 };
}

function formatFechaGrupo(fecha) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dt = new Date(fecha + 'T12:00:00');
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  if (dt.toDateString() === hoy.toDateString()) return 'Hoy';
  if (dt.toDateString() === ayer.toDateString()) return 'Ayer';
  const diff = Math.floor((hoy - dt) / (1000 * 60 * 60 * 24));
  if (diff < 7) return dt.toLocaleDateString('es-CO', { weekday: 'long' });
  return dt.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

const BarChart = memo(function BarChart({ gastos }) {
  const dataPorDia = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      const fechaStr = d.toISOString().split('T')[0];
      const totalDia = gastos
        .filter((g) => g.fecha === fechaStr)
        .reduce((sum, g) => sum + Number(g.monto), 0);
      dias.push({
        fecha: fechaStr,
        dia: DIAS_SEMANA[d.getDay()],
        total: totalDia,
        esHoy: i === 0,
      });
    }
    return dias.map((d, idx) => {
      if (idx === 0) return { ...d, variacion: null };
      const anterior = dias[idx - 1].total;
      if (!anterior) return { ...d, variacion: null };
      return { ...d, variacion: ((d.total - anterior) / anterior) * 100 };
    });
  }, [gastos]);

  const maxValor = Math.max(...dataPorDia.map((d) => d.total), 0);
  const { niceMax } = calcularEscala(maxValor);
  const gridSteps = [0, niceMax / 3, (niceMax / 3) * 2, niceMax];

  const W = 340;
  const H = 200;
  const leftPad = 30;
  const rightPad = 4;
  const topPad = 24;
  const bottomPad = 24;
  const plotW = W - leftPad - rightPad;
  const plotH = H - topPad - bottomPad;
  const slotW = plotW / dataPorDia.length;
  const barW = slotW * 0.4;

  const puntos = dataPorDia.map((d, i) => {
    const x = leftPad + i * slotW + slotW / 2;
    const alturaPx = niceMax > 0 ? (d.total / niceMax) * plotH : 0;
    const y = topPad + plotH - alturaPx;
    return { ...d, x, y, alturaPx };
  });

  const trendPathD = puntos
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div className="mt-4" style={{ height: '200px' }}>
      <style>{`
        @keyframes bar-grow {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        @keyframes trend-draw {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes dot-pop {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .bar-rect {
          transform-box: fill-box;
          transform-origin: bottom;
          animation: bar-grow 0.6s ease-out forwards;
        }
        .trend-line {
          animation: trend-draw 1s ease-out forwards;
        }
        .trend-dot {
          transform-box: fill-box;
          transform-origin: center;
          animation: dot-pop 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', maxWidth: '100%' }}
      >
        {/* Grid horizontal + escala Y */}
        {gridSteps.map((v, i) => {
          const y = topPad + plotH - (niceMax > 0 ? (v / niceMax) * plotH : 0);
          return (
            <g key={i}>
              <line
                x1={leftPad}
                y1={y}
                x2={W - rightPad}
                y2={y}
                stroke="#242424"
                strokeOpacity="0.3"
                strokeWidth="1"
              />
              <text x={leftPad - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#71717A">
                {formatEje(v)}
              </text>
            </g>
          );
        })}

        {/* Barras */}
        {puntos.map((p, i) => (
          <g key={p.fecha}>
            <defs>
              <clipPath id={`barclip-${i}`}>
                <rect x={p.x - barW / 2} y={topPad} width={barW} height={plotH} />
              </clipPath>
            </defs>
            <rect
              className="bar-rect"
              x={p.x - barW / 2}
              y={p.y}
              width={barW}
              height={p.alturaPx + 6}
              rx="4"
              ry="4"
              clipPath={`url(#barclip-${i})`}
              fill={p.esHoy ? '#C4E938' : '#242424'}
              style={{
                animationDelay: `${i * 0.05}s`,
                filter: p.esHoy ? 'drop-shadow(0 0 6px rgba(196,233,56,0.6))' : 'none',
              }}
            />
            {/* % variación */}
            <text
              x={p.x}
              y={Math.max(12, p.y - 8)}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill={p.variacion === null ? '#71717A' : p.variacion >= 0 ? '#C4E938' : '#F87171'}
            >
              {p.variacion === null ? '—' : `${p.variacion >= 0 ? '+' : ''}${p.variacion.toFixed(1)}%`}
            </text>
            {/* Label día */}
            <text
              x={p.x}
              y={topPad + plotH + 18}
              textAnchor="middle"
              fontSize="11"
              fontWeight={p.esHoy ? 'bold' : '500'}
              fill={p.esHoy ? '#C4E938' : '#A1A1AA'}
            >
              {p.dia}
            </text>
          </g>
        ))}

        {/* Línea de tendencia */}
        <path
          className="trend-line"
          d={trendPathD}
          fill="none"
          stroke="#C4E938"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          pathLength="100"
        />

        {/* Puntos de intersección */}
        {puntos.map((p, i) => (
          <circle
            key={`dot-${p.fecha}`}
            className="trend-dot"
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#C4E938"
            style={{
              animationDelay: `${0.3 + i * 0.08}s`,
              filter: 'drop-shadow(0 0 4px rgba(196,233,56,0.8))',
            }}
          />
        ))}
      </svg>
    </div>
  );
});

export default function GastosPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // 'todos' | 'gastos' | 'ingresos'

  const cargarDatos = useCallback(() => {
    fetch('/api/dashboard/gastos')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  const { movimientos, agrupados, totalGastosSemana } = useMemo(() => {
    if (!data) return { movimientos: [], agrupados: {}, totalGastosSemana: 0 };

    const gastos = (data.gastos || []).map((g) => ({ ...g, tipo: 'gasto' }));
    const ingresos = (data.ingresos || []).map((i) => ({ ...i, tipo: 'ingreso' }));

    let movs = [];
    if (filtro === 'todos') movs = [...gastos, ...ingresos];
    if (filtro === 'gastos') movs = gastos;
    if (filtro === 'ingresos') movs = ingresos;

    movs.sort((a, b) => {
      const dtA = new Date(a.fecha + 'T' + (a.hora || '00:00:00'));
      const dtB = new Date(b.fecha + 'T' + (b.hora || '00:00:00'));
      return dtB - dtA;
    });

    const grupos = {};
    movs.forEach((m) => {
      const grupo = formatFechaGrupo(m.fecha);
      if (!grupos[grupo]) grupos[grupo] = [];
      grupos[grupo].push(m);
    });

    const hace7dias = new Date();
    hace7dias.setDate(hace7dias.getDate() - 7);
    const totalSemana = gastos
      .filter((g) => new Date(g.fecha) >= hace7dias)
      .reduce((sum, g) => sum + Number(g.monto), 0);

    return { movimientos: movs, agrupados: grupos, totalGastosSemana: totalSemana };
  }, [data, filtro]);

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: '#1A1A1A' }} />
          <div>
            <div className="h-3 w-20 rounded animate-pulse mb-1.5" style={{ background: '#1A1A1A' }} />
            <div className="h-5 w-16 rounded animate-pulse" style={{ background: '#1A1A1A' }} />
          </div>
        </div>
        <div className="rounded-hero h-[220px] animate-pulse" style={{ background: '#1A1A1A' }} />
        <div className="grid grid-cols-2 gap-3 mt-3.5">
          <div className="rounded-card h-[100px] animate-pulse" style={{ background: '#1A1A1A' }} />
          <div className="rounded-card h-[100px] animate-pulse" style={{ background: '#1A1A1A' }} />
        </div>
        <div className="rounded-card h-[200px] mt-5 animate-pulse" style={{ background: '#1A1A1A' }} />
      </div>
    );
  }

  const resumen = data?.resumen || { total_gastos: 0, total_ingresos: 0, balance: 0 };

  return (
    <div className="px-5 pt-4 pb-32">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <IconArrowLeft size={18} color="#fff" />
        </Link>
        <div>
          <div className="text-[13px] text-muted">Movimientos</div>
          <div className="text-[19px] font-bold tracking-tight text-white">Gastos</div>
        </div>
      </div>

      {/* Bar chart card */}
      <div
        className="rounded-hero p-5"
        style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[12px] text-muted uppercase tracking-wide font-medium">
              Últimos 7 días
            </div>
            <div className="text-[28px] font-bold tracking-tight mt-1 text-white">
              {formatCOP(totalGastosSemana)}
            </div>
          </div>
          <button className="flex items-center gap-0.5 text-[13px] font-medium text-muted">
            Ver todo
            <IconChevronRight size={14} color="#A1A1AA" />
          </button>
        </div>

        <BarChart gastos={data?.gastos || []} />
      </div>

      {/* Stats mini */}
      <div className="grid grid-cols-2 gap-3 mt-3.5">
        <div
          className="rounded-card p-3.5"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <div
            className="w-[32px] h-[32px] rounded-[10px] flex items-center justify-center"
            style={{ background: 'rgba(196, 233, 56, 0.15)' }}
          >
            <IconArrowUp size={16} color="#C4E938" />
          </div>
          <div className="text-[12px] text-muted mt-3">Ingresos mes</div>
          <div className="text-[18px] font-bold tracking-tight mt-0.5 text-white">
            {formatCOPCorto(Number(resumen.total_ingresos) || 0)}
          </div>
        </div>
        <div
          className="rounded-card p-3.5"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <div
            className="w-[32px] h-[32px] rounded-[10px] flex items-center justify-center"
            style={{ background: '#242424' }}
          >
            <IconArrowDown size={16} color="#A1A1AA" />
          </div>
          <div className="text-[12px] text-muted mt-3">Gastos mes</div>
          <div className="text-[18px] font-bold tracking-tight mt-0.5 text-white">
            {formatCOPCorto(Number(resumen.total_gastos) || 0)}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mt-6">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'gastos', label: 'Gastos' },
          { id: 'ingresos', label: 'Ingresos' },
        ].map((f) => {
          const active = filtro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className="flex-1 py-2.5 rounded-full text-[13px] font-bold transition-all"
              style={{
                background: active ? '#C4E938' : '#1A1A1A',
                color: active ? '#0A0A0A' : '#A1A1AA',
                border: active ? 'none' : '1px solid #2A2A2A',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Lista agrupada */}
      {Object.keys(agrupados).length === 0 ? (
        <div
          className="rounded-card p-8 mt-5 text-center text-muted text-[13px]"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          Sin movimientos para mostrar.
        </div>
      ) : (
        <div className="mt-5">
          {Object.entries(agrupados).map(([grupo, movs]) => (
            <div key={grupo} className="mb-5">
              <div className="text-[12px] text-muted uppercase tracking-wide font-medium mb-2 capitalize">
                {grupo}
              </div>
              <div
                className="rounded-card px-4"
                style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
              >
                {movs.map((m, i) => {
                  const esIngreso = m.tipo === 'ingreso';
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 py-3.5"
                      style={{
                        borderBottom: i < movs.length - 1 ? '1px solid #242424' : 'none',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: esIngreso ? 'rgba(196, 233, 56, 0.15)' : '#242424',
                        }}
                      >
                        {esIngreso ? (
                          <IconArrowUp size={16} color="#C4E938" />
                        ) : (
                          <IconArrowDown size={16} color="#A1A1AA" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-[14px] font-bold text-white">
                          {m.descripcion || (esIngreso ? 'Ingreso' : 'Gasto')}
                        </div>
                        <div className="text-[12px] text-soft mt-0.5">
                          {m.lugar || m.fuente || (esIngreso ? 'Ingreso' : 'Efectivo')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-[15px] font-bold"
                          style={{ color: esIngreso ? '#C4E938' : '#fff' }}
                        >
                          {esIngreso ? '+' : '−'}
                          {formatCOP(Number(m.monto))}
                        </div>
                        <div className="text-[11px] text-soft mt-0.5 capitalize">
                          {m.metodo_pago || m.moneda}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}