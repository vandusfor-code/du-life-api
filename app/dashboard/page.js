'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconSparkles, IconArrowRight, IconRefresh,
  IconArrowUp, IconArrowDown, IconTrendingUp,
  IconChevronRight, IconTree, IconUsers, IconNote, IconBulb,
} from '@tabler/icons-react';
import Avatar from '../../components/Avatar';

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
  const dt = new Date(fecha + 'T' + (hora || '00:00:00'));
  const diff = Date.now() - dt.getTime();
  const horas = Math.floor(diff / 3600000);
  if (horas < 1) return 'hace un momento';
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return dt.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export default function DashboardGastos() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
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
  }, []);

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
  const resumen = data?.resumen || { total_gastos: 0, total_ingresos: 0, balance: 0 };
  const balance = Number(resumen.balance) || 0;
  const totalIngresos = Number(resumen.total_ingresos) || 0;
  const totalGastos = Number(resumen.total_gastos) || 0;
  const ultimos3 = gastos.slice(0, 3);
  const mesActual = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  return (
    <div className="px-5 pt-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-[13px] text-muted">{saludo},</div>
          <div className="text-[19px] font-bold tracking-tight">{nombre}</div>
        </div>
        <div className="relative">
          <Avatar name={nombre} size="md" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-page" />
        </div>
      </div>

      <div className="bg-lime rounded-hero p-5 relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div className="text-[13px] text-black font-bold">Tu balance</div>
          <div className="text-[12px] text-ink font-medium capitalize">{mesActual}</div>
        </div>
        <div className="text-[13px] text-ink mt-4 font-medium">Balance del mes</div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="text-[36px] font-bold text-black tracking-tight">{formatCOP(balance)}</div>
          <div className="flex items-center gap-1 bg-black px-2.5 py-1 rounded-[10px]">
            <IconTrendingUp size={12} color="#C4E938" />
            <span className="text-[11px] text-lime font-bold">
              {balance >= 0 ? '+' : ''}{balance !== 0 ? Math.round((balance / (totalIngresos || 1)) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3.5 bg-white rounded-card p-3.5 shadow-card flex items-start gap-3">
        <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0 bg-lime">
          <IconSparkles size={19} color="#000000" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-muted font-bold uppercase tracking-wide">Insight del día</div>
          <div className="text-[14px] font-bold tracking-tight mt-0.5 text-ink leading-tight">
            {INSIGHT_MOCK.titulo}
          </div>
          <button
            onClick={() => router.push(INSIGHT_MOCK.cta.href)}
            className="mt-2 flex items-center gap-1 text-[12px] font-bold text-black"
          >
            {INSIGHT_MOCK.cta.label} <IconArrowRight size={12} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3.5">
        <div className="bg-white rounded-card p-3.5 shadow-card">
          <div className="w-[32px] h-[32px] rounded-[10px] bg-lime-soft flex items-center justify-center">
            <IconArrowUp size={16} color="#65A30D" />
          </div>
          <div className="text-[12px] text-muted mt-3">Ingresos</div>
          <div className="text-[20px] font-bold tracking-tight mt-0.5">{formatCOPCorto(totalIngresos)}</div>
        </div>
        <div className="bg-white rounded-card p-3.5 shadow-card">
          <div className="w-[32px] h-[32px] rounded-[10px] bg-hairline flex items-center justify-center">
            <IconArrowDown size={16} color="#1A1D29" />
          </div>
          <div className="text-[12px] text-muted mt-3">Gastos</div>
          <div className="text-[20px] font-bold tracking-tight mt-0.5">{formatCOPCorto(totalGastos)}</div>
        </div>
      </div>

      <div className="flex justify-between items-baseline mt-6 mb-2.5">
        <div className="text-[17px] font-bold tracking-tight">Actividad</div>
        <button
          onClick={() => router.push('/dashboard/gastos')}
          className="text-[13px] text-muted font-medium"
        >
          Ver todo ›
        </button>
      </div>

      {ultimos3.length === 0 ? (
        <div className="bg-white rounded-card p-6 shadow-card text-center text-muted text-[13px]">
          Aún no hay movimientos este mes.
        </div>
      ) : (
        <div className="bg-white rounded-card px-4 shadow-card">
          {ultimos3.map((g, i) => (
            <div
              key={g.id}
              className={`flex items-center gap-3 py-3.5 ${i < ultimos3.length - 1 ? 'border-b border-hairline' : ''}`}
            >
              <div className="w-9 h-9 rounded-full bg-hairline flex items-center justify-center flex-shrink-0">
                <IconArrowDown size={16} color="#6B7280" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-bold text-ink">
                  {g.descripcion || 'Gasto'}
                </div>
                <div className="text-[12px] text-soft mt-0.5">
                  {timeAgo(g.fecha, g.hora)}
                  {g.lugar ? ` · ${g.lugar}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-bold text-ink">−{formatCOP(Number(g.monto))}</div>
                <div className="text-[11px] text-soft mt-0.5 capitalize">{g.metodo_pago}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-baseline mt-6 mb-2.5">
        <div className="text-[17px] font-bold tracking-tight">Tus módulos</div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {MODULOS.map(({ href, label, gradient, icon: Icon }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="bg-white rounded-card p-3.5 shadow-card text-left"
          >
            <div
              className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
            >
              <Icon size={19} color="#fff" />
            </div>
            <div className="text-[14px] font-bold mt-3">{label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}