'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconUser, IconLogout, IconMoonStars, IconSun, IconBriefcase } from '@tabler/icons-react';
import Avatar from '../Avatar';
import { useTheme } from '../ThemeProvider';

// Equivalente de ProfileSheet para escritorio: un popover anclado al avatar
// en vez de un bottom-sheet (que en una pantalla ancha se ve y se siente
// mal). Reutiliza la misma lógica de negocio (logout, toggle de tema,
// guardar nombre) — no toca components/ProfileSheet.js, que sigue
// usándose tal cual en móvil.
export default function ProfileMenu({ open, onClose, nombre, telefono, plan, fotoUrl, tratamiento, modoNegocio, onNombreActualizado, onTratamientoActualizado, onModoNegocioActivado }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [editando, setEditando] = useState(false);
  const [nombreEditado, setNombreEditado] = useState(nombre || '');
  const [tratamientoEditado, setTratamientoEditado] = useState(tratamiento || 'tu');
  const [guardando, setGuardando] = useState(false);
  const [activandoNegocio, setActivandoNegocio] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setEditando(false);
    setNombreEditado(nombre || '');
    setTratamientoEditado(tratamiento || 'tu');
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, nombre, tratamiento, onClose]);

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

  const guardarNombre = useCallback(async () => {
    const valor = nombreEditado.trim();
    if (!valor) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/dashboard/actualizar_perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ como_llamar: valor, tratamiento: tratamientoEditado }),
      });
      const data = await res.json();
      if (res.ok) {
        onNombreActualizado?.(data.usuario?.como_llamar || valor);
        onTratamientoActualizado?.(data.usuario?.tratamiento || tratamientoEditado);
        setEditando(false);
      }
    } finally {
      setGuardando(false);
    }
  }, [nombreEditado, tratamientoEditado, onNombreActualizado, onTratamientoActualizado]);

  const activarNegocio = useCallback(async () => {
    setActivandoNegocio(true);
    try {
      const res = await fetch('/api/dashboard/activar_modo_negocio', { method: 'POST' });
      if (res.ok) onModoNegocioActivado?.(true);
    } finally {
      setActivandoNegocio(false);
    }
  }, [onModoNegocioActivado]);

  const telefonoFormat = telefono
    ? '+' + telefono.slice(0, 2) + ' ' + telefono.slice(2, 5) + ' ' + telefono.slice(5, 8) + ' ' + telefono.slice(8)
    : '';

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute left-0 bottom-[calc(100%+8px)] z-50 w-64 rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}
    >
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <Avatar name={nombre || ''} size="lg" fotoUrl={fotoUrl} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{nombre}</div>
          {telefonoFormat && <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{telefonoFormat}</div>}
          <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
            Plan {plan || 'Free'}
          </span>
        </div>
      </div>

      {editando ? (
        <div className="p-4 flex flex-col gap-2">
          <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Cómo prefieres que te llame</div>
          <input
            type="text"
            value={nombreEditado}
            onChange={(e) => setNombreEditado(e.target.value)}
            maxLength={50}
            autoFocus
            className="w-full px-3 py-2 rounded-xl text-[14px] outline-none"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />

          <div className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>¿Cómo prefieres que te trate?</div>
          <div className="flex gap-2">
            {[{ key: 'tu', label: 'De tú' }, { key: 'usted', label: 'De usted' }].map((op) => (
              <button
                key={op.key}
                type="button"
                onClick={() => setTratamientoEditado(op.key)}
                className="flex-1 py-2 rounded-xl text-[13px] font-bold"
                style={{
                  background: tratamientoEditado === op.key ? 'var(--accent)' : 'var(--bg-primary)',
                  color: tratamientoEditado === op.key ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: tratamientoEditado === op.key ? 'none' : '1px solid var(--border-color)',
                }}
              >
                {op.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={guardarNombre}
              disabled={guardando}
              className="flex-1 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: guardando ? 0.6 : 1 }}
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="px-3 py-2 rounded-xl text-[13px] font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium hover:bg-[var(--bg-card-hover)]"
            style={{ color: 'var(--text-primary)' }}
          >
            <IconUser size={16} color="var(--text-secondary)" /> Editar perfil
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium hover:bg-[var(--bg-card-hover)]"
            style={{ color: 'var(--text-primary)' }}
          >
            {theme === 'dark' ? <IconSun size={16} color="var(--text-secondary)" /> : <IconMoonStars size={16} color="var(--text-secondary)" />}
            {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          </button>
          <button
            type="button"
            onClick={modoNegocio ? undefined : activarNegocio}
            disabled={activandoNegocio}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium hover:bg-[var(--bg-card-hover)]"
            style={{ color: 'var(--text-primary)' }}
          >
            <IconBriefcase size={16} color="var(--text-secondary)" />
            <span className="flex-1 text-left">Modo negocio</span>
            <span className="text-[12px]" style={{ color: modoNegocio ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {modoNegocio ? '✓ Activo' : activandoNegocio ? '...' : 'Activar'}
            </span>
          </button>
          <button
            type="button"
            onClick={cerrarSesion}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium hover:bg-[var(--bg-card-hover)]"
            style={{ color: '#FF453A' }}
          >
            <IconLogout size={16} color="#FF453A" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
