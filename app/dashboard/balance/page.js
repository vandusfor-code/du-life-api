'use client';

import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import {
  IconBell, IconChevronDown, IconChevronRight,
  IconArrowUp, IconArrowDown, IconSparkles, IconWallet,
} from '@tabler/icons-react';
import Avatar from '../../../components/Avatar';
import ProfileSheet from '../../../components/ProfileSheet';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

const NOTIFICACIONES_MOCK = 3;

const formatCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const formatCOPCorto = (n) => {
  const abs = Math.abs(n);
  const signo = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return signo + '$' + (abs / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return signo + '$' + Math.round(abs / 1_000) + 'k';
  return signo + '$' + Math.round(abs);
};

function formatFechaActividad(fecha, hora) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dt = new Date(fecha + 'T12:00:00');
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  let dia;
  if (dt.toDateString() === hoy.toDateString()) dia = 'Hoy';
  else if (dt.toDateString() === ayer.toDateString()) dia = 'Ayer';
  else dia = dt.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

  if (!hora) return dia;
  const [h, m] = hora.split(':');
  let hh = parseInt(h, 10);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${dia}, ${hh}:${m} ${ampm}`;
}

function construirInsight(d) {
  const candidatos = [];

  if (d.gastosMes > 0 && d.variacionGastos !== 0) {
    const signo = d.variacionGastos > 0 ? 'más' : 'menos';
    candidatos.push(`Este mes has gastado ${Math.abs(d.variacionGastos)}% ${signo} que el mes anterior.`);
  }

  if (d.ingresosMes > 0) {
    candidatos.push(`Tus ingresos este mes suman ${formatCOP(d.ingresosMes)}.`);
  }

  const ultimoMovimiento = d.actividadReciente?.[0];
  if (ultimoMovimiento) {
    const monto = formatCOP(Number(ultimoMovimiento.monto));
    const lugar = ultimoMovimiento.descripcion ? ` en ${ultimoMovimiento.descripcion}` : '';
    candidatos.push(
      ultimoMovimiento.tipo === 'ingreso'
        ? `Tu último ingreso${lugar} fue de ${monto}.`
        : `Tu último gasto${lugar} fue de ${monto}.`
    );
  }

  if (d.balance !== 0) {
    candidatos.push(`Tu balance acumulado es ${formatCOP(d.balance)}.`);
  }

  if (candidatos.length === 0) {
    return { texto: 'Aún no has registrado movimientos. Cuéntale a Du Life por WhatsApp.', link: '/dashboard/gastos', cta: 'Ver Gastos' };
  }

  // Rota entre los insights disponibles según el día del mes, para no
  // repetir siempre el mismo pero sin inventar datos que no existan.
  const idx = new Date().getDate() % candidatos.length;
  return { texto: candidatos[idx], link: '/dashboard/gastos', cta: 'Ver Gastos' };
}

const MiniChartHero = memo(function MiniChartHero({ serie }) {
  const valores = serie.map((s) => s.total);
  const min = Math.min(...valores, 0);
  const max = Math.max(...valores, 1);
  const rango = max - min || 1;
  const W = 130;
  const H = 58;
  const pad = 4;
  const n = serie.length;
  const slot = (W - pad * 2) / n;
  const barW = slot * 0.48;

  const puntos = serie.map((s, i) => {
    const x = pad + i * slot + slot / 2;
    const norm = (s.total - min) / rango;
    const barH = Math.max(4, norm * (H - pad * 2));
    const y = H - pad - barH;
    return { x, y, barH };
  });

  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y - 2}`).join(' ');
  const ultimo = puntos[puntos.length - 1];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      {puntos.map((p, i) => (
        <rect key={i} x={p.x - barW / 2} y={p.y} width={barW} height={p.barH} rx="3" fill="rgba(0,0,0,0.14)" />
      ))}
      <path d={linea} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {puntos.slice(0, -1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y - 2} r="2" fill="#fff" />
      ))}
      <circle cx={ultimo.x} cy={ultimo.y - 2} r="5" fill="#C4E938" style={{ filter: 'drop-shadow(0 0 4px rgba(196,233,56,0.9))' }} />
    </svg>
  );
});

export default function BalancePage() {
  const [data, setData] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const cargarDatos = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard/balance').then((r) => r.json()),
      fetch('/api/dashboard/resumen').then((r) => r.json()),
    ])
      .then(([balanceData, resumenData]) => {
        setData(balanceData);
        setUsuario(resumenData.usuario);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  const nombre = usuario?.como_llamar || usuario?.nombre || 'Duvan';

  const mesActual = useMemo(() => {
    const s = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32">
        <div className="flex justify-between items-center mb-5">
          <div className="h-7 w-24 rounded animate-pulse" style={{ background: '#1A1A1A' }} />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: '#1A1A1A' }} />
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: '#1A1A1A' }} />
          </div>
        </div>
        <div className="rounded-hero h-[145px] animate-pulse" style={{ background: '#1A1A1A' }} />
        <div className="rounded-card h-[90px] mt-3.5 animate-pulse" style={{ background: '#1A1A1A' }} />
        <div className="grid grid-cols-2 gap-3 mt-3.5">
          <div className="rounded-card h-[95px] animate-pulse" style={{ background: '#1A1A1A' }} />
          <div className="rounded-card h-[95px] animate-pulse" style={{ background: '#1A1A1A' }} />
        </div>
        <div className="rounded-card h-[220px] mt-5 animate-pulse" style={{ background: '#1A1A1A' }} />
      </div>
    );
  }

  const d = data || {
    balance: 0, totalIngresos: 0, totalGastos: 0, ingresosMes: 0, gastosMes: 0,
    variacionIngresos: 0, variacionGastos: 0, variacionBalance: 0,
    serieMensual: [], actividadReciente: [],
  };

  const insight = construirInsight(d);

  return (
    <div className="px-5 pt-4 pb-[calc(4rem+env(safe-area-inset-bottom)+16px)]">

      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <div className="text-xl font-bold tracking-tight">
          <span style={{ color: '#C4E938' }}>Du</span>{' '}
          <span className="text-white">Life</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="relative w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
          >
            <IconBell size={18} color="#fff" />
            {NOTIFICACIONES_MOCK > 0 && (
              <div
                className="absolute flex items-center justify-center rounded-full"
                style={{ width: '16px', height: '16px', background: '#C4E938', top: '-2px', right: '-2px' }}
              >
                <span className="font-bold" style={{ fontSize: '9px', color: '#0A0A0A' }}>
                  {NOTIFICACIONES_MOCK}
                </span>
              </div>
            )}
          </button>
          <div className="relative">
            <button type="button" onClick={() => setShowProfile(true)}>
              <Avatar name={nombre} size="md" />
            </button>
            <div
              className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2 pointer-events-none"
              style={{ background: '#4ADE80', borderColor: '#0A0A0A' }}
            />
          </div>
        </div>
      </div>
      <div className="text-[14px] text-muted mb-5">
        Hola, <span style={{ color: '#C4E938' }}>{nombre}</span>
      </div>

      {/* Hero Balance */}
      <div className="rounded-hero p-4" style={{ background: '#C4E938' }}>
        <div className="flex justify-between items-center">
          <button className="flex items-center gap-1">
            <span className="text-[14px] text-black font-bold">Balance</span>
            <IconChevronDown size={15} color="#000" />
          </button>
          <button className="flex items-center gap-1">
            <span className="text-[12px] font-medium" style={{ color: 'rgba(0,0,0,0.7)' }}>
              {mesActual}
            </span>
            <IconChevronDown size={13} color="rgba(0,0,0,0.7)" />
          </button>
        </div>

        <div className="flex justify-between items-end mt-2">
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium" style={{ color: 'rgba(0,0,0,0.65)' }}>
              Balance total
            </div>
            <div className="text-[24px] font-bold text-black tracking-tight leading-tight mt-0.5">
              {formatCOP(d.balance)}
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <IconArrowUp size={12} color="rgba(0,0,0,0.55)" />
              <span className="text-[12px]" style={{ color: 'rgba(0,0,0,0.55)' }}>
                {d.variacionBalance >= 0 ? '+' : ''}
                {d.variacionBalance}% vs mes anterior
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 ml-2">
            <MiniChartHero serie={d.serieMensual.length ? d.serieMensual : [{ total: 0 }]} />
          </div>
        </div>
      </div>

      {/* Insight del día */}
      <div
        className="mt-3.5 rounded-card p-3.5 flex items-center gap-3 relative overflow-hidden"
        style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
      >
        <div
          className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0"
          style={{ background: '#C4E938' }}
        >
          <IconSparkles size={19} color="#0A0A0A" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#C4E938' }}>
            Insight del día
          </div>
          <div className="text-[13px] font-bold tracking-tight mt-0.5 text-white leading-snug">
            {insight.texto}
          </div>
          <Link
            href={insight.link}
            prefetch
            className="mt-1.5 flex items-center gap-1 text-[12px] font-bold w-fit"
            style={{ color: '#C4E938' }}
          >
            {insight.cta} <IconChevronRight size={12} />
          </Link>
        </div>
        <IconWallet size={54} color="#242424" className="absolute -right-2 -bottom-2 flex-shrink-0" />
      </div>

      {/* Ingresos / Gastos */}
      <div className="grid grid-cols-2 gap-3 mt-3.5">
        <div className="rounded-card p-3" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(196,233,56,0.15)' }}
            >
              <IconArrowUp size={13} color="#C4E938" />
            </div>
            <div className="text-[11px] text-muted">Ingresos</div>
          </div>
          <div className="text-[17px] font-bold tracking-tight text-white mt-2">
            {formatCOPCorto(d.ingresosMes)}
          </div>
          <div
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full mt-1.5"
            style={{ background: 'rgba(196,233,56,0.15)' }}
          >
            <IconArrowUp size={9} color="#C4E938" />
            <span className="text-[10px] font-bold" style={{ color: '#C4E938' }}>
              {Math.abs(d.variacionIngresos)}%
            </span>
          </div>
        </div>

        <div className="rounded-card p-3" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#242424' }}
            >
              <IconArrowDown size={13} color="#A1A1AA" />
            </div>
            <div className="text-[11px] text-muted">Gastos</div>
          </div>
          <div className="text-[17px] font-bold tracking-tight text-white mt-2">
            {formatCOPCorto(d.gastosMes)}
          </div>
          <div
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full mt-1.5"
            style={{ background: d.variacionGastos <= 0 ? 'rgba(196,233,56,0.15)' : 'rgba(248,113,113,0.15)' }}
          >
            {d.variacionGastos <= 0 ? (
              <IconArrowDown size={9} color="#C4E938" />
            ) : (
              <IconArrowUp size={9} color="#F87171" />
            )}
            <span className="text-[10px] font-bold" style={{ color: d.variacionGastos <= 0 ? '#C4E938' : '#F87171' }}>
              {Math.abs(d.variacionGastos)}%
            </span>
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="flex justify-between items-center mt-6 mb-2.5">
        <div className="text-[17px] font-bold tracking-tight text-white">Actividad reciente</div>
        <Link href="/dashboard/gastos" prefetch className="flex items-center gap-0.5 text-[13px] font-bold" style={{ color: '#C4E938' }}>
          Ver todo <IconChevronRight size={13} />
        </Link>
      </div>

      {d.actividadReciente.length === 0 ? (
        <div className="rounded-card p-6 text-center text-muted text-[13px]" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          Aún no hay movimientos registrados.
        </div>
      ) : (
        <div className="rounded-card px-4" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          {d.actividadReciente.map((m, i) => {
            const esIngreso = m.tipo === 'ingreso';
            const nombreItem = m.descripcion || m.lugar || m.fuente || (esIngreso ? 'Ingreso' : 'Gasto');
            return (
              <div
                key={`${m.tipo}-${m.id}`}
                className="flex items-center gap-3 py-3.5"
                style={{ borderBottom: i < d.actividadReciente.length - 1 ? '1px solid #242424' : 'none' }}
              >
                <Avatar name={nombreItem} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-white truncate">{nombreItem}</div>
                  <div className="text-[12px] text-soft mt-0.5 truncate">
                    {formatFechaActividad(m.fecha, m.hora)}
                    {(m.categoria || m.fuente) && ` · ${m.categoria || m.fuente}`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[14px] font-bold" style={{ color: esIngreso ? '#4ADE80' : '#F87171' }}>
                    {esIngreso ? '+' : '-'}
                    {formatCOP(Number(m.monto))}
                  </div>
                  <div className="text-[11px] text-soft mt-0.5 capitalize">{m.metodo_pago || ''}</div>
                </div>
                <IconChevronRight size={16} color="#71717A" className="flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      <ProfileSheet
        open={showProfile}
        onClose={() => setShowProfile(false)}
        nombre={nombre}
        telefono={usuario?.telefono}
        plan={usuario?.plan}
        onNombreActualizado={(nuevo) => setUsuario((u) => ({ ...u, como_llamar: nuevo }))}
      />

    </div>
  );
}
