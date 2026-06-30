'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    verificarSesion();
  }, []);

  const verificarSesion = async () => {
    try {
      const response = await fetch('/api/dashboard/resumen');
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setUsuario(data.usuario);
      }
    } catch (e) {
      console.error('Error verificando sesión:', e);
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesion = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const menuItems = [
    { href: '/dashboard', icon: '🏠', label: 'Inicio' },
    { href: '/dashboard/gastos', icon: '💸', label: 'Gastos' },
    { href: '/dashboard/personas', icon: '👥', label: 'Personas' },
    { href: '/dashboard/arbol', icon: '🌳', label: 'Árbol de Vida' },
    { href: '/dashboard/notas', icon: '📝', label: 'Notas' },
    { href: '/dashboard/tareas', icon: '✅', label: 'Tareas' },
    { href: '/dashboard/ideas', icon: '💡', label: 'Ideas' },
    { href: '/dashboard/settings', icon: '⚙️', label: 'Ajustes' }
  ];

  if (loading) {
    return (
      <main style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f5f5f7',
        fontFamily: 'sans-serif'
      }}>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>Cargando...</p>
      </main>
    );
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f5f5f7',
      fontFamily: 'sans-serif'
    }}>
      {/* SIDEBAR */}
      <aside style={{
        width: '250px',
        background: 'white',
        boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f0f0f0' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: '#1a1a1a' }}>
            🧠 Du Life
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#666', margin: '0.25rem 0 0' }}>
            {usuario?.como_llamar || usuario?.nombre || 'Usuario'}
          </p>
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
          {menuItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  textDecoration: 'none',
                  color: active ? '#667eea' : '#555',
                  background: active ? '#f0f4ff' : 'transparent',
                  fontWeight: active ? 'bold' : 'normal',
                  borderLeft: active ? '3px solid #667eea' : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '1rem', borderTop: '1px solid #f0f0f0' }}>
          <button
            onClick={cerrarSesion}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#666',
              fontSize: '0.9rem'
            }}
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}