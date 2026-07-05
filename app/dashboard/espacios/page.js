'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconNote, IconBulb, IconSquareCheck, IconUsers, IconTree,
  IconBellRinging, IconClock, IconChevronRight, IconCalendar, IconCoins,
  IconPin, IconPinFilled,
} from '@tabler/icons-react';

const MODULOS = [
  { href: '/dashboard/notas', label: 'Notas', desc: 'Tus pensamientos, siempre contigo', color: '#60A5FA', icon: IconNote, pinKey: 'notas' },
  { href: '/dashboard/ideas', label: 'Ideas', desc: 'Captura, organiza y desarrolla', color: '#FB923C', icon: IconBulb, pinKey: 'ideas' },
  { href: '/dashboard/tareas', label: 'Tareas', desc: 'Lo que tienes pendiente', color: '#A78BFA', icon: IconSquareCheck, pinKey: 'tareas' },
  { href: '/dashboard/personas', label: 'Personas', desc: 'Conecta con lo importante', color: '#818CF8', icon: IconUsers, pinKey: 'personas' },
  { href: '/dashboard/arbol', label: 'Árbol de vida', desc: 'Tu historia, visualizada', color: '#C4E938', icon: IconTree, pinKey: 'arbol' },
  { href: '/dashboard/timeline', label: 'Timeline', desc: 'Todo, en orden cronológico', color: '#4ADE80', icon: IconClock, pinKey: 'timeline' },
  { href: '/dashboard/espacios/calendario', label: 'Calendario', desc: 'Tu agenda personal', color: '#C4E938', icon: IconCalendar, pinKey: 'calendario' },
  { href: '/dashboard/espacios/prestamos', label: 'Mis Préstamos', desc: 'Controla lo que te deben', color: '#C4E938', icon: IconCoins, pinKey: 'prestamos' },
  { href: '/dashboard/recordatorios', label: 'Recordatorios', desc: 'Próximamente', color: '#F87171', icon: IconBellRinging },
];

export default function EspaciosPage() {
  const [moduloFijado, setModuloFijado] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard/resumen')
      .then((r) => r.json())
      .then((data) => setModuloFijado(data?.usuario?.metadata?.modulo_fijado || null))
      .catch(() => {});
  }, []);

  const alternarPin = useCallback((e, pinKey) => {
    e.preventDefault();
    e.stopPropagation();
    const nuevoValor = moduloFijado === pinKey ? null : pinKey;
    setModuloFijado(nuevoValor);
    fetch('/api/dashboard/fijar_modulo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modulo_fijado: nuevoValor }),
    }).catch(() => {});
  }, [moduloFijado]);

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
        {MODULOS.map(({ href, label, desc, color, icon: Icon, pinKey }) => {
          const fijado = pinKey && moduloFijado === pinKey;
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className="rounded-card p-4 flex flex-col relative"
              style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
            >
              {pinKey && (
                <button
                  type="button"
                  onClick={(e) => alternarPin(e, pinKey)}
                  className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center"
                  aria-label={fijado ? 'Quitar de la barra inferior' : 'Fijar en la barra inferior'}
                >
                  {fijado ? (
                    <IconPinFilled size={14} color="#C4E938" />
                  ) : (
                    <IconPin size={14} color="#52525B" />
                  )}
                </button>
              )}
              <div
                className="w-11 h-11 rounded-[12px] flex items-center justify-center"
                style={{ background: `${color}26` }}
              >
                <Icon size={22} color={color} />
              </div>
              <div className="text-[14px] font-bold text-white mt-3 pr-4">{label}</div>
              <div className="text-[11px] text-soft mt-1 leading-snug">{desc}</div>
              <IconChevronRight size={16} color={color} className="mt-2.5 self-end" />
            </Link>
          );
        })}
      </div>

    </div>
  );
}
