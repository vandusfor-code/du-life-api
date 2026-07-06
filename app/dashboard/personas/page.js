'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconSearch, IconPlus,
  IconStar, IconChevronRight,
} from '@tabler/icons-react';
import Avatar from '../../../components/Avatar';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

function diasDesde(fechaISO) {
  if (!fechaISO) return null;
  const diff = Date.now() - new Date(fechaISO).getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  return dias;
}

function textoDiasDesde(dias) {
  if (dias === null) return 'sin mencionar';
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 30) return `hace ${Math.floor(dias / 7)} sem`;
  return `hace ${Math.floor(dias / 30)} mes${Math.floor(dias / 30) > 1 ? 'es' : ''}`;
}

function colorBadgeDias(dias) {
  if (dias === null || dias > 14) return { bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171' };
  if (dias > 7) return { bg: 'rgba(251, 146, 60, 0.15)', text: '#FB923C' };
  return { bg: 'rgba(196, 233, 56, 0.15)', text: '#C4E938' };
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [showBuscador, setShowBuscador] = useState(false);

  const cargarDatos = useCallback(() => {
    fetch('/api/dashboard/personas')
      .then((r) => r.json())
      .then((data) => {
        setPersonas(data.personas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  const { destacada, sinContactar, masMencionadas, todas } = useMemo(() => {
    if (!personas.length) {
      return { destacada: null, sinContactar: [], masMencionadas: [], todas: [] };
    }

    const filtradas = personas.filter((p) =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Destacada: mayor importancia
    const dest = [...filtradas].sort((a, b) => (b.importancia || 0) - (a.importancia || 0))[0];

    // Sin contactar: mayor tiempo desde última mención
    const sinContact = [...filtradas]
      .filter((p) => p.id !== dest?.id && p.ultima_mencion)
      .sort((a, b) => new Date(a.ultima_mencion) - new Date(b.ultima_mencion))
      .slice(0, 3);

    // Más mencionadas: top por veces_mencionada
    const masMen = [...filtradas]
      .sort((a, b) => (b.veces_mencionada || 0) - (a.veces_mencionada || 0))
      .slice(0, 6);

    // Todas: alfabético
    const orderAlfa = [...filtradas].sort((a, b) =>
      (a.nombre || '').localeCompare(b.nombre || '')
    );

    return {
      destacada: dest,
      sinContactar: sinContact,
      masMencionadas: masMen,
      todas: orderAlfa,
    };
  }, [personas, busqueda]);

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32 lg:max-w-4xl lg:mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
          <div>
            <div className="h-3 w-20 rounded animate-pulse mb-1.5" style={{ background: 'var(--bg-card)' }} />
            <div className="h-5 w-24 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
          </div>
        </div>
        <div className="rounded-hero h-[180px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-card h-[160px] mt-6 animate-pulse" style={{ background: 'var(--bg-card)' }} />
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-32">

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <IconArrowLeft size={18} color="var(--text-primary)" />
          </Link>
          <div>
            <div className="text-[13px] text-muted">{personas.length} contactos</div>
            <div className="text-[19px] font-bold tracking-tight text-ink">Personas</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBuscador(!showBuscador)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <IconSearch size={17} color={showBuscador ? '#C4E938' : 'var(--text-primary)'} />
          </button>
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#C4E938' }}
          >
            <IconPlus size={18} color="#0A0A0A" />
          </button>
        </div>
      </div>

      {/* Buscador (colapsable) */}
      {showBuscador && (
        <input
          type="text"
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full px-4 py-3 rounded-2xl text-[14px] outline-none mb-4"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
        />
      )}

      {/* Estado vacío global */}
      {personas.length === 0 ? (
        <div
          className="rounded-card p-8 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="text-[14px] font-bold text-ink mb-2">
            Aún no me has hablado de nadie
          </div>
          <div className="text-[13px] text-muted leading-relaxed">
            Cuéntale a Du Life sobre tu familia, amigos y parejas por WhatsApp y aparecerán aquí.
          </div>
        </div>
      ) : (
        <>
          {/* Hero: Persona destacada */}
          {destacada && (
            <div className="rounded-hero p-5" style={{ background: '#C4E938' }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <IconStar size={15} color="#000000" />
                  <div className="text-[13px] text-black font-bold">Persona destacada</div>
                </div>
                <div className="text-[11px] font-medium" style={{ color: 'rgba(0,0,0,0.7)' }}>
                  Importancia {destacada.importancia || 0}/10
                </div>
              </div>

              <div className="flex items-center gap-3.5 mt-4">
                <Avatar name={destacada.nombre} size="xl" />
                <div className="flex-1">
                  <div className="text-[19px] font-bold text-black tracking-tight leading-tight">
                    {destacada.nombre}
                  </div>
                  {destacada.descripcion && (
                    <div className="text-[13px] mt-1" style={{ color: 'rgba(0,0,0,0.7)' }}>
                      {destacada.descripcion.slice(0, 60)}
                      {destacada.descripcion.length > 60 ? '...' : ''}
                    </div>
                  )}
                  <div className="text-[11px] mt-1" style={{ color: 'rgba(0,0,0,0.6)' }}>
                    Mencionada {destacada.veces_mencionada || 0} veces
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hace tiempo sin contactar */}
          {sinContactar.length > 0 && (
            <>
              <div className="text-[17px] font-bold tracking-tight text-ink mt-6 mb-2.5">
                Hace tiempo sin contactar
              </div>
              <div
                className="rounded-card px-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                {sinContactar.map((p, i) => {
                  const dias = diasDesde(p.ultima_mencion);
                  const badge = colorBadgeDias(dias);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 py-3"
                      style={{
                        borderBottom: i < sinContactar.length - 1 ? '1px solid #242424' : 'none',
                      }}
                    >
                      <Avatar name={p.nombre} size="lg" />
                      <div className="flex-1">
                        <div className="text-[14px] font-bold text-ink">{p.nombre}</div>
                        <div className="text-[12px] text-soft mt-0.5">
                          {p.descripcion?.slice(0, 30) || 'Sin descripción'}
                          {p.descripcion?.length > 30 ? '...' : ''}
                        </div>
                      </div>
                      <div
                        className="px-2.5 py-1 rounded-[10px]"
                        style={{ background: badge.bg }}
                      >
                        <span className="text-[11px] font-bold" style={{ color: badge.text }}>
                          {textoDiasDesde(dias)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Más mencionadas (carrusel) */}
          {masMencionadas.length > 0 && (
            <>
              <div className="flex justify-between items-baseline mt-6 mb-2.5">
                <div className="text-[17px] font-bold tracking-tight text-ink">
                  Más mencionadas
                </div>
                <div className="text-[13px] text-muted font-medium">
                  {masMencionadas.length}
                </div>
              </div>
              <div className="scroll-x-hidden flex gap-2.5 -mx-5 px-5">
                {masMencionadas.map((p) => (
                  <button
                    key={p.id}
                    className="flex-shrink-0 rounded-card p-3.5 text-center"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      width: '110px',
                    }}
                  >
                    <div className="flex justify-center">
                      <Avatar name={p.nombre} size="lg" />
                    </div>
                    <div className="text-[13px] font-bold mt-2.5 text-ink truncate">
                      {p.nombre}
                    </div>
                    <div className="text-[11px] text-soft mt-0.5">
                      {p.veces_mencionada || 0}×
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Todos */}
          {todas.length > 0 && (
            <>
              <div className="flex justify-between items-baseline mt-6 mb-2.5">
                <div className="text-[17px] font-bold tracking-tight text-ink">Todos</div>
                <div className="text-[13px] text-muted font-medium">A-Z</div>
              </div>
              <div
                className="rounded-card px-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                {todas.map((p, i) => (
                  <button
                    key={p.id}
                    className="w-full flex items-center gap-3 py-3 text-left"
                    style={{
                      borderBottom: i < todas.length - 1 ? '1px solid #242424' : 'none',
                    }}
                  >
                    <Avatar name={p.nombre} size="md" />
                    <div className="flex-1">
                      <div className="text-[14px] font-bold text-ink">{p.nombre}</div>
                      {p.descripcion && (
                        <div className="text-[11px] text-soft mt-0.5">
                          {p.descripcion.slice(0, 40)}
                          {p.descripcion.length > 40 ? '...' : ''}
                        </div>
                      )}
                    </div>
                    <IconChevronRight size={17} color="var(--text-secondary)" />
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

    </div>
  );
}