'use client';

import Link from 'next/link';
import {
  IconArrowLeft, IconNote, IconBulb, IconSquareCheck, IconUsers, IconTree,
  IconBellRinging, IconClock, IconChevronRight,
} from '@tabler/icons-react';

const MODULOS = [
  { href: '/dashboard/notas', label: 'Notas', desc: 'Tus pensamientos, siempre contigo', color: '#60A5FA', icon: IconNote },
  { href: '/dashboard/ideas', label: 'Ideas', desc: 'Captura, organiza y desarrolla', color: '#FB923C', icon: IconBulb },
  { href: '/dashboard/tareas', label: 'Tareas', desc: 'Lo que tienes pendiente', color: '#A78BFA', icon: IconSquareCheck },
  { href: '/dashboard/personas', label: 'Personas', desc: 'Conecta con lo importante', color: '#818CF8', icon: IconUsers },
  { href: '/dashboard/arbol', label: 'Árbol de vida', desc: 'Tu historia, visualizada', color: '#C4E938', icon: IconTree },
  { href: '/dashboard/timeline', label: 'Timeline', desc: 'Todo, en orden cronológico', color: '#4ADE80', icon: IconClock },
  { href: '/dashboard/recordatorios', label: 'Recordatorios', desc: 'Próximamente', color: '#F87171', icon: IconBellRinging },
];

export default function EspaciosPage() {
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
          <div className="text-[13px] text-muted">{MODULOS.length} módulos</div>
          <div className="text-[19px] font-bold tracking-tight text-white">Espacios</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MODULOS.map(({ href, label, desc, color, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            prefetch
            className="rounded-card p-4 flex flex-col"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
          >
            <div
              className="w-11 h-11 rounded-[12px] flex items-center justify-center"
              style={{ background: `${color}26` }}
            >
              <Icon size={22} color={color} />
            </div>
            <div className="text-[14px] font-bold text-white mt-3">{label}</div>
            <div className="text-[11px] text-soft mt-1 leading-snug">{desc}</div>
            <IconChevronRight size={16} color={color} className="mt-2.5 self-end" />
          </Link>
        ))}
      </div>

    </div>
  );
}
