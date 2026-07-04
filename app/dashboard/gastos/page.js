'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconArrowUp, IconArrowDown, IconTrendingUp,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

const formatCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const formatCOPCorto = (n) => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'k';
  return '$' + Math.round(n);
};

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

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
    return dias;
  }, [gastos]);

  const maxValor = Math.max(...dataPorDia.map((d) => d.total), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-32 mt-4">
      {dataPorDia.map((d, i) => {
        const altura = Math.max((d.total / maxValor) * 100, 6);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t-lg"
                style={{
                  height: `${altura}%`,
                  background: d.esHoy ? '#C4E938' : '#242424',
                  minHeight: '6px',
                  transition: 'all 0.3s ease',
                }}
              />
            </div>
            <div
              className={`text-[11px] font-medium`}
              style={{ color: d.esHoy ? '#C4E938' : '#71717A' }}
            >
              {d.dia}
            </div>
          </div>
        );
      })}
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
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-[10px]"
            style={{ background: 'rgba(196, 233, 56, 0.15)' }}
          >
            <IconTrendingUp size={12} color="#C4E938" />
            <span className="text-[11px] font-bold" style={{ color: '#C4E938' }}>
              esta semana
            </span>
          </div>
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