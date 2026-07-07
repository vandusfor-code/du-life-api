'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconPin, IconNote, IconChevronRight,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

function timeAgo(fechaISO) {
  if (!fechaISO) return '';
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 30) return `hace ${Math.floor(dias / 7)} sem`;
  return `hace ${Math.floor(dias / 30)} mes${Math.floor(dias / 30) > 1 ? 'es' : ''}`;
}

function esEstaSemana(fechaISO) {
  if (!fechaISO) return false;
  const dias = (Date.now() - new Date(fechaISO).getTime()) / (1000 * 60 * 60 * 24);
  return dias <= 7;
}

function truncate(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max).trim() + '…';
}

export default function NotasPage() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(() => {
    fetch('/api/dashboard/notas')
      .then((r) => r.json())
      .then((d) => {
        setNotas(d.notas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  const { hero, pineadas, estaSemana, anteriores } = useMemo(() => {
    if (!notas.length) return { hero: null, pineadas: [], estaSemana: [], anteriores: [] };

    const heroNota = notas.find((n) => n.pineada) || notas[0];
    const resto = notas.filter((n) => n.id !== heroNota.id);
    const pineadasRestantes = resto.filter((n) => n.pineada);
    const noPineadas = resto.filter((n) => !n.pineada);
    const semana = noPineadas.filter((n) => esEstaSemana(n.creado_en));
    const antes = noPineadas.filter((n) => !esEstaSemana(n.creado_en));

    return { hero: heroNota, pineadas: pineadasRestantes, estaSemana: semana, anteriores: antes };
  }, [notas]);

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32 lg:max-w-4xl lg:mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
          <div>
            <div className="h-3 w-14 rounded animate-pulse mb-1.5" style={{ background: 'var(--bg-card)' }} />
            <div className="h-5 w-16 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
          </div>
        </div>
        <div className="rounded-hero h-[150px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-card h-[160px] mt-6 animate-pulse" style={{ background: 'var(--bg-card)' }} />
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-32 lg:max-w-4xl lg:mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <IconArrowLeft size={18} color="var(--text-primary)" />
        </Link>
        <div>
          <div className="text-[13px] text-muted">
            {notas.length} {notas.length === 1 ? 'nota' : 'notas'}
          </div>
          <div className="text-[19px] font-bold tracking-tight text-ink">Notas</div>
        </div>
      </div>

      {notas.length === 0 ? (
        <div
          className="rounded-card p-8 mt-6 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex justify-center mb-2"><IconNote size={32} strokeWidth={1.5} color="var(--text-secondary)" /></div>
          <div className="text-[14px] font-bold text-ink mb-2">Sin notas aún</div>
          <div className="text-[13px] text-muted leading-relaxed">
            Cuéntale a Du Life por WhatsApp lo que quieras recordar.
          </div>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="rounded-hero p-5" style={{ background: '#C4E938' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {hero.pineada ? (
                  <IconPin size={15} color="#000" />
                ) : (
                  <IconNote size={15} color="#000" />
                )}
                <div className="text-[13px] text-black font-bold">
                  {hero.pineada ? 'Nota destacada' : 'Nota reciente'}
                </div>
              </div>
              <div className="text-[11px] font-medium" style={{ color: 'rgba(0,0,0,0.55)' }}>
                {timeAgo(hero.creado_en)}
              </div>
            </div>
            <div className="text-[22px] font-bold text-black tracking-tight mt-4 leading-tight">
              {hero.titulo || 'Sin título'}
            </div>
            {hero.contenido && (
              <div className="text-[13px] mt-2 leading-relaxed" style={{ color: 'rgba(0,0,0,0.65)' }}>
                {truncate(hero.contenido, 180)}
              </div>
            )}
          </div>

          <SeccionNotas
            titulo="Pineadas"
            icon={<IconPin size={16} color="#C4E938" />}
            notas={pineadas}
          />
          <SeccionNotas titulo="Esta semana" notas={estaSemana} />
          <SeccionNotas titulo="Anteriores" notas={anteriores} />
        </>
      )}
    </div>
  );
}

function SeccionNotas({ titulo, icon, notas }) {
  if (!notas || notas.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 mt-6 mb-2.5">
        {icon}
        <div className="text-[17px] font-bold tracking-tight text-ink">{titulo}</div>
        <div className="text-[13px] text-muted font-medium ml-auto">{notas.length}</div>
      </div>
      <div className="rounded-card px-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        {notas.map((n, i) => (
          <div
            key={n.id}
            className="flex items-center gap-3 py-3.5"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-ink truncate">
                {n.titulo || 'Sin título'}
              </div>
              {n.contenido && (
                <div
                  className="text-[12px] text-soft mt-0.5"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {n.contenido}
                </div>
              )}
              <div className="text-[11px] text-soft mt-1">{timeAgo(n.creado_en)}</div>
            </div>
            <IconChevronRight size={16} color="var(--text-secondary)" className="flex-shrink-0" />
          </div>
        ))}
      </div>
    </>
  );
}
