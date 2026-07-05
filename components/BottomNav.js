'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  IconHome, IconWallet, IconChartLine, IconTree, IconLayoutGrid,
  IconCalendar, IconNote, IconBulb, IconSquareCheck, IconUsers, IconClock, IconCoins,
} from '@tabler/icons-react';
import { useTheme } from './ThemeProvider';

// Módulos que se pueden fijar en la 4ta posición del nav (reemplazando a
// Árbol). El estado vive en usuarios.metadata.modulo_fijado — sin tabla
// nueva, ver api/dashboard/[modulo].js -> handleFijarModulo.
export const MODULOS_FIJABLES = {
  arbol: { href: '/dashboard/arbol', label: 'Árbol', icon: IconTree },
  calendario: { href: '/dashboard/espacios/calendario', label: 'Calendario', icon: IconCalendar },
  prestamos: { href: '/dashboard/espacios/prestamos', label: 'Préstamos', icon: IconCoins },
  notas: { href: '/dashboard/notas', label: 'Notas', icon: IconNote },
  ideas: { href: '/dashboard/ideas', label: 'Ideas', icon: IconBulb },
  tareas: { href: '/dashboard/tareas', label: 'Tareas', icon: IconSquareCheck },
  personas: { href: '/dashboard/personas', label: 'Personas', icon: IconUsers },
  timeline: { href: '/dashboard/timeline', label: 'Timeline', icon: IconClock },
};

const ITEMS_BASE = [
  { href: '/dashboard', label: 'Inicio', icon: IconHome },
  { href: '/dashboard/gastos', label: 'Gastos', icon: IconWallet },
  { href: '/dashboard/balance', label: 'Balance', icon: IconChartLine },
];

const ITEM_ESPACIOS = { href: '/dashboard/espacios', label: 'Espacios', icon: IconLayoutGrid };

export default function BottomNav() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [moduloFijado, setModuloFijado] = useState('arbol');
  const colorInactivo = theme === 'light' ? '#999999' : '#555555';

  useEffect(() => {
    fetch('/api/dashboard/resumen')
      .then((r) => r.json())
      .then((data) => {
        const fijado = data?.usuario?.metadata?.modulo_fijado;
        if (fijado && MODULOS_FIJABLES[fijado]) setModuloFijado(fijado);
      })
      .catch(() => {});
  }, []);

  const itemCuarto = MODULOS_FIJABLES[moduloFijado] || MODULOS_FIJABLES.arbol;
  const items = [...ITEMS_BASE, itemCuarto, ITEM_ESPACIOS];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="w-full max-w-app flex justify-between items-center px-2 py-2.5"
        style={{
          background: 'var(--nav-bg)',
          borderTop: '1px solid var(--border-color)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className="flex-1 flex flex-col items-center gap-1 py-1"
              style={{ transition: 'all 0.15s ease' }}
            >
              <Icon size={22} color={active ? '#C4E938' : colorInactivo} />
              <span
                className={`text-[11px] ${active ? 'font-bold' : ''}`}
                style={{ color: active ? '#C4E938' : colorInactivo }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
