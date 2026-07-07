'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  IconSearch, IconX, IconTrash, IconDeviceFloppy, IconAlertTriangle,
  IconUserCircle,
} from '@tabler/icons-react';

const ROLES = ['owner', 'admin', 'developer', 'support', 'user'];

function timeAgo(fechaISO) {
  if (!fechaISO) return '—';
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const dias = Math.floor(diffMs / 86400000);
  if (dias < 1) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias}d`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses}m`;
}

function BadgeRol({ rol }) {
  const color = rol === 'owner' ? '#C4E938' : rol === 'admin' ? '#60A5FA' : 'var(--text-secondary)';
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold uppercase"
      style={{ background: rol ? 'rgba(196,233,56,0.10)' : 'transparent', color }}
    >
      {rol || 'user'}
    </span>
  );
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [miId, setMiId] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);

  const cargarLista = useCallback((q) => {
    setLoading(true);
    fetch(`/api/dashboard/admin_usuarios${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setUsuarios(data.usuarios || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/dashboard/resumen').then((r) => r.json()).then((d) => setMiId(d?.usuario?.id || null)).catch(() => {});
    cargarLista('');
  }, [cargarLista]);

  useEffect(() => {
    const t = setTimeout(() => cargarLista(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda, cargarLista]);

  return (
    <div className="p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Usuarios
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Ver, editar y eliminar cualquier cuenta registrada.
          </p>
        </div>
        <div className="relative">
          <IconSearch size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="pl-9 pr-4 py-2 rounded-xl text-[13px] outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '260px' }}
          />
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              {['Usuario', 'Teléfono', 'País', 'Plan', 'Rol', 'Registrado', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-[11px] font-black uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Cargando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Sin resultados.</td></tr>
            ) : (
              usuarios.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSeleccionado(u.id)}
                  className="cursor-pointer"
                >
                  <td className="px-4 py-3 text-[13px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <IconUserCircle size={18} color="var(--text-secondary)" />
                    {u.como_llamar || u.nombre || 'Sin nombre'}
                    {u.id === miId && <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>(tú)</span>}
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{u.telefono}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{u.pais || '—'}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{u.plan || 'free'}</td>
                  <td className="px-4 py-3"><BadgeRol rol={u.metadata?.rol} /></td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{timeAgo(u.creado_en)}</td>
                  <td className="px-4 py-3 text-[12px] font-bold" style={{ color: 'var(--accent)' }}>Ver →</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {seleccionado && (
        <PanelDetalle
          id={seleccionado}
          esMiCuenta={seleccionado === miId}
          onClose={() => setSeleccionado(null)}
          onCambiado={() => cargarLista(busqueda)}
        />
      )}
    </div>
  );
}

function PanelDetalle({ id, esMiCuenta, onClose, onCambiado }) {
  const [datos, setDatos] = useState(null);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [borrando, setBorrando] = useState(false);

  useEffect(() => {
    fetch(`/api/dashboard/admin_usuarios?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setMensaje(data.error); return; }
        setDatos(data);
        setForm({
          nombre: data.usuario.nombre || '',
          como_llamar: data.usuario.como_llamar || '',
          telefono: data.usuario.telefono || '',
          pais: data.usuario.pais || '',
          plan: data.usuario.plan || '',
          activo: data.usuario.activo !== false,
          rol: data.usuario.metadata?.rol || '',
        });
      })
      .catch(() => setMensaje('No se pudo cargar el usuario.'));
  }, [id]);

  const guardar = async () => {
    setGuardando(true);
    setMensaje('');
    try {
      const res = await fetch(`/api/dashboard/admin_usuarios?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setMensaje(data.error || 'No se pudo guardar.'); return; }
      setMensaje('Cambios guardados.');
      onCambiado();
    } catch (e) {
      setMensaje('Error de red al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!datos || confirmacion.trim() !== datos.usuario.telefono) return;
    setBorrando(true);
    setMensaje('');
    try {
      const res = await fetch(`/api/dashboard/admin_usuarios?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setMensaje(data.error || 'No se pudo eliminar.'); setBorrando(false); return; }
      onCambiado();
      onClose();
    } catch (e) {
      setMensaje('Error de red al eliminar.');
      setBorrando(false);
    }
  };

  const totalFilas = datos ? Object.values(datos.conteo_por_tabla).reduce((s, n) => s + n, 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="h-full overflow-y-auto flex flex-col"
        style={{ width: '440px', background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Detalle del usuario</div>
          <button type="button" onClick={onClose}>
            <IconX size={20} color="var(--text-secondary)" />
          </button>
        </div>

        {!form ? (
          <div className="p-6 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{mensaje || 'Cargando...'}</div>
        ) : (
          <div className="p-6 flex flex-col gap-4">
            {mensaje && (
              <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                {mensaje}
              </div>
            )}

            <Campo label="Nombre (WhatsApp)" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
            <Campo label="Cómo lo llama Du Life" value={form.como_llamar} onChange={(v) => setForm({ ...form, como_llamar: v })} />
            <Campo label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
            <Campo label="País" value={form.pais} onChange={(v) => setForm({ ...form, pais: v })} />
            <Campo label="Plan" value={form.plan} onChange={(v) => setForm({ ...form, plan: v })} />

            <div>
              <div className="text-[11px] font-bold uppercase mb-1.5" style={{ color: 'var(--text-secondary)' }}>Rol</div>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="">user (sin rol especial)</option>
                {ROLES.filter((r) => r !== 'user').map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
              Cuenta activa
            </label>

            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="w-full h-11 rounded-full flex items-center justify-center gap-2 font-bold text-[13px] mt-1"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: guardando ? 0.6 : 1 }}
            >
              <IconDeviceFloppy size={16} />
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-2">
                <IconAlertTriangle size={16} color="#F87171" />
                <span className="text-[13px] font-bold" style={{ color: '#F87171' }}>Zona de peligro</span>
              </div>

              {esMiCuenta ? (
                <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  No puedes eliminar tu propia cuenta desde acá.
                </div>
              ) : (
                <>
                  <div className="text-[12px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Se van a borrar {totalFilas} filas en total, repartidas en {Object.values(datos.conteo_por_tabla).filter((n) => n > 0).length} tablas
                    (mensajes, gastos, tareas, préstamos, memoria, etc.), y la cuenta misma. Esto no se puede deshacer.
                  </div>
                  <div className="text-[11px] mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Escribe el teléfono <strong>{datos.usuario.telefono}</strong> para confirmar:
                  </div>
                  <input
                    value={confirmacion}
                    onChange={(e) => setConfirmacion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none mb-2"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <button
                    type="button"
                    onClick={eliminar}
                    disabled={borrando || confirmacion.trim() !== datos.usuario.telefono}
                    className="w-full h-11 rounded-full flex items-center justify-center gap-2 font-bold text-[13px]"
                    style={{
                      background: confirmacion.trim() === datos.usuario.telefono ? '#F87171' : 'var(--bg-card)',
                      color: confirmacion.trim() === datos.usuario.telefono ? '#000000' : 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                      opacity: borrando ? 0.6 : 1,
                    }}
                  >
                    <IconTrash size={16} />
                    {borrando ? 'Eliminando...' : 'Eliminar usuario definitivamente'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, value, onChange }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}
