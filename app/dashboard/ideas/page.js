'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconStar, IconBulb, IconChevronRight,
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

export default function IdeasPage() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(() => {
    fetch('/api/dashboard/ideas')
      .then((r) => r.json())
      .then((d) => {
        setIdeas(d.ideas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  const { hero, favoritas, estaSemana, anteriores } = useMemo(() => {
    if (!ideas.length) return { hero: null, favoritas: [], estaSemana: [], anteriores: [] };

    const heroIdea = ideas.find((i) => i.favorita) || ideas[0];
    const resto = ideas.filter((i) => i.id !== heroIdea.id);
    const favoritasRestantes = resto.filter((i) => i.favorita);
    const noFavoritas = resto.filter((i) => !i.favorita);
    const semana = noFavoritas.filter((i) => esEstaSemana(i.creado_en));
    const antes = noFavoritas.filter((i) => !esEstaSemana(i.creado_en));

    return { hero: heroIdea, favoritas: favoritasRestantes, estaSemana: semana, anteriores: antes };
  }, [ideas]);

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32">
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
    <div className="px-5 pt-4 pb-32">

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
            {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'}
          </div>
          <div className="text-[19px] font-bold tracking-tight text-ink">Ideas</div>
        </div>
      </div>

      {ideas.length === 0 ? (
        <div
          className="rounded-card p-8 mt-6 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="text-[36px] mb-2">💡</div>
          <div className="text-[14px] font-bold text-ink mb-2">Sin ideas aún</div>
          <div className="text-[13px] text-muted leading-relaxed">
            Cuéntale a Du Life por WhatsApp "tengo una idea..." y aparecerá aquí.
          </div>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="rounded-hero p-5" style={{ background: '#C4E938' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {hero.favorita ? (
                  <IconStar size={15} color="#000" />
                ) : (
                  <IconBulb size={15} color="#000" />
                )}
                <div className="text-[13px] text-black font-bold">
                  {hero.favorita ? 'Idea favorita' : 'Idea reciente'}
                </div>
              </div>
              <div className="text-[11px] font-medium" style={{ color: 'rgba(0,0,0,0.55)' }}>
                {timeAgo(hero.creado_en)}
              </div>
            </div>
            <div className="text-[22px] font-bold text-black tracking-tight mt-4 leading-tight">
              {hero.titulo || 'Sin título'}
            </div>
            {hero.descripcion && (
              <div className="text-[13px] mt-2 leading-relaxed" style={{ color: 'rgba(0,0,0,0.65)' }}>
                {truncate(hero.descripcion, 180)}
              </div>
            )}
            {hero.categoria && (
              <div
                className="inline-flex items-center px-2.5 py-1 rounded-[8px] mt-3"
                style={{ background: 'rgba(0,0,0,0.15)' }}
              >
                <span className="text-[11px] font-bold text-black capitalize">{hero.categoria}</span>
              </div>
            )}
          </div>

          <SeccionIdeas
            titulo="Favoritas"
            icon={<IconStar size={16} color="#C4E938" />}
            ideas={favoritas}
          />
          <SeccionIdeas titulo="Esta semana" ideas={estaSemana} />
          <SeccionIdeas titulo="Anteriores" ideas={anteriores} />
        </>
      )}
    </div>
  );
}

function SeccionIdeas({ titulo, icon, ideas }) {
  if (!ideas || ideas.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 mt-6 mb-2.5">
        {icon}
        <div className="text-[17px] font-bold tracking-tight text-ink">{titulo}</div>
        <div className="text-[13px] text-muted font-medium ml-auto">{ideas.length}</div>
      </div>
      <div className="rounded-card px-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        {ideas.map((idea, i) => (
          <div
            key={idea.id}
            className="flex items-center gap-3 py-3.5"
            style={{ borderBottom: i < ideas.length - 1 ? '1px solid #242424' : 'none' }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-ink truncate">
                {idea.titulo || 'Sin título'}
              </div>
              {idea.descripcion && (
                <div
                  className="text-[12px] text-soft mt-0.5"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {idea.descripcion}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <div className="text-[11px] text-soft">{timeAgo(idea.creado_en)}</div>
                {idea.categoria && (
                  <span className="text-[11px] font-bold capitalize" style={{ color: '#C4E938' }}>
                    · {idea.categoria}
                  </span>
                )}
              </div>
            </div>
            <IconChevronRight size={16} color="var(--text-secondary)" className="flex-shrink-0" />
          </div>
        ))}
      </div>
    </>
  );
}
