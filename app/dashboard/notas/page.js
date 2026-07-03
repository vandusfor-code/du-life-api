'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArrowLeft, IconPin, IconNote, IconChevronRight,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

function timeAgo(fecha) {
  if (!fecha) return '';
  const dt = new Date(fecha);
  const diff = Date.now() - dt.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return dt.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function esHoy(fecha) {
  const hoy = new Date().toISOString().split('T')[0];
  return fecha && fecha.startsWith(hoy);
}

function esEstaSemana(fecha) {
  if (!fecha) return false;
  const dt = new Date(fecha);
  const diff = Date.now() - dt.getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  return dias <= 7;
}

export default function NotasPage() {
  const router = useRouter();
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = () => {
    fetch('/api/dashboard/notas')
      .then((r) => r.json())
      .then((d) => {
        setNotas(d.notas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useAutoRefresh(cargarDatos);

  const { destacada, pineadas, recientes, anteriores } = useMemo(() => {
    if (!notas.length) return { destacada: null, pineadas: [], recientes: [], anteriores: [] };

    // Destacada: primera pineada o la más reciente
    const dest = notas.find((n) => n.pineada) || notas[0];

    const pin = notas.filter((n) => n.pineada && n.id !== dest?.id);
    const rec = notas.filter((n) => !n.pineada && esEstaSemana(n.creado_en) && n.id !== dest?.id);
    const ant = notas.filter((n) => !n.pineada && !esEstaSemana(n.creado_en) && n.id !== dest?.id);

    return {
      destacada: dest,
      pineadas: pin,
      recientes: rec,
      anteriores: ant,
    };
  }, [notas]);

  if (loading) {
    return (
      <div className="px-5 pt-4 flex items-center justify-center min-h-screen">
        <div className="text-muted">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-32">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <IconArrowLeft size={18} color="#fff" />
        </button>
        <div>
          <div className="text-[13px] text-muted">{notas.length} notas</div>
          <div className="text-[19px] font-bold tracking-tight text-white">Notas</div>
        </div>
      </div>

      {notas.length === 0 ? (
        <div
          className="rounded-card p-8 mt-6 text-center"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <div className="text-[14px] font-bold text-white mb-2">
            Sin notas aún
          </div>
          <div className="text-[13px] text-muted leading-relaxed">
            Cuéntale a Du Life por WhatsApp lo que quieras recordar y aparecerá aquí.
          </div>
        </div>
      ) : (
        <>
          {/* Hero: nota destacada */}
          {destacada && (
            <div className="rounded-hero p-5" style={{ background: '#C4E938' }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  {destacada.pineada ? (
                    <IconPin size={15} color="#000" />
                  ) : (
                    <IconNote size={15} color="#000" />
                  )}
                  <div className="text-[13px] text-black font-bold">
                    {destacada.pineada ? 'Nota destacada' : 'Nota reciente'}
                  </div>
                </div>
                <div className="text-[11px] font-medium" style={{ color: 'rgba(0,0,0,0.7)' }}>
                  {timeAgo(destacada.creado_en)}
                </div>
              </div>

              {destacada.titulo && (
                <div className="text-[19px] font-bold text-black tracking-tight leading-tight mt-4">
                  {destacada.titulo}
                </div>
              )}
              {destacada.contenido && (
                <div className="text-[13px] leading-snug mt-2" style={{ color: 'rgba(0,0,0,0.8)' }}>
                  {destacada.contenido.slice(0, 180)}
                  {destacada.contenido.length > 180 ? '...' : ''}
                </div>
              )}
            </div>
          )}

          <SeccionNotas titulo="Pineadas" notas={pineadas} icon={<IconPin size={13} color="#C4E938" />} />
          <SeccionNotas titulo="Esta semana" notas={recientes} />
          <SeccionNotas titulo="Anteriores" notas={anteriores} />
        </>
      )}
    </div>
  );
}

function SeccionNotas({ titulo, notas, icon }) {
  if (!notas || notas.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-1.5 mt-6 mb-2.5">
        {icon}
        <div className="text-[17px] font-bold tracking-tight text-white">
          {titulo}
        </div>
        <div className="text-[13px] text-muted font-medium ml-1">
          {notas.length}
        </div>
      </div>
      <div
        className="rounded-card px-4"
        style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
      >
        {notas.map((n, i) => (
          <button
            key={n.id}
            className="w-full flex items-start gap-3 py-3.5 text-left"
            style={{
              borderBottom: i < notas.length - 1 ? '1px solid #242424' : 'none',
            }}
          >
            <div className="flex-1 min-w-0">
              {n.titulo && (
                <div className="text-[14px] font-bold text-white truncate">
                  {n.titulo}
                </div>
              )}
              {n.contenido && (
                <div className="text-[12px] text-soft mt-1 leading-snug"
                     style={{
                       display: '-webkit-box',
                       WebkitLineClamp: 2,
                       WebkitBoxOrient: 'vertical',
                       overflow: 'hidden',
                     }}>
                  {n.contenido}
                </div>
              )}
              <div className="text-[11px] text-soft mt-1.5">
                {timeAgo(n.creado_en)}
              </div>
            </div>
            <IconChevronRight size={17} color="#71717A" className="mt-1 flex-shrink-0" />
          </button>
        ))}
      </div>
    </>
  );
}