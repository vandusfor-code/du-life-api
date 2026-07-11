'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconArrowUp, IconArrowDown, IconChevronRight, IconWallet,
  IconPlus, IconX,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';
import LogoComercio from '../../../components/LogoComercio';

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

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

function construirSemana() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diaSemana = hoy.getDay(); // 0=domingo .. 6=sábado
  const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + offsetLunes);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return {
      fechaStr: d.toISOString().split('T')[0],
      dia: DIAS_SEMANA[i],
      numero: d.getDate(),
      esHoy: d.toDateString() === hoy.toDateString(),
    };
  });
}

function formatFechaLarga(fechaStr) {
  const d = new Date(fechaStr + 'T12:00:00');
  const s = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const BarChart = memo(function BarChart({ gastos, semana, fechaSeleccionada, onSelectDia }) {
  const dataPorDia = useMemo(() => {
    const dias = semana.map((s) => ({
      fechaStr: s.fechaStr,
      dia: s.dia,
      total: gastos.filter((g) => g.fecha === s.fechaStr).reduce((sum, g) => sum + Number(g.monto), 0),
      esSeleccionado: s.fechaStr === fechaSeleccionada,
    }));
    return dias.map((d, idx) => {
      if (idx === 0) return { ...d, variacion: null };
      const anterior = dias[idx - 1].total;
      if (!anterior) return { ...d, variacion: null };
      return { ...d, variacion: ((d.total - anterior) / anterior) * 100 };
    });
  }, [gastos, semana, fechaSeleccionada]);

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
              <text x={leftPad - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-secondary)">
                {formatEje(v)}
              </text>
            </g>
          );
        })}

        {/* Barras (tocables: seleccionan el día) */}
        {puntos.map((p, i) => (
          <g key={p.fechaStr} onClick={() => onSelectDia(p.fechaStr)} style={{ cursor: 'pointer' }}>
            <defs>
              <clipPath id={`barclip-${i}`}>
                <rect x={p.x - barW / 2} y={topPad} width={barW} height={plotH} />
              </clipPath>
            </defs>
            {/* Área táctil ampliada, invisible */}
            <rect x={p.x - slotW / 2} y={0} width={slotW} height={H} fill="transparent" />
            <rect
              className="bar-rect"
              x={p.x - barW / 2}
              y={p.y}
              width={barW}
              height={p.alturaPx + 6}
              rx="4"
              ry="4"
              clipPath={`url(#barclip-${i})`}
              fill={p.esSeleccionado ? '#C4E938' : '#242424'}
              style={{
                animationDelay: `${i * 0.05}s`,
                filter: p.esSeleccionado ? 'drop-shadow(0 0 6px rgba(196,233,56,0.6))' : 'none',
              }}
            />
            {/* % variación */}
            <text
              x={p.x}
              y={Math.max(12, p.y - 8)}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill={p.variacion === null ? 'var(--text-secondary)' : p.variacion >= 0 ? '#C4E938' : '#F87171'}
            >
              {p.variacion === null ? '—' : `${p.variacion >= 0 ? '+' : ''}${p.variacion.toFixed(1)}%`}
            </text>
            {/* Label día */}
            <text
              x={p.x}
              y={topPad + plotH + 18}
              textAnchor="middle"
              fontSize="11"
              fontWeight={p.esSeleccionado ? 'bold' : '500'}
              fill={p.esSeleccionado ? '#C4E938' : 'var(--text-secondary)'}
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
            key={`dot-${p.fechaStr}`}
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

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'tarjeta_debito', label: 'Tarjeta débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
  { value: 'transferencia', label: 'Transferencia' },
];

const inputEstilo = { background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' };

function HojaFondo({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="fixed left-0 right-0 bottom-0 max-w-app mx-auto"
        style={{ background: 'var(--bg-card)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="px-5 pt-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[16px] font-bold text-ink">{titulo}</div>
            <button type="button" onClick={onClose}>
              <IconX size={20} color="var(--text-secondary)" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function FormAgregarGasto({ onClose, onGuardado }) {
  const hoy = new Date().toISOString().split('T')[0];
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lugar, setLugar] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [fecha, setFecha] = useState(hoy);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    const m = Number(monto);
    if (!m || m <= 0) {
      setError('Escribe un monto válido');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const r = await fetch('/api/dashboard/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: m,
          descripcion: descripcion.trim() || null,
          lugar: lugar.trim() || null,
          metodo_pago: metodoPago,
          fecha,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo guardar');
      onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <HojaFondo titulo="Agregar gasto" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          type="number"
          inputMode="decimal"
          placeholder="Monto"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none"
          style={inputEstilo}
          autoFocus
        />
        <input
          type="text"
          placeholder="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none"
          style={inputEstilo}
        />
        <input
          type="text"
          placeholder="Lugar (opcional)"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none"
          style={inputEstilo}
        />
        <select
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none"
          style={inputEstilo}
        >
          {METODOS_PAGO.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none"
          style={inputEstilo}
        />
      </div>

      {error && <div className="text-[12px] mt-2" style={{ color: '#F87171' }}>{error}</div>}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[14px] mt-5"
        style={{ background: '#C4E938', color: '#0A0A0A', opacity: guardando ? 0.6 : 1 }}
      >
        {guardando ? 'Guardando...' : 'Guardar gasto'}
      </button>
    </HojaFondo>
  );
}

function FormEditarIngreso({ ingreso, onClose, onGuardado }) {
  const [monto, setMonto] = useState(String(ingreso.monto));
  const [descripcion, setDescripcion] = useState(ingreso.descripcion || '');
  const [fuente, setFuente] = useState(ingreso.fuente || '');
  const [fecha, setFecha] = useState(ingreso.fecha);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    const m = Number(monto);
    if (!m || m <= 0) {
      setError('Escribe un monto válido');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const r = await fetch(`/api/dashboard/gastos?id=${ingreso.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: m,
          descripcion: descripcion.trim() || null,
          fuente: fuente.trim() || 'otro',
          fecha,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo guardar');
      onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <HojaFondo titulo="Editar ingreso" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          type="number"
          inputMode="decimal"
          placeholder="Monto"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none"
          style={inputEstilo}
          autoFocus
        />
        <input
          type="text"
          placeholder="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none"
          style={inputEstilo}
        />
        <input
          type="text"
          placeholder="Fuente (ej. salario, freelance)"
          value={fuente}
          onChange={(e) => setFuente(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none"
          style={inputEstilo}
        />
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none"
          style={inputEstilo}
        />
      </div>

      {error && <div className="text-[12px] mt-2" style={{ color: '#F87171' }}>{error}</div>}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[14px] mt-5"
        style={{ background: '#C4E938', color: '#0A0A0A', opacity: guardando ? 0.6 : 1 }}
      >
        {guardando ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </HojaFondo>
  );
}

export default function GastosPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // 'todos' | 'gastos' | 'ingresos'
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [mostrarFormGasto, setMostrarFormGasto] = useState(false);
  const [ingresoEditando, setIngresoEditando] = useState(null);

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

  const semana = useMemo(() => construirSemana(), []);
  const diaActivo = fechaSeleccionada ?? semana.find((d) => d.esHoy)?.fechaStr;

  const { movimientosDia, totalGastosSemana } = useMemo(() => {
    if (!data) return { movimientosDia: [], totalGastosSemana: 0 };

    const gastos = (data.gastos || []).map((g) => ({ ...g, tipo: 'gasto' }));
    const ingresos = (data.ingresos || []).map((i) => ({ ...i, tipo: 'ingreso' }));

    let movs;
    if (filtro === 'ingresos') {
      // Los ingresos son esporádicos (ej. un salario al mes): en vez de
      // filtrarlos por el día puntual del calendario, se muestran todos
      // los del mes en curso para que la lista no aparezca vacía.
      const hoy = new Date();
      const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
      movs = ingresos.filter((m) => m.fecha >= inicioMes);
    } else {
      const base = filtro === 'gastos' ? gastos : [...gastos, ...ingresos];
      movs = base.filter((m) => m.fecha === diaActivo);
    }
    movs.sort((a, b) => `${b.fecha}${b.hora || ''}`.localeCompare(`${a.fecha}${a.hora || ''}`));

    const inicioSemana = new Date(semana[0].fechaStr + 'T00:00:00');
    const totalSemana = gastos
      .filter((g) => new Date(g.fecha + 'T00:00:00') >= inicioSemana)
      .reduce((sum, g) => sum + Number(g.monto), 0);

    return { movimientosDia: movs, totalGastosSemana: totalSemana };
  }, [data, filtro, diaActivo, semana]);

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32 bg-page min-h-screen lg:max-w-4xl lg:mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full animate-pulse bg-surface" />
          <div>
            <div className="h-3 w-20 rounded animate-pulse mb-1.5 bg-surface" />
            <div className="h-5 w-16 rounded animate-pulse bg-surface" />
          </div>
        </div>
        <div className="h-16 rounded-2xl animate-pulse mb-5 bg-surface" />
        <div className="rounded-2xl h-[260px] animate-pulse bg-surface" />
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="h-16 rounded animate-pulse bg-surface" />
          <div className="h-16 rounded animate-pulse bg-surface" />
        </div>
        <div className="rounded-2xl h-[200px] mt-5 animate-pulse bg-surface" />
      </div>
    );
  }

  const resumen = data?.resumen || { total_gastos: 0, total_ingresos: 0, balance: 0 };

  return (
    <div className="px-5 pt-4 pb-32 bg-page min-h-screen lg:max-w-4xl lg:mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface border border-hairline"
        >
          <IconArrowLeft size={18} color="var(--text-primary)" />
        </Link>
        <div>
          <div className="text-[13px] text-muted">Movimientos</div>
          <div className="text-[19px] font-bold tracking-tight text-ink">Gastos</div>
        </div>
      </div>

      {/* Calendario horizontal (mismo componente que Home) */}
      <div className="flex justify-between gap-1 mb-5">
        {semana.map((d) => {
          const activo = d.fechaStr === diaActivo;
          return (
            <button
              key={d.fechaStr}
              onClick={() => setFechaSeleccionada(d.fechaStr)}
              className="flex flex-col items-center gap-1.5 flex-1 py-1"
            >
              <span className="text-[11px] text-muted">{d.dia}</span>
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
                style={{
                  background: activo ? '#C4E938' : 'transparent',
                  color: activo ? '#000' : 'var(--text-secondary)',
                }}
              >
                {d.numero}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bar chart card */}
      <div className="rounded-2xl p-5 bg-surface border border-hairline">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[12px] text-muted uppercase tracking-wide font-medium">
              Esta semana
            </div>
            <div className="text-[28px] font-bold tracking-tight mt-1 text-ink">
              {formatCOP(totalGastosSemana)}
            </div>
          </div>
          <Link href="/dashboard/timeline" prefetch className="flex items-center gap-0.5 text-[13px] font-medium text-muted">
            Ver todo
            <IconChevronRight size={14} color="var(--text-secondary)" />
          </Link>
        </div>

        <BarChart
          gastos={data?.gastos || []}
          semana={semana}
          fechaSeleccionada={diaActivo}
          onSelectDia={setFechaSeleccionada}
        />
      </div>

      {/* Stats — flotando, sin cards */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <div>
          <IconArrowUp size={18} color="#C4E938" />
          <div className="text-[12px] text-muted mt-2">Ingresos mes</div>
          <div className="text-[20px] font-bold tracking-tight mt-0.5 text-ink">
            {formatCOPCorto(Number(resumen.total_ingresos) || 0)}
          </div>
        </div>
        <div>
          <IconArrowDown size={18} color="var(--text-secondary)" />
          <div className="text-[12px] text-muted mt-2">Gastos mes</div>
          <div className="text-[20px] font-bold tracking-tight mt-0.5 text-ink">
            {formatCOPCorto(Number(resumen.total_gastos) || 0)}
          </div>
        </div>
      </div>

      {/* Filtros por tipo */}
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
                background: active ? '#C4E938' : 'transparent',
                color: active ? '#0A0A0A' : 'var(--text-secondary)',
                border: active ? 'none' : '1px solid var(--border-color)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Feed de movimientos del día seleccionado — plano, sin cajas */}
      <div className="mt-6">
        <div className="text-[17px] font-bold tracking-tight text-ink">Movimientos</div>
        <div className="text-[12px] text-muted mt-0.5 mb-2 capitalize">
          {filtro === 'ingresos' ? 'Este mes' : formatFechaLarga(diaActivo)}
        </div>

        {movimientosDia.length === 0 ? (
          <div className="text-center text-muted text-[13px] py-8">
            Sin movimientos {filtro === 'ingresos' ? 'este mes' : 'este día'}.
          </div>
        ) : (
          <div>
            {movimientosDia.map((m, i) => {
              const esIngreso = m.tipo === 'ingreso';
              return (
                <div
                  key={m.id}
                  onClick={esIngreso ? () => setIngresoEditando(m) : undefined}
                  className="flex items-center justify-between py-4"
                  style={esIngreso ? { cursor: 'pointer' } : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <LogoComercio
                      texto={m.lugar || m.fuente || m.descripcion}
                      iconoFallback={
                        esIngreso
                          ? <IconArrowUp size={16} color="#C4E938" />
                          : <IconWallet size={16} color="var(--text-secondary)" />
                      }
                    />
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-ink truncate">
                        {m.descripcion || (esIngreso ? 'Ingreso' : 'Gasto')}
                      </div>
                      <div className="text-[12px] text-muted mt-0.5">
                        {m.lugar || m.fuente || (esIngreso ? 'Ingreso' : 'Efectivo')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <div
                      className="text-[15px] font-bold"
                      style={{ color: esIngreso ? '#C4E938' : 'var(--text-primary)' }}
                    >
                      {esIngreso ? '+' : '−'}
                      {formatCOP(Number(m.monto))}
                    </div>
                    {esIngreso && <IconChevronRight size={16} color="var(--text-secondary)" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setMostrarFormGasto(true)}
        className="fixed flex items-center justify-center rounded-full"
        style={{
          bottom: '104px',
          right: '20px',
          width: '56px',
          height: '56px',
          background: '#C4E938',
          boxShadow: '0 8px 20px rgba(196,233,56,0.4)',
          zIndex: 40,
        }}
        aria-label="Agregar gasto"
      >
        <IconPlus size={26} color="#0A0A0A" />
      </button>

      {mostrarFormGasto && (
        <FormAgregarGasto
          onClose={() => setMostrarFormGasto(false)}
          onGuardado={() => {
            setMostrarFormGasto(false);
            cargarDatos();
          }}
        />
      )}

      {ingresoEditando && (
        <FormEditarIngreso
          ingreso={ingresoEditando}
          onClose={() => setIngresoEditando(null)}
          onGuardado={() => {
            setIngresoEditando(null);
            cargarDatos();
          }}
        />
      )}
    </div>
  );
}
