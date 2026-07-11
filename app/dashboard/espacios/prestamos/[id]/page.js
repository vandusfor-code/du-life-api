'use client';

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconWallet, IconClock, IconChartBar,
  IconCoin, IconPlus, IconPlayerTrackNext, IconPencil, IconGift,
  IconHourglass, IconCircleCheck, IconCalendarEvent, IconBellRinging,
} from '@tabler/icons-react';
import Avatar from '../../../../../components/Avatar';
import { useAutoRefresh } from '../../../../../components/useAutoRefresh';

const formatCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');

const ESTADO_CONFIG = {
  activo: { label: 'Activo', bg: 'rgba(196,233,56,0.15)', color: '#C4E938' },
  completado: { label: 'Completado', bg: '#242424', color: 'var(--text-secondary)' },
  cancelado: { label: 'Cancelado', bg: 'rgba(248,113,113,0.15)', color: '#F87171' },
};

const TIPO_MOVIMIENTO_CONFIG = {
  pago_completo: { icon: IconCoin, color: '#4ADE80', label: 'Pago completo' },
  abono: { icon: IconPlus, color: '#EAB308', label: 'Abono' },
  pago_adelantado: { icon: IconPlayerTrackNext, color: '#3B82F6', label: 'Pago adelantado' },
  ajuste: { icon: IconPencil, color: 'var(--text-secondary)', label: 'Ajuste' },
  condonacion: { icon: IconGift, color: '#A78BFA', label: 'Condonación' },
};

function formatFechaHora(fechaISO) {
  const d = new Date(fechaISO);
  const fecha = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  const hora = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${fecha}, ${hora}`;
}

function formatMesTitulo(fechaISO) {
  const d = new Date(fechaISO);
  const s = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function calcularDiasRestantes(diaPago) {
  const hoy = new Date();
  const diaHoy = hoy.getDate();
  let objetivo = new Date(hoy.getFullYear(), hoy.getMonth(), diaPago);
  if (diaHoy >= diaPago) objetivo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaPago);
  objetivo.setHours(0, 0, 0, 0);
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((objetivo - hoySinHora) / 86400000);
}

function calcularFechaCierreEstimada(fechaInicioISO, cantidadCuotas) {
  const d = new Date(fechaInicioISO);
  d.setMonth(d.getMonth() + cantidadCuotas);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

const GraficaPagosPorMes = memo(function GraficaPagosPorMes({ movimientos }) {
  const meses = useMemo(() => {
    const ahora = new Date();
    const bucket = new Map();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      bucket.set(key, {
        label: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
        completo: 0,
        abono: 0,
      });
    }
    for (const mov of movimientos) {
      const d = new Date(mov.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!bucket.has(key)) continue;
      const b = bucket.get(key);
      if (mov.tipo === 'abono') b.abono += Number(mov.monto);
      else b.completo += Number(mov.monto);
    }
    return Array.from(bucket.values());
  }, [movimientos]);

  const W = 320;
  const H = 150;
  const leftPad = 32;
  const rightPad = 8;
  const topPad = 12;
  const bottomPad = 20;
  const plotW = W - leftPad - rightPad;
  const plotH = H - topPad - bottomPad;
  const slotW = plotW / meses.length;
  const barW = slotW * 0.3;
  const maxVal = Math.max(...meses.map((m) => m.completo + m.abono), 1);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {meses.map((m, i) => {
        const x = leftPad + i * slotW + slotW / 2;
        const alturaCompleto = (m.completo / maxVal) * plotH;
        const alturaAbono = (m.abono / maxVal) * plotH;
        const yCompleto = topPad + plotH - alturaCompleto;
        const yAbono = yCompleto - alturaAbono;
        return (
          <g key={i}>
            {m.completo > 0 && (
              <rect x={x - barW / 2} y={yCompleto} width={barW} height={alturaCompleto} rx="2" fill="#C4E938" />
            )}
            {m.abono > 0 && (
              <rect x={x - barW / 2} y={yAbono} width={barW} height={alturaAbono} rx="2" fill="#EAB308" />
            )}
            <text x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
});

function RecordatorioPagoDeudor({ prestamo, onActualizado }) {
  const [editando, setEditando] = useState(false);
  const [telefono, setTelefono] = useState(prestamo.telefono_deudor || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const guardarPrestamo = useCallback(async (updates) => {
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch(`/api/dashboard/prestamos?id=${prestamo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo guardar');
      onActualizado(data.prestamo);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setGuardando(false);
    }
  }, [prestamo.id, onActualizado]);

  const activar = async () => {
    if (!prestamo.telefono_deudor) {
      setEditando(true);
      return;
    }
    await guardarPrestamo({ recordatorio_pago_activo: true });
  };

  const desactivar = async () => {
    await guardarPrestamo({ recordatorio_pago_activo: false });
  };

  const guardarNumero = async () => {
    if (!telefono.trim()) {
      setError('Escribe el número de WhatsApp del deudor');
      return;
    }
    const ok = await guardarPrestamo({ telefono_deudor: telefono.trim(), recordatorio_pago_activo: true });
    if (ok) setEditando(false);
  };

  return (
    <div className="rounded-2xl p-4 mt-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,233,56,0.15)' }}>
          <IconBellRinging size={20} color="#C4E938" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-ink">Recordatorio de pago</div>
          <div className="text-[12px] text-muted mt-0.5">
            {prestamo.recordatorio_pago_activo
              ? `Le avisamos a ${prestamo.nombre_deudor} cada día ${prestamo.dia_pago} al ${prestamo.telefono_deudor}`
              : 'Avísale automáticamente por WhatsApp el día de pago'}
          </div>
        </div>
        <button
          type="button"
          disabled={guardando}
          onClick={prestamo.recordatorio_pago_activo ? desactivar : activar}
          className="w-11 h-6 rounded-full flex-shrink-0"
          style={{
            position: 'relative',
            background: prestamo.recordatorio_pago_activo ? '#C4E938' : '#3A3A44',
            transition: 'background-color 0.2s ease',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '2px',
              left: prestamo.recordatorio_pago_activo ? '22px' : '2px',
              width: '20px',
              height: '20px',
              borderRadius: '9999px',
              background: '#FFFFFF',
              transition: 'left 0.2s ease',
            }}
          />
        </button>
      </div>

      {editando && !prestamo.recordatorio_pago_activo && (
        <div className="mt-3 flex flex-col gap-2">
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Número de WhatsApp del deudor (ej. 573001234567)"
            className="w-full h-10 rounded-xl px-3 text-[13px]"
            style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
          {error && <div className="text-[11px]" style={{ color: '#F87171' }}>{error}</div>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={guardarNumero}
              disabled={guardando}
              className="flex-1 h-10 rounded-full text-[13px] font-bold"
              style={{ background: '#C4E938', color: '#0D0D11' }}
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => { setEditando(false); setError(null); }}
              className="flex-1 h-10 rounded-full text-[13px] font-bold"
              style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrestamoDetallePage({ params }) {
  const { id } = params;
  const [prestamo, setPrestamo] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const statsRef = useRef(null);

  const cargarDatos = useCallback(() => {
    fetch(`/api/dashboard/prestamos?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setPrestamo(data.prestamo || null);
        setMovimientos(data.movimientos || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  const movimientosPorMes = useMemo(() => {
    const grupos = {};
    for (const mov of movimientos) {
      const key = formatMesTitulo(mov.created_at);
      (grupos[key] ||= []).push(mov);
    }
    return grupos;
  }, [movimientos]);

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32 bg-page min-h-screen lg:max-w-4xl lg:mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full animate-pulse bg-surface" />
          <div className="h-6 w-32 rounded animate-pulse bg-surface" />
        </div>
        <div className="rounded-2xl h-[220px] animate-pulse bg-surface" />
      </div>
    );
  }

  if (!prestamo) {
    return (
      <div className="px-5 pt-4 pb-32 bg-page min-h-screen lg:max-w-4xl lg:mx-auto">
        <Link href="/dashboard/espacios/prestamos" className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-surface border border-hairline">
            <IconArrowLeft size={18} color="var(--text-primary)" />
          </div>
          <span className="text-ink font-bold">Volver</span>
        </Link>
        <div className="text-center text-muted text-[13px] mt-10">No encontré este préstamo.</div>
      </div>
    );
  }

  const cfg = ESTADO_CONFIG[prestamo.estado] || ESTADO_CONFIG.activo;
  const recuperado = prestamo.cuotas_pagadas * prestamo.valor_cuota + prestamo.abono_cuota_actual;
  const saldoPendiente = Math.max(0, prestamo.total_esperado - recuperado);
  const porcentaje = prestamo.cantidad_cuotas > 0 ? Math.min(100, (prestamo.cuotas_pagadas / prestamo.cantidad_cuotas) * 100) : 0;
  const cuotasRestantes = Math.max(0, prestamo.cantidad_cuotas - prestamo.cuotas_pagadas);
  const diasRestantes = calcularDiasRestantes(prestamo.dia_pago);
  const faltaParaCuota = Math.max(0, prestamo.valor_cuota - prestamo.abono_cuota_actual);
  const mensajePago = encodeURIComponent(`Registrar pago de préstamo - ${prestamo.nombre_deudor}: `);

  return (
    <div className="px-5 pt-4 pb-32 bg-page min-h-screen">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/dashboard/espacios/prestamos"
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-surface border border-hairline"
        >
          <IconArrowLeft size={18} color="var(--text-primary)" />
        </Link>
        <Avatar name={prestamo.nombre_deudor} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-bold text-ink truncate">{prestamo.nombre_deudor}</div>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Card resumen principal */}
      <div className="rounded-[20px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="text-[12px] text-muted">Capital prestado</div>
        <div className="text-[28px] font-bold text-ink tracking-tight mt-0.5">{formatCOP(prestamo.capital)}</div>

        <div className="mt-4">
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
            <div className="h-full rounded-full" style={{ width: `${porcentaje}%`, background: '#C4E938' }} />
          </div>
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-[11px] text-muted">{prestamo.cuotas_pagadas} de {prestamo.cantidad_cuotas} cuotas</span>
            <span className="text-[11px] font-bold text-ink">{Math.round(porcentaje)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div>
            <div className="text-[11px] text-muted flex items-center gap-1"><IconCoin size={13} />Recuperado</div>
            <div className="text-[15px] font-bold text-ink mt-0.5">{formatCOP(recuperado)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted flex items-center gap-1"><IconHourglass size={13} />Saldo pendiente</div>
            <div className="text-[15px] font-bold text-ink mt-0.5">{formatCOP(saldoPendiente)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted flex items-center gap-1"><IconCircleCheck size={13} />Cuotas pagadas</div>
            <div className="text-[15px] font-bold text-ink mt-0.5">{prestamo.cuotas_pagadas}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted flex items-center gap-1"><IconCalendarEvent size={13} />Cuotas restantes</div>
            <div className="text-[15px] font-bold text-ink mt-0.5">{cuotasRestantes}</div>
          </div>
        </div>
      </div>

      {/* Gráfica de pagos */}
      <div className="rounded-2xl p-4 mt-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="text-[12px] text-muted uppercase tracking-wide font-medium">Pagos por mes</div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="w-2 h-2 rounded-full" style={{ background: '#C4E938' }} />
            <span className="text-[10px] text-muted">Completo</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#EAB308' }} />
            <span className="text-[10px] text-muted">Abono</span>
          </div>
        </div>
        <GraficaPagosPorMes movimientos={movimientos} />
      </div>

      {/* Próximo pago */}
      {prestamo.estado === 'activo' && (
        <div className="rounded-2xl p-4 mt-4 flex items-center gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,233,56,0.15)' }}>
            <IconClock size={20} color="#C4E938" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-ink">Día {prestamo.dia_pago} · en {diasRestantes} día{diasRestantes === 1 ? '' : 's'}</div>
            <div className="text-[12px] text-muted mt-0.5">
              {prestamo.abono_cuota_actual > 0
                ? `Abonado $${Math.round(prestamo.abono_cuota_actual).toLocaleString('es-CO')} · falta ${formatCOP(faltaParaCuota)}`
                : `Cuota completa`}
            </div>
          </div>
          <div className="text-[16px] font-bold flex-shrink-0" style={{ color: '#C4E938' }}>{formatCOP(prestamo.valor_cuota)}</div>
        </div>
      )}

      {/* Recordatorio de pago al deudor */}
      {prestamo.estado === 'activo' && (
        <RecordatorioPagoDeudor prestamo={prestamo} onActualizado={setPrestamo} />
      )}

      {/* Historial de movimientos */}
      <div className="mt-6">
        <div className="text-[17px] font-bold tracking-tight text-ink mb-3">Historial</div>

        {movimientos.length === 0 ? (
          <div className="rounded-2xl p-6 text-center text-muted text-[13px] bg-surface border border-hairline">
            Aún no hay movimientos registrados.
          </div>
        ) : (
          Object.entries(movimientosPorMes).map(([mes, movs]) => (
            <div key={mes} className="mb-4">
              <div className="text-[12px] font-bold text-muted uppercase tracking-wide mb-2">{mes}</div>
              <div className="rounded-2xl px-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                {movs.map((mov, i) => {
                  const tcfg = TIPO_MOVIMIENTO_CONFIG[mov.tipo] || TIPO_MOVIMIENTO_CONFIG.ajuste;
                  const TipoIcon = tcfg.icon;
                  return (
                    <div
                      key={mov.id}
                      className="flex items-center gap-3 py-3.5"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${tcfg.color}26` }}
                      >
                        <TipoIcon size={16} color={tcfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-ink truncate">{tcfg.label}</div>
                        <div className="text-[11px] text-soft mt-0.5">{formatFechaHora(mov.created_at)}</div>
                      </div>
                      <div className="text-[14px] font-bold flex-shrink-0" style={{ color: tcfg.color }}>
                        {formatCOP(mov.monto)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Estadísticas del préstamo */}
      <div ref={statsRef} className="rounded-2xl p-4 mt-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="text-[12px] text-muted uppercase tracking-wide font-medium mb-3">Estadísticas</div>
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-muted">Capital original</span>
            <span className="text-[13px] font-bold text-ink">{formatCOP(prestamo.capital)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-muted">Total esperado</span>
            <span className="text-[13px] font-bold text-ink">{formatCOP(prestamo.total_esperado)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-muted">Ganancia esperada</span>
            <span className="text-[13px] font-bold" style={{ color: '#C4E938' }}>{formatCOP(prestamo.ganancia_esperada)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-muted">Rentabilidad</span>
            <span className="text-[13px] font-bold" style={{ color: '#C4E938' }}>{Number(prestamo.rentabilidad).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-muted">Fecha de inicio</span>
            <span className="text-[13px] font-bold text-ink">
              {new Date(prestamo.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-muted">Cierre estimado</span>
            <span className="text-[13px] font-bold text-ink">
              {calcularFechaCierreEstimada(prestamo.created_at, prestamo.cantidad_cuotas)}
            </span>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 mt-5">
        <a
          href={`https://wa.me/573239117508?text=${mensajePago}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full text-[13px] font-bold"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: '#C4E938' }}
        >
          <IconWallet size={16} color="#C4E938" /> Registrar pago
        </a>
        <button
          type="button"
          onClick={() => statsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full text-[13px] font-bold"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <IconChartBar size={16} color="var(--text-secondary)" /> Ver estadísticas
        </button>
      </div>

    </div>
  );
}
