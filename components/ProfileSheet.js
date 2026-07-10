'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconUser, IconBell, IconDiamond, IconHelp, IconInfoCircle, IconPalette,
  IconChevronRight, IconArrowLeft, IconCheck, IconCamera,
} from '@tabler/icons-react';
import Avatar from './Avatar';
import { useTheme } from './ThemeProvider';

// Comprime la imagen en el navegador antes de subirla: la reduce a máx 256px
// y la exporta como JPEG (~15-30KB) para que quepa holgada en foto_url (TEXT)
// sin necesidad de un bucket de Storage.
function comprimirImagen(file, max = 256, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', calidad));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// "Apariencia" ya no es un stub genérico: tiene su propio row funcional con
// el toggle de tema justo antes de "Cerrar sesión" (ver más abajo).
const MENU_ITEMS = [
  { key: 'perfil', icon: IconUser, label: 'Editar perfil' },
  { key: 'notificaciones', icon: IconBell, label: 'Notificaciones' },
  { key: 'suscripcion', icon: IconDiamond, label: 'Mi suscripción' },
  { key: 'ayuda', icon: IconHelp, label: 'Ayuda' },
  { key: 'acerca', icon: IconInfoCircle, label: 'Acerca de Du Life' },
];

export default function ProfileSheet({ open, onClose, nombre, telefono, plan, fotoUrl, onNombreActualizado, onFotoActualizada }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [vista, setVista] = useState('menu'); // 'menu' | 'editar-perfil' | 'acerca'
  const [nombreEditado, setNombreEditado] = useState(nombre || '');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');
  const [toast, setToast] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fileRef = useRef(null);

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

  const handleFoto = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-elegir la misma foto
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      mostrarToast('Elige una imagen válida');
      return;
    }
    setSubiendoFoto(true);
    try {
      const dataUrl = await comprimirImagen(file);
      const res = await fetch('/api/dashboard/actualizar_perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto_url: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        mostrarToast(data.error || 'No se pudo subir');
        return;
      }
      onFotoActualizada?.(data.usuario?.foto_url || dataUrl);
      mostrarToast('Foto actualizada');
    } catch (err) {
      mostrarToast('Error al procesar la imagen');
    } finally {
      setSubiendoFoto(false);
    }
  }, [mostrarToast, onFotoActualizada]);

  const handleMenuClick = useCallback((key) => {
    if (key === 'perfil') {
      setVista('editar-perfil');
      return;
    }
    if (key === 'acerca') {
      setVista('acerca');
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

        {vista === 'menu' && (
          <>
            <div className="flex items-center gap-3 px-5 pb-4">
              <button
                type="button"
                onClick={() => !subiendoFoto && fileRef.current?.click()}
                className="relative flex-shrink-0"
                aria-label="Cambiar foto de perfil"
              >
                <Avatar name={nombre || ''} size="xl" fotoUrl={fotoUrl} />
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent)', border: '2px solid var(--bg-card)' }}
                >
                  <IconCamera size={12} color="#000000" />
                </div>
                {subiendoFoto && (
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    <span className="text-[10px] font-bold text-white">...</span>
                  </div>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFoto}
                style={{ display: 'none' }}
              />
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

            <div>
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleMenuClick(item.key)}
                  className="w-full flex items-center gap-3 px-5"
                  style={{ height: '48px' }}
                >
                  <item.icon size={18} color="var(--text-secondary)" />
                  <span className="flex-1 text-left text-[14px]" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                  <IconChevronRight size={16} color="var(--text-secondary)" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-5"
              style={{ height: '48px' }}
            >
              <IconPalette size={18} color="var(--text-secondary)" />
              <span className="flex-1 text-left text-[14px]" style={{ color: 'var(--text-primary)' }}>Apariencia</span>
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                {theme === 'dark' ? 'Oscuro' : 'Claro'}
              </span>
              <IconChevronRight size={16} color="var(--text-secondary)" />
            </button>

            <button
              type="button"
              onClick={cerrarSesion}
              className="w-full text-center py-4 mt-1 text-[15px] font-medium"
              style={{ color: '#FF453A' }}
            >
              Cerrar sesión
            </button>
          </>
        )}

        {vista === 'editar-perfil' && (
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
              style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: guardando ? 0.6 : 1 }}
            >
              {guardando ? 'Guardando...' : <>Guardar <IconCheck size={16} /></>}
            </button>
          </div>
        )}

        {vista === 'acerca' && (
          <div className="px-5 pb-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <button type="button" onClick={() => setVista('menu')} className="p-1 -ml-1">
                <IconArrowLeft size={20} color="var(--text-primary)" />
              </button>
              <div className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Acerca de Du Life</div>
            </div>

            <div className="text-[14px] leading-relaxed space-y-4" style={{ color: 'var(--text-secondary)' }}>
              <p>
                Entre el trabajo, las ocupaciones y el día a día, se me olvidaban cosas simples:
                pagar la factura del internet, la del teléfono. Vivía siempre conectado por el
                trabajo, pero paradójicamente se me pasaban esos pequeños pendientes que terminaban
                convirtiéndose en problemas grandes — cortes de servicio, recargos por reconexión,
                solo por no recordar a tiempo.
              </p>
              <p>Ahí nació Du Life: una forma sencilla de no volver a olvidar esas cosas.</p>
              <p>
                Con el tiempo decidí ir más allá. No solo facturas pendientes, sino todo lo que
                importa en la vida diaria: un recuerdo, una idea, una tarea, la fecha de cumpleaños
                de alguien especial. Todo en el lugar donde ya vives conectado — WhatsApp — para que
                nunca se pierda ni tengas que recordar dónde lo guardaste.
              </p>
              <p>
                Y como todo empezó por un tema de plata, las finanzas son parte del corazón de
                Du Life: cuéntale tus gastos e ingresos como le escribirías a un amigo — “gasté
                20 mil en almuerzo”, “me pagaron” — y él lleva las cuentas por ti: en qué se te va
                el dinero, cuánto entra y cómo va tu balance. Sin plantillas ni hojas de cálculo.
              </p>
              <p>
                Aquí siempre sabrás dónde preguntar, y tu memoria estará disponible cuando la
                necesites, las 24 horas del día, los 7 días de la semana.
              </p>
            </div>

            <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Fundador</div>
              <div className="text-[14px] font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>Duvan Ramos Padilla</div>
            </div>
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
