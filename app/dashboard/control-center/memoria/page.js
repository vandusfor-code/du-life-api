'use client';

import { useEffect, useState } from 'react';
import { IconX, IconUserCircle, IconTag, IconBulb } from '@tabler/icons-react';

function timeAgo(fechaISO) {
  if (!fechaISO) return '—';
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const dias = Math.floor(diffMs / 86400000);
  if (dias < 1) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias}d`;
}

export default function MemoriaPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard/admin_memoria')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setUsuarios(data.usuarios || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Memoria
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Entidades y hechos reales que Du Life recuerda de cada usuario.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              {['Usuario', 'Entidades', 'Hechos', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-[11px] font-black uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Cargando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Sin memoria guardada todavía.</td></tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.usuario.id} onClick={() => setSeleccionado(u.usuario.id)} className="cursor-pointer">
                  <td className="px-4 py-3 text-[13px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <IconUserCircle size={18} color="var(--text-secondary)" />
                    {u.usuario.como_llamar || u.usuario.nombre || 'Usuario'}
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{u.entidades}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{u.hechos}</td>
                  <td className="px-4 py-3 text-[12px] font-bold" style={{ color: 'var(--accent)' }}>Ver →</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {seleccionado && <PanelMemoria id={seleccionado} onClose={() => setSeleccionado(null)} />}
    </div>
  );
}

function PanelMemoria({ id, onClose }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/dashboard/admin_memoria?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setDatos(data);
      })
      .catch(() => setError('No se pudo cargar la memoria.'));
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="h-full overflow-y-auto flex flex-col" style={{ width: '460px', background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {datos?.usuario?.como_llamar || datos?.usuario?.nombre || 'Memoria'}
          </div>
          <button type="button" onClick={onClose}><IconX size={20} color="var(--text-secondary)" /></button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {error && <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{error}</div>}
          {!datos && !error && <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Cargando...</div>}

          {datos && (
            <>
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <IconTag size={16} color="var(--accent)" />
                  <span className="text-[12px] font-black uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
                    Entidades ({datos.entidades.length})
                  </span>
                </div>
                {datos.entidades.length === 0 ? (
                  <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Sin entidades guardadas.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {datos.entidades.map((e) => (
                      <div key={e.id} className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{e.nombre}</span>
                          <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>{e.tipo_entidad}</span>
                        </div>
                        {e.descripcion && <div className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>{e.descripcion}</div>}
                        <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                          Mencionada {e.veces_mencionada}x · importancia {e.importancia} · última vez {timeAgo(e.ultima_mencion)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <IconBulb size={16} color="var(--accent)" />
                  <span className="text-[12px] font-black uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
                    Hechos ({datos.hechos.length})
                  </span>
                </div>
                {datos.hechos.length === 0 ? (
                  <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Sin hechos guardados.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {datos.hechos.map((h) => (
                      <div key={h.id} className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                        <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{h.hecho}</div>
                        <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                          {h.categoria} · confianza {Math.round(h.confianza * 100)}% · {h.verificado ? 'verificado' : 'sin verificar'} · {timeAgo(h.creado_en)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
