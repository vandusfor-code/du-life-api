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

  // Ya NO usa position:fixed acá: en el navegador embebido de WhatsApp
  // (y otros in-app browsers) el fixed se rompe y la barra termina
  // desplazándose con el contenido. En vez de eso, ResponsiveShell.js hace
  // fixed una sola vez en todo el shell de la app (fixed inset-0) y este
  // nav es simplemente el último hijo de ese flex-col — se queda "abajo"
  // porque el shell entero ya está pegado a los bordes del viewport.
  return (
    <nav
      className="flex justify-center flex-shrink-0"
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
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{
                  width: '44px',
                  height: '30px',
                  background: active ? 'rgba(196,233,56,0.14)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                <Icon size={22} color={active ? '#C4E938' : colorInactivo} />
              </div>
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
