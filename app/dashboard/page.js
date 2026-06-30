'use client';

import { useRouter } from 'next/navigation';
import {
  IconSparkles, IconArrowRight, IconRefresh,
  IconFlame, IconCake, IconWallet, IconTrendingUp,
  IconChevronRight, IconTree, IconUsers, IconNote, IconBulb,
} from '@tabler/icons-react';
import Avatar from '../../components/Avatar';

// ⚠️ MOCK DATA — reemplazar con datos reales del backend
const USER = { nombre: 'Duvan' };
const INSIGHT = {
  fecha: 'Lunes, 30 jun',
  titulo: 'Llevas 4 días sin registrar tiempo con familia.',
  contexto: 'Tu última nota sobre Andrea fue hace 2 semanas. ¿Quieres llamarla esta noche?',
  cta: { label: 'Ver Personas', href: '/dashboard/personas' },
};
const TU_DIA = {
  tareas: { pendientes: 3, urgentes: 2 },
  cumple: { nombre: 'Anita', dia: 'viernes' },
  balance: { monto: 1602700, cambio: 5.6 },
};
const MODULOS = [
  { href: '/dashboard/arbol', label: 'Árbol de vida', meta: 'Salud bajó', gradient: ['#6EE7B7', '#34D399'], icon: IconTree },
  { href: '/dashboard/personas', label: 'Personas', meta: '12 activos', gradient: ['#C4B5FD', '#8B5CF6'], icon: IconUsers },
  { href: '/dashboard/notas', label: 'Notas', meta: '3 nuevas hoy', gradient: ['#93C5FD', '#3B82F6'], icon: IconNote },
  { href: '/dashboard/ideas', label: 'Ideas', meta: '2 en revisión', gradient: ['#FCD34D', '#F59E0B'], icon: IconBulb },
];

const formatCOP = (n) => '$' + n.toLocaleString('es-CO');

export default function DashboardInicio() {
  const router = useRouter();
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="px-5 pt-4">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-[13px] text-muted">{saludo},</div>
          <div className="text-[19px] font-bold tracking-tight">{USER.nombre}</div>
        </div>
        <div className="relative">
          <Avatar name={USER.nombre} size="md" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-page" />
        </div>
      </div>

      {/* Hero Insight Card */}
      <div className="bg-lime rounded-hero p-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <IconSparkles size={15} color="#000000" />
            <div className="text-[13px] text-black font-bold">Insight del día</div>
          </div>
          <div className="text-[11px] text-ink font-medium">{INSIGHT.fecha}</div>
        </div>

        <div className="text-[19px] font-bold text-black leading-tight mt-4 tracking-tight">
          {INSIGHT.titulo}
        </div>
        <div className="text-[13px] text-ink leading-snug mt-2">
          {INSIGHT.contexto}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => router.push(INSIGHT.cta.href)}
            className="flex-1 bg-black py-2.5 rounded-pill flex items-center justify-center gap-1.5"
          >
            <span className="text-[12px] text-lime font-bold">{INSIGHT.cta.label}</span>
            <IconArrowRight size={13} color="#C4E938" />
          </button>
          <button className="bg-black/10 py-2.5 px-3 rounded-pill flex items-center justify-center">
            <IconRefresh size={15} color="#000000" />
          </button>
        </div>
      </div>

      {/* Tu día */}
      <div className="flex justify-between items-baseline mt-6 mb-2.5">
        <div className="text-[17px] font-bold tracking-tight">Tu día</div>
        <div className="text-[13px] text-muted font-medium">30 jun</div>
      </div>

      <div className="space-y-2.5">
        {/* Tareas */}
        <div className="bg-white rounded-card p-3.5 flex items-center gap-3 shadow-card">
          <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #FCA5A5, #EF4444)' }}>
            <IconFlame size={19} color="#fff" />
          </div>
          <div className="flex-1">
            <div className="text-[12px] text-muted font-medium">Tareas para hoy</div>
            <div className="text-[16px] font-bold tracking-tight mt-0.5">{TU_DIA.tareas.pendientes} pendientes</div>
          </div>
          {TU_DIA.tareas.urgentes > 0 && (
            <div className="bg-red-50 px-2.5 py-1 rounded-[10px]">
              <span className="text-[11px] text-red-600 font-bold">{TU_DIA.tareas.urgentes} urgentes</span>
            </div>
          )}
        </div>

        {/* Cumple */}
        <div className="bg-white rounded-card p-3.5 flex items-center gap-3 shadow-card">
          <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #C4B5FD, #8B5CF6)' }}>
            <IconCake size={19} color="#fff" />
          </div>
          <div className="flex-1">
            <div className="text-[12px] text-muted font-medium">Cumpleaños esta semana</div>
            <div className="text-[16px] font-bold tracking-tight mt-0.5">
              {TU_DIA.cumple.nombre} · {TU_DIA.cumple.dia}
            </div>
          </div>
          <IconChevronRight size={18} color="#C9CDD3" />
        </div>

        {/* Balance */}
        <div className="bg-white rounded-card p-3.5 flex items-center gap-3 shadow-card">
          <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #86EFAC, #22C55E)' }}>
            <IconWallet size={19} color="#fff" />
          </div>
          <div className="flex-1">
            <div className="text-[12px] text-muted font-medium">Balance del mes</div>
            <div className="text-[16px] font-bold tracking-tight mt-0.5">{formatCOP(TU_DIA.balance.monto)}</div>
          </div>
          <div className="flex items-center gap-1 bg-lime-soft px-2 py-1 rounded-[10px]">
            <IconTrendingUp size={11} color="#65A30D" />
            <span className="text-[11px] text-lime-text font-bold">{TU_DIA.balance.cambio}%</span>
          </div>
        </div>
      </div>

      {/* Módulos */}
      <div className="flex justify-between items-baseline mt-6 mb-2.5">
        <div className="text-[17px] font-bold tracking-tight">Tus módulos</div>
        <div className="text-[13px] text-muted font-medium">Ver todo ›</div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {MODULOS.map(({ href, label, meta, gradient, icon: Icon }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="bg-white rounded-card p-3.5 shadow-card text-left"
          >
            <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center"
                 style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}>
              <Icon size={19} color="#fff" />
            </div>
            <div className="text-[14px] font-bold mt-3">{label}</div>
            <div className="text-[11px] text-muted mt-0.5">{meta}</div>
          </button>
        ))}
      </div>

    </div>
  );
}