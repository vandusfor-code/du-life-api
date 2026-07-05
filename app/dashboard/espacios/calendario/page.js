'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  IconBell, IconCalendar, IconChevronDown,
  IconBriefcase, IconBook2, IconUser, IconHeartbeat,
} from '@tabler/icons-react';
import Avatar from '../../../../components/Avatar';
import ProfileSheet from '../../../../components/ProfileSheet';
import { useAutoRefresh } from '../../../../components/useAutoRefresh';

const WHATSAPP_AGENDAR_LINK = 'https://wa.me/573239117508?text=Agendar%20evento%3A%20';
const NOTIFICACIONES_MOCK = 3;

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const CATEGORIA_CONFIG = {
  trabajo: { color: '#C4E938', label: 'Trabajo', icon: IconBriefcase },
  estudio: { color: '#00BFA5', label: 'Estudio', icon: IconBook2 },
  personal: { color: '#FF9800', label: 'Personal', icon: IconUser },
  salud: { color: '#2196F3', label: 'Salud', icon: IconHeartbeat },
};

function construirSemana() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diaSemana = hoy.getDay(); // 0=domingo .. 6=sábado
  const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + offsetLunes);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return {
      fechaStr: d.toISOString().split('T')[0],
      dia: DIAS_SEMANA[i],
      numero: d.getDate(),
      esHoy: d.toDateString() === hoy.toDateString(),
    };
  });
}

function formatFechaLarga(fechaStr) {
  const d = new Date(fechaStr + 'T12:00:00');
  const s = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatEtiquetaPill(fechaStr) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const d = new Date(fechaStr + 'T12:00:00');
  d.setHours(0, 0, 0, 0);
  const diffDias = Math.round((d - hoy) / 86400000);
  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Mañana';
  if (diffDias === -1) return 'Ayer';
  const dia = d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
  return dia.charAt(0).toUpperCase() + dia.slice(1);
}

function formatHora(horaStr) {
  if (!horaStr) return '';
  const [h, m] = horaStr.split(':');
  return `${h}:${m}`;
}

// Ilustración decorativa: libreta con espiral + calendario + lápiz, en los
// mismos tonos oliva/lima del resto de la pantalla (no un ícono genérico).
function IlustracionAgenda() {
  return (
    <svg width="88" height="76" viewBox="0 0 88 76" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="14" width="52" height="58" rx="8" fill="#23281A" stroke="#3A4226" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={24 + i * 8} y="9" width="5" height="12" rx="2.5" fill="#C4E938" opacity="0.85" />
      ))}
      <rect x="26" y="28" width="30" height="22" rx="4" fill="#171B10" />
      <line x1="26" y1="35" x2="56" y2="35" stroke="#3A4226" strokeWidth="1" />
      {[0, 1, 2].map((row) => (
        [0, 1, 2, 3].map((col) => (
          <circle key={`${row}-${col}`} cx={30 + col * 8} cy={39.5 + row * 5} r="1.4" fill="#C4E938" opacity={row === 0 && col === 2 ? 1 : 0.35} />
        ))
      ))}
      <rect x="26" y="55" width="26" height="3" rx="1.5" fill="#3A4226" />
      <rect x="26" y="61" width="18" height="3" rx="1.5" fill="#3A4226" />
      <g transform="rotate(28 64 55)">
        <rect x="61" y="18" width="6" height="42" rx="3" fill="#EBEFD8" />
        <path d="M61 18 L67 18 L64 10 Z" fill="#C4E938" />
      </g>
    </svg>
  );
}

export default function CalendarioPage() {
  const [eventos, setEventos] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const cargarDatos = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard/calendario').then((r) => r.json()),
      fetch('/api/dashboard/resumen').then((r) => r.json()),
    ])
      .then(([calData, resumenData]) => {
        setEventos(calData.eventos || []);
        setUsuario(resumenData.usuario);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  const nombre = usuario?.como_llamar || usuario?.nombre || 'Duvan';
  const semana = useMemo(() => construirSemana(), []);
  const diaActivo = diaSeleccionado ?? semana.find((d) => d.esHoy)?.fechaStr;

  const diasConEventos = useMemo(() => {
    const set = new Set();
    for (const ev of eventos) set.add(ev.fecha);
    return set;
  }, [eventos]);

  const eventosDia = useMemo(
    () => eventos.filter((ev) => ev.fecha === diaActivo),
    [eventos, diaActivo]
  );

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32 bg-page min-h-screen">
        <div className="flex justify-between items-center mb-5">
          <div className="h-7 w-24 rounded animate-pulse bg-surface" />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full animate-pulse bg-surface" />
            <div className="w-10 h-10 rounded-full animate-pulse bg-surface" />
          </div>
        </div>
        <div className="h-24 rounded-2xl animate-pulse mb-5 bg-surface" />
        <div className="h-16 rounded-2xl animate-pulse mb-5 bg-surface" />
        <div className="rounded-2xl h-[300px] animate-pulse bg-surface" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-32 bg-page min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="relative flex items-center">
          <span className="text-xl font-bold tracking-tight" style={{ color: '#C4E938' }}>Du</span>
          <span className="text-xl font-bold tracking-tight text-ink">&nbsp;Life</span>
          <span className="text-[13px]" style={{ color: '#C4E938', marginLeft: '2px', marginTop: '-14px' }}>✦</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative w-10 h-10 rounded-full flex items-center justify-center bg-surface border border-hairline">
            <IconBell size={18} color="var(--text-primary)" />
            {NOTIFICACIONES_MOCK > 0 && (
              <div
                className="absolute flex items-center justify-center rounded-full"
                style={{ width: '16px', height: '16px', background: '#C4E938', top: '-2px', right: '-2px' }}
              >
                <span className="font-bold" style={{ fontSize: '9px', color: '#0A0A0A' }}>
                  {NOTIFICACIONES_MOCK}
                </span>
              </div>
            )}
          </button>
          <button type="button" onClick={() => setShowProfile(true)}>
            <Avatar name={nombre} size="md" />
          </button>
        </div>
      </div>

      {/* Hero card */}
      <div
        className="rounded-2xl p-4 mb-5 flex items-center justify-between overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'rgba(196,233,56,0.15)' }}
          >
            <IconCalendar size={20} color="#C4E938" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold tracking-tight leading-snug">
              <span className="text-ink">Tu </span>
              <span style={{ color: '#C4E938' }}>agenda</span>
              <span className="text-ink"> de hoy</span>
            </div>
            <div className="text-[12px] text-muted mt-1 leading-snug">
              Organiza tu día, enfócate y logra más.
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          <IlustracionAgenda />
        </div>
      </div>

      {/* Selector de semana */}
      <div className="flex justify-between gap-1 mb-5">
        {semana.map((d) => {
          const activo = d.fechaStr === diaActivo;
          const tieneEventos = diasConEventos.has(d.fechaStr);
          return (
            <button
              key={d.fechaStr}
              onClick={() => setDiaSeleccionado(d.fechaStr)}
              className="flex flex-col items-center gap-1.5 flex-1 py-1"
            >
              <span className="text-[11px] text-muted">{d.dia}</span>
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
                style={{
                  background: activo ? '#C4E938' : 'transparent',
                  color: activo ? '#000' : 'var(--text-secondary)',
                }}
              >
                {d.numero}
              </span>
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: tieneEventos ? '#C4E938' : 'transparent' }}
              />
            </button>
          );
        })}
      </div>

      {/* Header del día */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <IconCalendar size={15} color="#C4E938" className="flex-shrink-0" />
          <span className="text-[15px] font-bold text-ink capitalize truncate">
            {formatFechaLarga(diaActivo)}
          </span>
        </div>
        <span
          className="flex items-center gap-0.5 px-3 py-1 rounded-full text-[12px] font-bold flex-shrink-0"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: '#C4E938' }}
        >
          {formatEtiquetaPill(diaActivo)}
          <IconChevronDown size={12} color="#C4E938" />
        </span>
      </div>

      {/* Timeline de eventos */}
      {eventosDia.length === 0 ? (
        <div className="rounded-2xl p-6 text-center text-muted text-[13px] bg-surface border border-hairline">
          No tienes eventos este día. ¡Agenda algo! 📅
        </div>
      ) : (
        <div className="flex">
          <div className="flex flex-col items-center pr-3" style={{ width: '52px' }}>
            {eventosDia.map((ev, i) => {
              const cfg = CATEGORIA_CONFIG[ev.categoria] || CATEGORIA_CONFIG.personal;
              return (
                <div key={ev.id} className="flex flex-col items-center" style={{ flex: 1, minHeight: '84px' }}>
                  <div className="text-[11px] text-soft text-center leading-tight">
                    {formatHora(ev.hora_inicio)}
                  </div>
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: cfg.color }} />
                  {i < eventosDia.length - 1 && (
                    <div className="flex-1 w-px mt-1" style={{ background: 'var(--border-color)' }} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            {eventosDia.map((ev) => {
              const cfg = CATEGORIA_CONFIG[ev.categoria] || CATEGORIA_CONFIG.personal;
              const Icon = cfg.icon;
              return (
                <div
                  key={ev.id}
                  className="rounded-2xl p-3.5 flex items-center gap-3"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', minHeight: '76px' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cfg.color}26` }}
                  >
                    <Icon size={18} color={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-ink leading-snug">{ev.titulo}</div>
                    <div className="text-[12px] text-muted mt-0.5">
                      {formatHora(ev.hora_inicio)} – {formatHora(ev.hora_fin)}
                    </div>
                  </div>
                  <span
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold flex-shrink-0 whitespace-nowrap"
                    style={{ background: `${cfg.color}1F`, color: cfg.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botón flotante Agregar evento */}
      <a
        href={WHATSAPP_AGENDAR_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed left-5 right-5 z-40 flex items-center justify-center gap-1.5 h-13 py-3.5 rounded-full font-bold text-[15px] active:scale-[0.98] transition-transform duration-150"
        style={{
          bottom: 'calc(64px + env(safe-area-inset-bottom) + 12px)',
          background: '#C4E938',
          color: '#0A0A0A',
          maxWidth: '390px',
          margin: '0 auto',
        }}
      >
        + Agregar evento <span style={{ fontSize: '15px' }}>›</span>
      </a>

      <ProfileSheet
        open={showProfile}
        onClose={() => setShowProfile(false)}
        nombre={nombre}
        telefono={usuario?.telefono}
        plan={usuario?.plan}
        onNombreActualizado={(nuevo) => setUsuario((u) => ({ ...u, como_llamar: nuevo }))}
      />

    </div>
  );
}
