'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconUser, IconBell, IconDiamond, IconHelp, IconInfoCircle,
  IconChevronRight, IconArrowLeft, IconCheck,
} from '@tabler/icons-react';
import Avatar from './Avatar';
import { useTheme } from './ThemeProvider';

// "Apariencia" ya no es un stub genérico: tiene su propio row funcional con
// el toggle de tema justo antes de "Cerrar sesión" (ver más abajo).
const MENU_ITEMS = [
  { key: 'perfil', icon: IconUser, label: 'Editar perfil' },
  { key: 'notificaciones', icon: IconBell, label: 'Notificaciones' },
  { key: 'suscripcion', icon: IconDiamond, label: 'Mi suscripción' },
  { key: 'ayuda', icon: IconHelp, label: 'Ayuda' },
  { key: 'acerca', icon: IconInfoCircle, label: 'Acerca de Du Life' },
];

export default function ProfileSheet({ open, onClose, nombre, telefono, plan, onNombreActualizado }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [vista, setVista] = useState('menu'); // 'menu' | 'editar-perfil'
  const [nombreEditado, setNombreEditado] = useState(nombre || '');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Al cerrar el sheet, siempre volver al menú principal la próxima vez que se abra.
  useEffect(() => {
    if (!open) {
      setVista('menu');
      setErrorGuardar('');
      setToast('');
    } else {
      setNombreEditado(nombre || '');
    }
  }, [open, nombre]);

  const mostrarToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  const cerrarSesion = useCallback(async () => {
    const confirmar = confirm('¿Cerrar sesión?');
    if (!confirmar) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      try { sessionStorage.clear(); } catch (e) {}
      router.push('/');
    } catch (e) {
      alert('Error cerrando sesión. Intenta de nuevo.');
    }
  }, [router]);

  const guardarPerfil = useCallback(async () => {
    const valor = nombreEditado.trim();
    if (!valor) {
      setErrorGuardar('Escribe un nombre.');
      return;
    }
    setGuardando(true);
    setErrorGuardar('');
    try {
      const res = await fetch('/api/dashboard/actualizar_perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ como_llamar: valor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorGuardar(data.error || 'No se pudo guardar.');
        return;
      }
      onNombreActualizado?.(data.usuario?.como_llamar || valor);
      setVista('menu');
      mostrarToast('Perfil actualizado');
    } catch (e) {
      setErrorGuardar('Error de conexión. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }, [nombreEditado, onNombreActualizado, mostrarToast]);

  const handleMenuClick = useCallback((key) => {
    if (key === 'perfil') {
      setVista('editar-perfil');
      return;
    }
    mostrarToast('Próximamente');
  }, [mostrarToast]);

  const telefonoFormat = telefono
    ? '+' + telefono.slice(0, 2) + ' ' + telefono.slice(2, 5) + ' ' + telefono.slice(5, 8) + ' ' + telefono.slice(8)
    : '';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55]"
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
        className="fixed left-0 right-0 bottom-0 z-[60] max-w-app mx-auto"
        style={{
          background: 'var(--bg-card)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease-out, background-color 0.2s ease',
          paddingBottom: 'env(safe-area-inset-bottom)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border-color)' }} />
        </div>

        {vista === 'menu' ? (
          <>
            <div className="flex items-center gap-3 px-5 pb-4">
              <Avatar name={nombre || ''} size="xl" />
              <div className="flex-1 min-w-0">
                <div className="text-[17px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{nombre}</div>
                {telefonoFormat && <div className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{telefonoFormat}</div>}
                <div className="inline-block mt-1.5 px-2 py-0.5 rounded-md" style={{ background: 'rgba(196,233,56,0.15)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#C4E938' }}>
                    Plan {plan || 'Free'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)' }}>
              {MENU_ITEMS.map((item, i) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleMenuClick(item.key)}
                  className="w-full flex items-center gap-3 px-5"
                  style={{ height: '48px', borderBottom: i < MENU_ITEMS.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                >
                  <item.icon size={18} color="var(--text-secondary)" />
                  <span className="flex-1 text-left text-[14px]" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                  <IconChevronRight size={16} color="var(--text-secondary)" />
                </button>
              ))}
            </div>

            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>🎨 Apariencia</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
              </button>
            </div>

            <button
              type="button"
              onClick={cerrarSesion}
              className="w-full text-center py-4 mt-1 text-[15px] font-medium"
              style={{ color: '#FF453A' }}
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <div className="px-5 pb-6">
            <div className="flex items-center gap-3 mb-5">
              <button type="button" onClick={() => setVista('menu')} className="p-1 -ml-1">
                <IconArrowLeft size={20} color="var(--text-primary)" />
              </button>
              <div className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Editar perfil</div>
            </div>

            <div className="text-[12px] mb-2" style={{ color: 'var(--text-secondary)' }}>Cómo prefieres que te llame</div>
            <input
              type="text"
              value={nombreEditado}
              onChange={(e) => setNombreEditado(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-3 rounded-2xl text-[15px] outline-none"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              autoFocus
            />
            {errorGuardar && (
              <div className="text-[12px] mt-2" style={{ color: '#F87171' }}>{errorGuardar}</div>
            )}

            <button
              type="button"
              onClick={guardarPerfil}
              disabled={guardando}
              className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[14px] mt-5"
              style={{ background: 'var(--accent)', color: 'var(--hero-text)', opacity: guardando ? 0.6 : 1 }}
            >
              {guardando ? 'Guardando...' : <>Guardar <IconCheck size={16} /></>}
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      <div
        className="fixed left-1/2 z-[70] px-4 py-2.5 rounded-full text-[13px] font-bold"
        style={{
          bottom: '90px',
          transform: toast ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
          opacity: toast ? 1 : 0,
          pointerEvents: 'none',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          transition: 'all 0.25s ease-out',
          whiteSpace: 'nowrap',
        }}
      >
        {toast || ' '}
      </div>
    </>
  );
}
