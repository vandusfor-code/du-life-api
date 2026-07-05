'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconFlame, IconCheck, IconClock, IconCalendar,
  IconAlertTriangle, IconChevronRight,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

function esHoy(fecha) {
  if (!fecha) return false;
  const hoy = new Date().toISOString().split('T')[0];
  return fecha === hoy;
}

function esEstaSemana(fecha) {
  if (!fecha) return false;
  const dt = new Date(fecha + 'T12:00:00');
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = Math.floor((dt - hoy) / (1000 * 60 * 60 * 24));
  return diff >= 1 && diff <= 7;
}

function formatFecha(fecha) {
  if (!fecha) return 'Sin fecha';
  const dt = new Date(fecha + 'T12:00:00');
  return dt.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatHora(hora) {
  if (!hora) return '';
  const [h, m] = hora.split(':');
  const num = parseInt(h);
  const ampm = num >= 12 ? 'pm' : 'am';
  const hora12 = num % 12 || 12;
  return `${hora12}:${m} ${ampm}`;
}

function colorPrioridad(p) {
  switch (p) {
    case 'urgente':
      return { bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', label: 'Urgente' };
    case 'importante':
    case 'alta':
      return { bg: 'rgba(251, 146, 60, 0.15)', text: '#FB923C', label: 'Importante' };
    default:
      return null;
  }
}

export default function TareasPage() {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(() => {
    fetch('/api/dashboard/tareas')
      .then((r) => r.json())
      .then((d) => {
        setTareas(d.tareas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  const grupos = useMemo(() => {
    const hoy = [];
    const semana = [];
    const masAdelante = [];
    const sinFecha = [];

    tareas.forEach((t) => {
      if (!t.fecha_vencimiento) sinFecha.push(t);
      else if (esHoy(t.fecha_vencimiento)) hoy.push(t);
      else if (esEstaSemana(t.fecha_vencimiento)) semana.push(t);
      else {
        // Ver si es futuro o pasado
        const dtT = new Date(t.fecha_vencimiento + 'T12:00:00');
        const hoyDate = new Date();
        hoyDate.setHours(0, 0, 0, 0);
        if (dtT > hoyDate) masAdelante.push(t);
        else hoy.push(t); // atrasadas van en Hoy
      }
    });

    return { hoy, semana, masAdelante, sinFecha };
  }, [tareas]);

  const urgentesHoy = grupos.hoy.filter((t) => t.prioridad === 'urgente').length;

  const marcarCompletada = useCallback(async (id) => {
    // Optimistic update
    setTareas((prev) => prev.filter((t) => t.id !== id));

    try {
      await fetch('/api/dashboard/tareas_completar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      // Si falla, recargar
      cargarDatos();
    }
  }, [cargarDatos]);

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
          <div>
            <div className="h-3 w-16 rounded animate-pulse mb-1.5" style={{ background: 'var(--bg-card)' }} />
            <div className="h-5 w-16 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
          </div>
        </div>
        <div className="rounded-hero h-[130px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-card h-[160px] mt-6 animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-card h-[120px] mt-4 animate-pulse" style={{ background: 'var(--bg-card)' }} />
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
          <div className="text-[13px] text-muted">Pendientes</div>
          <div className="text-[19px] font-bold tracking-tight text-ink">Tareas</div>
        </div>
      </div>

      {/* Hero lime */}
      <div className="rounded-hero p-5" style={{ background: '#C4E938' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <IconFlame size={15} color="#000" />
            <div className="text-[13px] text-black font-bold">Tareas para hoy</div>
          </div>
          {urgentesHoy > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-[10px]" style={{ background: '#0A0A0A' }}>
              <IconAlertTriangle size={12} color="#EF4444" />
              <span className="text-[11px] font-bold" style={{ color: '#EF4444' }}>
                {urgentesHoy} urgente{urgentesHoy > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2 mt-4">
          <div className="text-[52px] font-bold text-black tracking-tight leading-none">
            {grupos.hoy.length}
          </div>
          <div className="text-[13px] text-black font-medium">
            {grupos.hoy.length === 1 ? 'pendiente' : 'pendientes'}
          </div>
        </div>
      </div>

      {tareas.length === 0 ? (
        <div
          className="rounded-card p-8 mt-6 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="text-[14px] font-bold text-ink mb-2">
            Sin tareas pendientes
          </div>
          <div className="text-[13px] text-muted leading-relaxed">
            Dile a Du Life por WhatsApp qué tienes que hacer y aparecerá aquí.
          </div>
        </div>
      ) : (
        <>
          <SeccionTareas titulo="Hoy" tareas={grupos.hoy} onCompletar={marcarCompletada} />
          <SeccionTareas titulo="Esta semana" tareas={grupos.semana} onCompletar={marcarCompletada} />
          <SeccionTareas titulo="Más adelante" tareas={grupos.masAdelante} onCompletar={marcarCompletada} />
          <SeccionTareas titulo="Sin fecha" tareas={grupos.sinFecha} onCompletar={marcarCompletada} />
        </>
      )}
    </div>
  );
}

function SeccionTareas({ titulo, tareas, onCompletar }) {
  if (tareas.length === 0) return null;

  return (
    <>
      <div className="text-[17px] font-bold tracking-tight text-ink mt-6 mb-2.5">
        {titulo}
      </div>
      <div
        className="rounded-card px-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        {tareas.map((t, i) => {
          const prio = colorPrioridad(t.prioridad);
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 py-3.5"
              style={{
                borderBottom: i < tareas.length - 1 ? '1px solid #242424' : 'none',
              }}
            >
              <button
                onClick={() => onCompletar(t.id)}
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ border: '1.5px solid var(--text-secondary)', background: 'transparent' }}
              >
                {/* Vacío hasta que se toque */}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-ink truncate">
                  {t.titulo}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {t.fecha_vencimiento && (
                    <div className="flex items-center gap-1 text-[11px] text-soft">
                      <IconCalendar size={11} />
                      {formatFecha(t.fecha_vencimiento)}
                    </div>
                  )}
                  {t.hora_vencimiento && (
                    <div className="flex items-center gap-1 text-[11px] text-soft">
                      <IconClock size={11} />
                      {formatHora(t.hora_vencimiento)}
                    </div>
                  )}
                </div>
              </div>
              {prio && (
                <div
                  className="px-2 py-0.5 rounded-[8px] flex-shrink-0"
                  style={{ background: prio.bg }}
                >
                  <span className="text-[10px] font-bold" style={{ color: prio.text }}>
                    {prio.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}