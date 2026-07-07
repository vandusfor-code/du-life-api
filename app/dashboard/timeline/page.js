'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconSearch, IconFilter, IconCalendarEvent, IconDots, IconPlus,
  IconNote, IconShoppingCart, IconUsers, IconBulb, IconSquareCheck, IconWallet,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';
import LogoComercio from '../../../components/LogoComercio';

const formatCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');

const TIPO_CONFIG = {
  nota: { label: 'Nota', color: '#C4E938', icon: IconNote },
  gasto: { label: 'Gasto', color: '#F87171', icon: IconShoppingCart },
  persona: { label: 'Persona', color: '#A78BFA', icon: IconUsers },
  idea: { label: 'Idea', color: '#FB923C', icon: IconBulb },
  tarea: { label: 'Tarea', color: '#2DD4BF', icon: IconSquareCheck },
  ingreso: { label: 'Ingreso', color: '#60A5FA', icon: IconWallet },
};

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: '7dias', label: '7 días' },
  { id: 'mes', label: 'Este mes' },
  { id: 'anio', label: String(new Date().getFullYear()) },
];

function formatHora12(dt) {
  let h = dt.getHours();
  const m = dt.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function pasaFiltro(fechaHora, filtro) {
  const ahora = new Date();
  const hoy0 = new Date(ahora);
  hoy0.setHours(0, 0, 0, 0);
  if (filtro === 'todos') return true;
  if (filtro === 'hoy') return fechaHora >= hoy0;
  if (filtro === 'ayer') {
    const ayer0 = new Date(hoy0);
    ayer0.setDate(ayer0.getDate() - 1);
    return fechaHora >= ayer0 && fechaHora < hoy0;
  }
  if (filtro === '7dias') {
    const hace7 = new Date(hoy0);
    hace7.setDate(hace7.getDate() - 6);
    return fechaHora >= hace7;
  }
  if (filtro === 'mes') {
    return fechaHora.getMonth() === ahora.getMonth() && fechaHora.getFullYear() === ahora.getFullYear();
  }
  if (filtro === 'anio') {
    return fechaHora.getFullYear() === ahora.getFullYear();
  }
  return true;
}

export default function TimelinePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');

  const cargarDatos = useCallback(() => {
    fetch('/api/dashboard/timeline')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  const items = useMemo(() => {
    if (!data) return [];
    const lista = [
      ...(data.gastos || []).map((g) => ({
        id: `gasto-${g.id}`,
        tipo: 'gasto',
        titulo: g.descripcion || 'Gasto',
        subtitulo: [g.categoria, g.metodo_pago].filter(Boolean).join(' · '),
        lugarTexto: g.lugar || g.descripcion || '',
        monto: Number(g.monto),
        fechaHora: new Date(`${g.fecha}T${g.hora || '00:00:00'}`),
      })),
      ...(data.ingresos || []).map((i) => ({
        id: `ingreso-${i.id}`,
        tipo: 'ingreso',
        titulo: i.descripcion || 'Ingreso',
        subtitulo: [i.fuente, i.metodo_pago].filter(Boolean).join(' · '),
        monto: Number(i.monto),
        fechaHora: new Date(`${i.fecha}T${i.hora || '00:00:00'}`),
      })),
      ...(data.notas || []).map((n) => ({
        id: `nota-${n.id}`,
        tipo: 'nota',
        titulo: n.titulo || 'Nota',
        subtitulo: n.contenido || '',
        fechaHora: new Date(n.creado_en),
      })),
      ...(data.ideas || []).map((i) => ({
        id: `idea-${i.id}`,
        tipo: 'idea',
        titulo: i.titulo || 'Idea',
        subtitulo: i.descripcion || '',
        fechaHora: new Date(i.creado_en),
      })),
      ...(data.tareas || []).map((t) => ({
        id: `tarea-${t.id}`,
        tipo: 'tarea',
        titulo: t.titulo,
        subtitulo: t.fecha_vencimiento ? `Vence ${t.fecha_vencimiento}` : 'Sin fecha',
        completada: !!t.completada_en,
        fechaHora: new Date(t.creado_en),
      })),
      ...(data.personas || []).map((p) => ({
        id: `persona-${p.id}`,
        tipo: 'persona',
        titulo: p.nombre,
        subtitulo: p.descripcion || '',
        fechaHora: new Date(p.creado_en),
      })),
    ];
    lista.sort((a, b) => b.fechaHora - a.fechaHora);
    return lista;
  }, [data]);

  const filtrados = useMemo(
    () => items.filter((item) => pasaFiltro(item.fechaHora, filtro)),
    [items, filtro]
  );

  const grupos = useMemo(() => {
    const mapa = {};
    const orden = [];
    filtrados.forEach((item) => {
      const key = item.fechaHora.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
      if (!mapa[key]) {
        mapa[key] = [];
        orden.push(key);
      }
      mapa[key].push(item);
    });
    return orden.map((key) => ({ mes: key, items: mapa[key] }));
  }, [filtrados]);

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32 lg:max-w-4xl lg:mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
          </div>
        </div>
        <div className="h-8 w-52 rounded animate-pulse mb-2" style={{ background: 'var(--bg-card)' }} />
        <div className="h-4 w-40 rounded animate-pulse mb-5" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-card h-[160px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <IconArrowLeft size={18} color="var(--text-primary)" />
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <IconSearch size={17} color="var(--text-primary)" />
          </button>
          <button
            type="button"
            className="relative w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <IconFilter size={17} color="var(--text-primary)" />
            <div className="absolute w-2 h-2 rounded-full" style={{ background: '#4ADE80', top: '6px', right: '7px' }} />
          </button>
        </div>
      </div>

      {/* Título */}
      <div className="text-[26px] font-bold tracking-tight text-ink">
        Línea de <span style={{ color: '#C4E938' }}>tiempo</span>
      </div>
      <div className="text-[13px] text-muted mt-1 mb-4">Tu historia, en orden cronológico.</div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <button
          type="button"
          className="flex-shrink-0 w-10 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <IconCalendarEvent size={16} color="var(--text-secondary)" />
        </button>
        {FILTROS.map((f) => {
          const active = filtro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap"
              style={{
                background: active ? '#C4E938' : 'var(--bg-card)',
                color: active ? '#0A0A0A' : 'var(--text-secondary)',
                border: active ? 'none' : '1px solid var(--border-color)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Lista cronológica */}
      {grupos.length === 0 ? (
        <div
          className="rounded-card p-8 mt-6 text-center text-muted text-[13px]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          Sin registros para este filtro.
        </div>
      ) : (
        grupos.map((grupo) => (
          <div key={grupo.mes} className="mt-6">
            <div className="text-[11px] text-soft uppercase tracking-wide font-medium mb-3">
              {grupo.mes}
            </div>
            {grupo.items.map((item, i) => {
              const cfg = TIPO_CONFIG[item.tipo];
              const Icon = cfg.icon;
              return (
                <div key={item.id} className="flex gap-3 mb-3">
                  <div className="flex flex-col items-end flex-shrink-0" style={{ width: '54px' }}>
                    <div className="text-[13px] font-bold text-ink">
                      {item.fechaHora.getDate()}{' '}
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {item.fechaHora.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '').toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] text-soft mt-0.5">{formatHora12(item.fechaHora)}</div>
                  </div>

                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: '#0A0A0A', border: `1.5px solid ${cfg.color}` }}
                    >
                      {item.tipo === 'gasto' ? (
                        <LogoComercio texto={item.lugarTexto} tamano={28} iconoFallback={<Icon size={14} color={cfg.color} />} />
                      ) : (
                        <Icon size={16} color={cfg.color} />
                      )}
                    </div>
                    {i < grupo.items.length - 1 && (
                      <div className="flex-1 w-px mt-1" style={{ background: 'var(--border-color)', minHeight: '20px' }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 rounded-card p-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div className="flex items-start justify-between">
                      <div className="text-[11px] font-bold" style={{ color: cfg.color }}>
                        {cfg.label}
                      </div>
                      <IconDots size={16} color="var(--text-secondary)" />
                    </div>
                    <div className="text-[14px] font-bold text-ink mt-0.5 truncate">{item.titulo}</div>
                    {item.subtitulo && (
                      <div className="text-[12px] text-soft mt-0.5 truncate">{item.subtitulo}</div>
                    )}
                    {(item.tipo === 'gasto' || item.tipo === 'ingreso') && (
                      <div className="flex justify-end mt-1">
                        <div
                          className="text-[14px] font-bold"
                          style={{ color: item.tipo === 'gasto' ? '#F87171' : '#4ADE80' }}
                        >
                          {item.tipo === 'gasto' ? '-' : '+'}
                          {formatCOP(item.monto)}
                        </div>
                      </div>
                    )}
                    {item.tipo === 'tarea' && item.completada && (
                      <div className="flex justify-end mt-1.5">
                        <div
                          className="px-2.5 py-1 rounded-full flex items-center gap-1"
                          style={{ background: 'rgba(74,222,128,0.15)' }}
                        >
                          <span className="text-[11px] font-bold" style={{ color: '#4ADE80' }}>
                            Completada ✓
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      {/* FAB creación rápida (aún no implementado) */}
      <div className="fixed left-5 right-5 max-w-app mx-auto pointer-events-none" style={{ bottom: '96px' }}>
        <div className="flex justify-end">
          <button
            type="button"
            aria-label="Crear"
            className="pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: '#C4E938', boxShadow: '0 8px 20px rgba(196,233,56,0.35)' }}
          >
            <IconPlus size={24} color="#0A0A0A" />
          </button>
        </div>
      </div>
    </div>
  );
}
