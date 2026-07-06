'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconLogout, IconUser, IconPhone, IconInfoCircle } from '@tabler/icons-react';
import Avatar from '../../../components/Avatar';

export default function SettingsPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/usuario')
      .then((r) => r.json())
      .then((d) => {
        setUsuario(d.usuario);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const cerrarSesion = useCallback(async () => {
    if (loggingOut) return;
    const confirmar = confirm('¿Cerrar sesión?');
    if (!confirmar) return;

    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'GET' });
      // Limpiar cualquier residuo
      try { sessionStorage.clear(); } catch (e) {}
      router.push('/login');
    } catch (e) {
      alert('Error cerrando sesión. Intenta de nuevo.');
      setLoggingOut(false);
    }
  }, [loggingOut, router]);

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32 lg:max-w-4xl lg:mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
          <div>
            <div className="h-3 w-24 rounded animate-pulse mb-1.5" style={{ background: 'var(--bg-card)' }} />
            <div className="h-5 w-14 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
          </div>
        </div>
        <div className="rounded-hero h-[110px] mb-6 animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-card h-[140px] mb-6 animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-card h-[70px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
      </div>
    );
  }

  const nombre = usuario?.como_llamar || usuario?.nombre || 'Usuario';
  const telefono = usuario?.telefono || '';
  const telefonoFormat = telefono ? '+' + telefono.slice(0, 2) + ' ' + telefono.slice(2, 5) + ' ' + telefono.slice(5, 8) + ' ' + telefono.slice(8) : '';

  return (
    <div className="px-5 pt-4 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <IconArrowLeft size={18} color="var(--text-primary)" />
        </Link>
        <div>
          <div className="text-[13px] text-muted">Configuración</div>
          <div className="text-[19px] font-bold tracking-tight text-ink">Más</div>
        </div>
      </div>

      {/* Card de perfil */}
      <div
        className="rounded-hero p-5 mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-4">
          <Avatar name={nombre} size="xl" />
          <div className="flex-1">
            <div className="text-[19px] font-bold text-ink tracking-tight">{nombre}</div>
            {telefonoFormat && (
              <div className="text-[13px] text-muted mt-1">{telefonoFormat}</div>
            )}
            {usuario?.plan && (
              <div className="inline-block mt-2 px-2 py-0.5 rounded-md" style={{ background: 'rgba(196,233,56,0.15)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#C4E938' }}>
                  Plan {usuario.plan}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secciones */}
      <div className="text-[12px] text-muted uppercase tracking-wide font-medium mb-2 px-1">
        Cuenta
      </div>
      <div
        className="rounded-card px-4 mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-3 py-3.5" style={{ borderBottom: '1px solid #242424' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#242424' }}>
            <IconUser size={16} color="var(--text-secondary)" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] text-muted">Cómo prefieres que te llame</div>
            <div className="text-[14px] font-bold text-ink mt-0.5">{nombre}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 py-3.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#242424' }}>
            <IconPhone size={16} color="var(--text-secondary)" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] text-muted">WhatsApp</div>
            <div className="text-[14px] font-bold text-ink mt-0.5">{telefonoFormat || '—'}</div>
          </div>
        </div>
      </div>

      {/* Acerca de */}
      <div className="text-[12px] text-muted uppercase tracking-wide font-medium mb-2 px-1">
        Acerca de
      </div>
      <div
        className="rounded-card px-4 mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-3 py-3.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#242424' }}>
            <IconInfoCircle size={16} color="var(--text-secondary)" />
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-ink">Du Life</div>
            <div className="text-[12px] text-muted mt-0.5">v1.0 · Tu segundo cerebro por WhatsApp</div>
          </div>
        </div>
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={cerrarSesion}
        disabled={loggingOut}
        className="w-full rounded-card py-4 flex items-center justify-center gap-2 font-bold text-[15px]"
        style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#F87171',
          opacity: loggingOut ? 0.5 : 1,
        }}
      >
        <IconLogout size={18} />
        {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>
    </div>
  );
}