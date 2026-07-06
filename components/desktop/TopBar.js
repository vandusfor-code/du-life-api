'use client';

import { IconSearch, IconCalendar, IconBell } from '@tabler/icons-react';

const ZONA_COLOMBIA = 'America/Bogota';

// Barra superior de escritorio: búsqueda (solo visual en esta fase — no hay
// backend de búsqueda global todavía, así que no se conecta a nada para no
// prometer una función que no existe) + fecha real + campana. El perfil
// vive ahora en la tarjeta de usuario al final del Sidebar.
export default function TopBar() {
  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    timeZone: ZONA_COLOMBIA, weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <header
      className="flex items-center justify-between gap-4 px-6 h-16 flex-shrink-0 sticky top-0 z-40"
      style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
    >
      <div className="relative flex-1 max-w-md">
        <IconSearch size={16} color="var(--text-secondary)" className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar cualquier cosa..."
          disabled
          className="w-full pl-9 pr-14 py-2 rounded-xl text-[13px] outline-none"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', boxShadow: 'var(--card-shadow)' }}
        />
        <span
          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
          style={{ background: 'var(--bg-card-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
        >
          ⌘K
        </span>
      </div>

      <div
        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold flex-shrink-0"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', boxShadow: 'var(--card-shadow)' }}
      >
        <IconCalendar size={14} color="var(--text-secondary)" />
        {fechaHoy}
      </div>

      <button
        type="button"
        className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
      >
        <IconBell size={17} color="var(--text-secondary)" />
      </button>
    </header>
  );
}
