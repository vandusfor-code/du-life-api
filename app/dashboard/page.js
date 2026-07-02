'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconSparkles, IconArrowRight,
  IconArrowUp, IconArrowDown, IconTrendingUp,
  IconChevronRight, IconTree, IconUsers, IconNote, IconBulb, IconBell,
} from '@tabler/icons-react';
import Avatar from '../../components/Avatar';
import { useAutoRefresh } from '../../components/useAutoRefresh';

const MODULOS = [
  { href: '/dashboard/arbol', label: 'Árbol de vida', gradient: ['#6EE7B7', '#34D399'], icon: IconTree },
  { href: '/dashboard/personas', label: 'Personas', gradient: ['#C4B5FD', '#8B5CF6'], icon: IconUsers },
  { href: '/dashboard/notas', label: 'Notas', gradient: ['#93C5FD', '#3B82F6'], icon: IconNote },
  { href: '/dashboard/ideas', label: 'Ideas', gradient: ['#FCD34D', '#F59E0B'], icon: IconBulb },
];

const INSIGHT_MOCK = {
  titulo: 'Llevas 4 días sin registrar tiempo con familia.',
  cta: { label: 'Ver Personas', href: '/dashboard/personas' },
};

const formatCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const formatCOPCorto = (n) => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'k';
  return '$' + Math.round(n);
};

function timeAgo(fecha, hora) {
  const dt = new Date((fecha || '') + 'T' + (hora || '00:00:00'));
  const diff = Date.now() - dt.getTime();
  const horas = Math.floor(diff / 3600000);
  if (horas < 1) {
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'hace un momento';
    return `hace ${mins} min`;
  }
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return dt.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export default function DashboardInicio() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState(null);

  const cargarDatos = () => {
    Promise.all([
      fetch('/api/dashboard/gastos').then(r => r.json()),
      fetch('/api/dashboard/resumen').then(r => r.json()),
    ])
      .then(([gastosData, resumenData]) => {
        setData(gastosData);
        setUsuario(resumenData.usuario);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useAutoRefresh(cargarDatos);

  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = usuario?.como_llamar || usuario?.nombre || 'Duvan';

  if (loading) {
    return (
      <div className="px-5 pt-4 flex items-center justify-center min-h-screen">
        <div className="text-muted">Cargando...</div>
      </div>
    );
  }

  const gastos = data?.gastos || [];
  const ingresos = data?.ingresos || [];
  const resumen = data?.resumen || { total_gastos: 0, total_ingresos: 0, balance: 0 };
  const balance = Number(resumen.balance) || 0;
  const totalIngresos = Number(resumen.total_ingresos) || 0;
  const totalGastos = Number(resumen.total_gastos) || 0;

  // Combinar gastos + ingresos, ordenar por fecha+hora, tomar los 3 más recientes
  const ultimos3 = [
    ...gastos.map((g) => ({ ...g, tipo: 'gasto' })),
    ...ingresos.map((i) => ({ ...i, tipo: 'ingreso' })),
  ]
    .sort((a, b) => {
      const dtA = new Date((a.fecha || '') + 'T' + (a.hora || '00:00:00'));
      const dtB = new Date((b.fecha || '') + 'T' + (b.hora || '00:00:00'));
      return dtB - dtA;
    })
    .slice(0, 3);

  const mesActual = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  return (
    <div className="px-5 pt-4">

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="text-[13px] text-muted">{saludo},</div>
          <div className="text-[19px] font-bold tracking-tight text-white">{nombre}</div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
          >
            <IconBell size={18} color="#C4E938" />
          </div>
          <div className="relative">
            <Avatar name={nombre} size="md" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                 style={{ background: '#C4E938', borderColor: '#0A0A0A' }} />
          </div>
        </div>
      </div>

      {/* Hero Balance */}
      <div className="rounded-hero p-5 relative overflow-hidden"
           style={{ background: '#C4E938' }}>
        <div className="flex justify-between items-start">
          <div className="text-[13px] text-black font-bold">Tu balance</div>
          <div className="text-[12px] font-medium capitalize" style={{ color: 'rgba(0,0,0,0.7)' }}>
            {mesActual}
          </div>
        </div>
        <div className="text-[13px] mt-4 font-medium" style={{ color: 'rgba(0,0,0,0.7)' }}>
          Balance del mes
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="text-[36px] font-bold text-black tracking-tight">
            {formatCOP(balance)}
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-[10px]"
               style={{ background: '#0A0A0A' }}>
            <IconTrendingUp size={12} color="#C4E938" />
            <span className="text-[11px] font-bold" style={{ color: '#C4E938' }}>
              {balance >= 0 ? '+' : ''}{balance !== 0 ? Math.round((balance / (totalIngresos || 1)) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Insight bubble */}
      <div
        className="mt-3.5 rounded-card p-3.5 flex items-start gap-3"
        style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
      >
        <div
          className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0"
          style={{ background: '#C4E938' }}
        >
          <IconSparkles size={19} color="#0A0A0A" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#C4E938' }}>
            Insight del día
          </div>
          <div className="text-[14px] font-bold tracking-tight mt-0.5 text-white leading-tight">
            {INSIGHT_MOCK.titulo}
          </div>
          <button
            onClick={() => router.push(INSIGHT_MOCK.cta.href)}
            className="mt-2 flex items-center gap-1 text-[12px] font-bold"
            style={{ color: '#C4E938' }}
          >
            {INSIGHT_MOCK.cta.label} <IconArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mt-3.5">
        <div className="rounded-card p-3.5" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          <div
            className="w-[32px] h-[32px] rounded-[10px] flex items-center justify-center"
            style={{ background: 'rgba(196, 233, 56, 0.15)' }}
          >
            <IconArrowUp size={16} color="#C4E938" />
          </div>
          <div className="text-[12px] text-muted mt-3">Ingresos</div>
          <div className="text-[20px] font-bold tracking-tight mt-0.5 text-white">
            {formatCOPCorto(totalIngresos)}
          </div>
        </div>
        <div className="rounded-card p-3.5" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          <div
            className="w-[32px] h-[32px] rounded-[10px] flex items-center justify-center"
            style={{ background: '#242424' }}
          >
            <IconArrowDown size={16} color="#A1A1AA" />
          </div>
          <div className="text-[12px] text-muted mt-3">Gastos</div>
          <div className="text-[20px] font-bold tracking-tight mt-0.5 text-white">
            {formatCOPCorto(totalGastos)}
          </div>
        </div>
      </div>

      {/* Actividad */}
      <div className="flex justify-between items-baseline mt-6 mb-2.5">
        <div className="text-[17px] font-bold tracking-tight text-white">Actividad</div>
        <button
          onClick={() => router.push('/dashboard/gastos')}
          className="text-[13px] text-muted font-medium"
        >
          Ver todo ›
        </button>
      </div>

      {ultimos3.length === 0 ? (
        <div
          className="rounded-card p-6 text-center text-muted text-[13px]"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          Aún no hay movimientos este mes.
        </div>
      ) : (
        <div className="rounded-card px-4" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          {ultimos3.map((m, i) => {
            const esIngreso = m.tipo === 'ingreso';
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 py-3.5"
                style={{ borderBottom: i < ultimos3.length - 1 ? '1px solid #242424' : 'none' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: esIngreso ? 'rgba(196,233,56,0.15)' : '#242424' }}
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
                    {timeAgo(m.fecha, m.hora)}
                    {m.lugar ? ` · ${m.lugar}` : ''}
                    {m.fuente ? ` · ${m.fuente}` : ''}
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
                    {m.metodo_pago || m.moneda || ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Módulos */}
      <div className="flex justify-between items-baseline mt-6 mb-2.5">
        <div className="text-[17px] font-bold tracking-tight text-white">Tus módulos</div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {MODULOS.map(({ href, label, gradient, icon: Icon }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="rounded-card p-3.5 text-left"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
          >
            <div
              className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
            >
              <Icon size={19} color="#fff" />
            </div>
            <div className="text-[14px] font-bold mt-3 text-white">{label}</div>
          </button>
        ))}
      </div>

    </div>
  );
}