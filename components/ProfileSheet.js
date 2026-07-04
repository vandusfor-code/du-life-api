'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconUser, IconBell, IconPalette, IconDiamond, IconHelp, IconInfoCircle, IconChevronRight,
} from '@tabler/icons-react';
import Avatar from './Avatar';

const MENU_ITEMS = [
  { icon: IconUser, label: 'Editar perfil' },
  { icon: IconBell, label: 'Notificaciones' },
  { icon: IconPalette, label: 'Apariencia' },
  { icon: IconDiamond, label: 'Mi suscripción' },
  { icon: IconHelp, label: 'Ayuda' },
  { icon: IconInfoCircle, label: 'Acerca de Du Life' },
];

export default function ProfileSheet({ open, onClose, nombre, telefono, plan }) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const cerrarSesion = useCallback(async () => {
    const confirmar = confirm('¿Cerrar sesión?');
    if (!confirmar) return;
    try {
      await fetch('/api/auth/logout', { method: 'GET' });
      try { sessionStorage.clear(); } catch (e) {}
      router.push('/login');
    } catch (e) {
      alert('Error cerrando sesión. Intenta de nuevo.');
    }
  }, [router]);

  const telefonoFormat = telefono
    ? '+' + telefono.slice(0, 2) + ' ' + telefono.slice(2, 5) + ' ' + telefono.slice(5, 8) + ' ' + telefono.slice(8)
    : '';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: 'rgba(0,0,0,0.6)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease-out',
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-50 max-w-app mx-auto"
        style={{
          background: '#111111',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#333' }} />
        </div>

        <div className="flex items-center gap-3 px-5 pb-4">
          <Avatar name={nombre || ''} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-bold text-white truncate">{nombre}</div>
            {telefonoFormat && <div className="text-[13px] text-muted mt-0.5">{telefonoFormat}</div>}
            <div className="inline-block mt-1.5 px-2 py-0.5 rounded-md" style={{ background: 'rgba(196,233,56,0.15)' }}>
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#C4E938' }}>
                Plan {plan || 'Free'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1F1F1F' }}>
          {MENU_ITEMS.map((item, i) => (
            <button
              key={item.label}
              type="button"
              className="w-full flex items-center gap-3 px-5"
              style={{ height: '48px', borderBottom: i < MENU_ITEMS.length - 1 ? '1px solid #1F1F1F' : 'none' }}
            >
              <item.icon size={18} color="#71717A" />
              <span className="flex-1 text-left text-[14px] text-white">{item.label}</span>
              <IconChevronRight size={16} color="#71717A" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={cerrarSesion}
          className="w-full text-center py-4 mt-1 text-[15px] font-medium"
          style={{ color: '#FF453A' }}
        >
          Cerrar sesión
        </button>
      </div>
    </>
  );
}
