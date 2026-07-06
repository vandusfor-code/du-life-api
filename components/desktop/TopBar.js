'use client';

import { useEffect, useState } from 'react';
import { IconSearch, IconCalendar } from '@tabler/icons-react';
import Avatar from '../Avatar';
import ProfileMenu from './ProfileMenu';

const ZONA_COLOMBIA = 'America/Bogota';

// Barra superior de escritorio: búsqueda (solo visual en esta fase — no hay
// backend de búsqueda global todavía, así que no se conecta a nada para no
// prometer una función que no existe) + fecha real + avatar/perfil.
export default function TopBar() {
  const [usuario, setUsuario] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/resumen')
      .then((r) => r.json())
      .then((d) => setUsuario(d?.usuario || null))
      .catch(() => {});
  }, []);

  const nombre = usuario?.como_llamar || usuario?.nombre || '';
  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    timeZone: ZONA_COLOMBIA, weekday: 'short', day: 'numeric', month: 'short',
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
          className="w-full pl-9 pr-3 py-2 rounded-xl text-[13px] outline-none"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', boxShadow: 'var(--card-shadow)' }}
        />
      </div>

      <div
        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold flex-shrink-0"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', boxShadow: 'var(--card-shadow)' }}
      >
        <IconCalendar size={14} color="var(--text-secondary)" />
        {fechaHoy}
      </div>

      <div className="relative">
        <button type="button" onClick={() => setMenuAbierto((v) => !v)}>
          <Avatar name={nombre} size="md" fotoUrl={usuario?.foto_url || null} />
        </button>
        <ProfileMenu
          open={menuAbierto}
          onClose={() => setMenuAbierto(false)}
          nombre={nombre}
          telefono={usuario?.telefono}
          plan={usuario?.plan}
          fotoUrl={usuario?.foto_url || null}
          onNombreActualizado={(nuevo) => setUsuario((u) => ({ ...u, como_llamar: nuevo }))}
        />
      </div>
    </header>
  );
}
