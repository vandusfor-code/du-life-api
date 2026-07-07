'use client';

import { useEffect, useState } from 'react';
import { IconX, IconMessageCircle, IconUserCircle } from '@tabler/icons-react';
import { useAutoRefresh } from '../../../../components/useAutoRefresh';

function timeAgo(fechaISO) {
  if (!fechaISO) return '—';
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias}d`;
}

export default function ConversacionesPage() {
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);

  const cargar = () => {
    fetch('/api/dashboard/admin_conversaciones')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setConversaciones(data.conversaciones || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);
  useAutoRefresh(cargar, 10000);

  return (
    <div className="p-8 flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Conversaciones
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Últimas conversaciones por WhatsApp, una por usuario, más reciente primero.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        {loading ? (
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Cargando...</div>
        ) : conversaciones.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Sin conversaciones todavía.</div>
        ) : (
          conversaciones.map((c, i) => (
            <div
              key={c.usuario_id}
              onClick={() => setSeleccionado(c.usuario_id)}
              className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
              style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : 'none' }}
            >
              <IconUserCircle size={28} color="var(--text-secondary)" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  {c.usuario.como_llamar || c.usuario.nombre || 'Usuario'}
                </div>
                <div className="text-[12px] truncate" style={{ color: 'var(--text-secondary)', maxWidth: '520px' }}>
                  {c.ultimo_role === 'assistant' ? 'Du Life: ' : ''}{c.ultimo_mensaje}
                </div>
              </div>
              <div className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                {timeAgo(c.ultima_fecha)}
              </div>
            </div>
          ))
        )}
      </div>

      {seleccionado && (
        <PanelHilo id={seleccionado} onClose={() => setSeleccionado(null)} />
      )}
    </div>
  );
}

function PanelHilo({ id, onClose }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/dashboard/admin_conversaciones?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setDatos(data);
      })
      .catch(() => setError('No se pudo cargar el historial.'));
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="h-full flex flex-col"
        style={{ width: '480px', background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {datos?.usuario?.como_llamar || datos?.usuario?.nombre || 'Conversación'}
            </div>
            {datos && <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{datos.total} mensajes en total</div>}
          </div>
          <button type="button" onClick={onClose}>
            <IconX size={20} color="var(--text-secondary)" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
          {error && <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{error}</div>}
          {!datos && !error && <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Cargando...</div>}
          {datos?.mensajes.length === 0 && (
            <div className="text-[13px] text-center mt-8" style={{ color: 'var(--text-secondary)' }}>Sin mensajes.</div>
          )}
          {datos?.mensajes.map((m) => {
            const esUsuario = m.role === 'user';
            return (
              <div key={m.id} className="flex" style={{ justifyContent: esUsuario ? 'flex-end' : 'flex-start' }}>
                <div
                  className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px]"
                  style={{
                    background: esUsuario ? 'var(--accent)' : 'var(--bg-card)',
                    color: esUsuario ? 'var(--accent-text)' : 'var(--text-primary)',
                    border: esUsuario ? 'none' : '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.mensaje}</div>
                  <div
                    className="text-[10px] mt-1 flex items-center gap-1"
                    style={{ color: esUsuario ? 'rgba(0,0,0,0.55)' : 'var(--text-muted)' }}
                  >
                    <IconMessageCircle size={10} />
                    {m.modelo_ai || m.tipo_mensaje} · {timeAgo(m.creado_en)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
