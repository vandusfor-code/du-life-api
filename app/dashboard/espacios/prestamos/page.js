'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import {
  IconBell, IconChevronRight, IconWallet,
} from '@tabler/icons-react';
import Avatar from '../../../../components/Avatar';
import ProfileSheet from '../../../../components/ProfileSheet';
import { useAutoRefresh } from '../../../../components/useAutoRefresh';

const NOTIFICACIONES_MOCK = 3;
const WHATSAPP_NUEVO_PRESTAMO = 'https://wa.me/573239117508?text=Quiero%20registrar%20un%20pr%C3%A9stamo';

// Mismos tonos que el gradiente "to" de components/Avatar.js, para que el
// color de cada deudor sea consistente entre su avatar y sus gráficas.
const COLORES_DEUDOR = ['#EC4899', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#14B8A6', '#E8927C'];

function colorParaDeudor(nombre) {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h << 5) - h + nombre.charCodeAt(i);
  return COLORES_DEUDOR[Math.abs(h) % COLORES_DEUDOR.length];
}

const formatCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const formatCOPCorto = (n) => {
  const abs = Math.abs(n);
  const signo = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return signo + '$' + (abs / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return signo + '$' + Math.round(abs / 1_000) + 'k';
  return signo + '$' + Math.round(abs);
};

function calcularMetricasPrestamo(p) {
  const recuperado = p.cuotas_pagadas * p.valor_cuota + p.abono_cuota_actual;
  const porcentaje = p.cantidad_cuotas > 0 ? Math.min(100, (p.cuotas_pagadas / p.cantidad_cuotas) * 100) : 0;
  const margenGanancia = p.total_esperado > 0 ? p.ganancia_esperada / p.total_esperado : 0;
  const gananciaRealizada = recuperado * margenGanancia;
  return { recuperado, porcentaje, gananciaRealizada };
}

function proximoPagoTexto(diaPago) {
  const hoy = new Date();
  const diaHoy = hoy.getDate();
  const mes = diaHoy < diaPago
    ? hoy.toLocaleDateString('es-CO', { month: 'short' })
    : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1).toLocaleDateString('es-CO', { month: 'short' });
  return `Día ${diaPago} de ${mes.replace('.', '')}`;
}

function construirSerieMensual(movimientos, meses = 6) {
  const ahora = new Date();
  const bucket = new Map();
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    bucket.set(key, { label: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''), total: 0 });
  }
  for (const mov of movimientos) {
    const d = new Date(mov.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (bucket.has(key)) bucket.get(key).total += Number(mov.monto);
  }
  return Array.from(bucket.values());
}

// Mini gráfico de barras oscuras + línea, igual estilo al de la pantalla
// Balance (barras semitransparentes negras sobre el hero lime + línea
// blanca + punto lime final).
const MiniChartRecuperacion = memo(function MiniChartRecuperacion({ serie }) {
  const valores = serie.map((s) => s.total);
  const min = 0;
  const max = Math.max(...valores, 1);
  const rango = max - min || 1;
  const W = 130;
  const H = 58;
  const pad = 4;
  const n = serie.length;
  const slot = (W - pad * 2) / n;
  const barW = slot * 0.48;

  const puntos = serie.map((s, i) => {
    const x = pad + i * slot + slot / 2;
    const norm = (s.total - min) / rango;
    const barH = Math.max(4, norm * (H - pad * 2));
    const y = H - pad - barH;
    return { x, y, barH };
  });

  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y - 2}`).join(' ');
  const ultimo = puntos[puntos.length - 1];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      {puntos.map((p, i) => (
        <rect key={i} x={p.x - barW / 2} y={p.y} width={barW} height={p.barH} rx="3" fill="rgba(0,0,0,0.14)" />
      ))}
      <path d={linea} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {puntos.slice(0, -1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y - 2} r="2" fill="#fff" />
      ))}
      <circle cx={ultimo.x} cy={ultimo.y - 2} r="5" fill="#0A0A0A" />
    </svg>
  );
});

// Gráfica de flujo: recuperado (lime) vs pendiente (gris punteado) por mes.
const GraficaFlujoRecuperacion = memo(function GraficaFlujoRecuperacion({ serie, totalPendiente }) {
  const W = 320;
  const H = 160;
  const leftPad = 34;
  const rightPad = 8;
  const topPad = 16;
  const bottomPad = 20;
  const plotW = W - leftPad - rightPad;
  const plotH = H - topPad - bottomPad;
  const n = serie.length;
  const slot = plotW / Math.max(1, n - 1);

  const maxVal = Math.max(...serie.map((s) => s.total), totalPendiente, 1);

  const puntosRecuperado = serie.map((s, i) => ({
    x: leftPad + i * slot,
    y: topPad + plotH - (s.total / maxVal) * plotH,
  }));

  const pathRecuperado = puntosRecuperado.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const yPendiente = topPad + plotH - (totalPendiente / maxVal) * plotH;

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <line x1={leftPad} y1={yPendiente} x2={W - rightPad} y2={yPendiente} stroke="#71717A" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x={leftPad - 6} y={yPendiente + 3} textAnchor="end" fontSize="9" fill="#71717A">
        {(totalPendiente / 1000).toFixed(0)}k
      </text>
      <path d={pathRecuperado} fill="none" stroke="#C4E938" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {puntosRecuperado.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#C4E938" />
      ))}
      {serie.map((s, i) => (
        <text key={i} x={leftPad + i * slot} y={H - 4} textAnchor="middle" fontSize="9" fill="#71717A">
          {s.label}
        </text>
      ))}
    </svg>
  );
});

// Donut de distribución del capital por deudor.
const DonutDistribucion = memo(function DonutDistribucion({ segmentos }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0) || 1;
  const R = 40;
  const CX = 50;
  const CY = 50;
  const circunferencia = 2 * Math.PI * R;
  let offsetAcumulado = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#242424" strokeWidth="14" />
        {segmentos.map((s, i) => {
          const largo = (s.valor / total) * circunferencia;
          const dasharray = `${largo} ${circunferencia - largo}`;
          const el = (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={dasharray}
              strokeDashoffset={-offsetAcumulado}
            />
          );
          offsetAcumulado += largo;
          return el;
        })}
      </svg>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {segmentos.map((s, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[12px] text-white truncate flex-1">{s.nombre}</span>
            <span className="text-[11px] text-neutral-400 flex-shrink-0">{Math.round((s.valor / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default function PrestamosPage() {
  const [prestamos, setPrestamos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const cargarDatos = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard/prestamos').then((r) => r.json()),
      fetch('/api/dashboard/resumen').then((r) => r.json()),
    ])
      .then(([prestamosData, resumenData]) => {
        setPrestamos(prestamosData.prestamos || []);
        setMovimientos(prestamosData.movimientos || []);
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

  const resumen = useMemo(() => {
    let totalPrestado = 0;
    let recuperado = 0;
    let ganancia = 0;
    let completados = 0;
    let activos = 0;

    for (const p of prestamos) {
      const m = calcularMetricasPrestamo(p);
      totalPrestado += Number(p.capital);
      recuperado += m.recuperado;
      ganancia += m.gananciaRealizada;
      if (p.estado === 'completado') completados++;
      else if (p.estado === 'activo') activos++;
    }

    const rentabilidadPromedio = prestamos.length
      ? prestamos.reduce((s, p) => s + Number(p.rentabilidad), 0) / prestamos.length
      : 0;

    const totalPendiente = prestamos.reduce((s, p) => {
      const m = calcularMetricasPrestamo(p);
      return s + Math.max(0, p.total_esperado - m.recuperado);
    }, 0);

    return { totalPrestado, recuperado, ganancia, completados, activos, rentabilidadPromedio, totalPendiente };
  }, [prestamos]);

  const serieMensual = useMemo(() => construirSerieMensual(movimientos), [movimientos]);

  const segmentosDonut = useMemo(() => {
    return prestamos
      .filter((p) => p.estado === 'activo')
      .map((p) => ({ nombre: p.nombre_deudor, valor: Number(p.capital), color: colorParaDeudor(p.nombre_deudor) }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
  }, [prestamos]);

  const activos = useMemo(() => prestamos.filter((p) => p.estado === 'activo'), [prestamos]);

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32 bg-black min-h-screen">
        <div className="flex justify-between items-center mb-5">
          <div className="h-7 w-24 rounded animate-pulse bg-neutral-900" />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full animate-pulse bg-neutral-900" />
            <div className="w-10 h-10 rounded-full animate-pulse bg-neutral-900" />
          </div>
        </div>
        <div className="rounded-[20px] h-[150px] animate-pulse bg-neutral-900" />
        <div className="rounded-2xl h-[100px] mt-4 animate-pulse bg-neutral-900" />
        <div className="rounded-2xl h-[100px] mt-3 animate-pulse bg-neutral-900" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-32 bg-black min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="text-xl font-bold tracking-tight">
          <span style={{ color: '#C4E938' }}>Du</span>{' '}
          <span className="text-white">Life</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative w-10 h-10 rounded-full flex items-center justify-center bg-neutral-900 border border-neutral-800">
            <IconBell size={18} color="#fff" />
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

      {/* Hero — resumen general */}
      <div className="rounded-[20px] p-4" style={{ background: '#C4E938' }}>
        <div className="text-[15px] font-bold text-black">Mis préstamos</div>

        <div className="flex justify-between items-end mt-3">
          <div className="flex gap-4">
            <div>
              <div className="text-[10px] font-medium" style={{ color: 'rgba(0,0,0,0.6)' }}>Total prestado</div>
              <div className="text-[19px] font-bold text-black tracking-tight mt-0.5">
                {formatCOPCorto(resumen.totalPrestado)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium" style={{ color: 'rgba(0,0,0,0.6)' }}>Recuperado</div>
              <div className="text-[15px] font-bold text-black tracking-tight mt-0.5">
                {formatCOPCorto(resumen.recuperado)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium" style={{ color: 'rgba(0,0,0,0.6)' }}>Ganancia</div>
              <div className="text-[15px] font-bold text-black tracking-tight mt-0.5">
                {formatCOPCorto(resumen.ganancia)}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 ml-2">
            <MiniChartRecuperacion serie={serieMensual} />
          </div>
        </div>
      </div>

      {/* Préstamos activos */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <div className="text-[17px] font-bold tracking-tight text-white">Préstamos activos</div>
        <span className="text-[13px] text-neutral-400">{activos.length} activo{activos.length === 1 ? '' : 's'}</span>
      </div>

      {activos.length === 0 ? (
        <div className="rounded-2xl p-6 text-center text-neutral-400 text-[13px] bg-neutral-900 border border-neutral-800">
          Aún no tienes préstamos activos.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activos.map((p) => {
            const m = calcularMetricasPrestamo(p);
            return (
              <Link
                key={p.id}
                href={`/dashboard/espacios/prestamos/${p.id}`}
                prefetch
                className="rounded-2xl p-4"
                style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={p.nombre_deudor} size="md" />
                  <div className="flex-1 min-w-0 text-[15px] font-bold text-white truncate">{p.nombre_deudor}</div>
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0"
                    style={{ background: 'rgba(196,233,56,0.15)', color: '#C4E938' }}
                  >
                    Activo
                  </span>
                </div>

                <div className="mt-3">
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#2A2A2A' }}>
                    <div className="h-full rounded-full" style={{ width: `${m.porcentaje}%`, background: '#C4E938' }} />
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[11px] text-neutral-400">{p.cuotas_pagadas} de {p.cantidad_cuotas} cuotas</span>
                    <span className="text-[11px] font-bold text-white">{Math.round(m.porcentaje)}%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <span className="text-[12px] text-neutral-400">Próximo pago: {proximoPagoTexto(p.dia_pago)}</span>
                  <span className="text-[14px] font-bold" style={{ color: '#C4E938' }}>{formatCOP(p.valor_cuota)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="rounded-2xl p-4" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          <div className="text-[11px] text-neutral-400">Ganancia total</div>
          <div className="text-[18px] font-bold text-white tracking-tight mt-1">{formatCOPCorto(resumen.ganancia)}</div>
          <div className="text-[11px] mt-1" style={{ color: '#C4E938' }}>
            {resumen.rentabilidadPromedio.toFixed(1)}% rentabilidad prom.
          </div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          <div className="text-[11px] text-neutral-400">Préstamos</div>
          <div className="text-[18px] font-bold text-white tracking-tight mt-1">
            {resumen.completados} <span className="text-neutral-500 text-[13px] font-medium">completados</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">{resumen.activos} activos</div>
        </div>
      </div>

      {/* Gráfica: flujo de recuperación */}
      {prestamos.length > 0 && (
        <div className="rounded-2xl p-4 mt-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          <div className="text-[12px] text-neutral-400 uppercase tracking-wide font-medium mb-2">
            Flujo de recuperación
          </div>
          <GraficaFlujoRecuperacion serie={serieMensual} totalPendiente={resumen.totalPendiente} />
        </div>
      )}

      {/* Gráfica: distribución por deudor */}
      {segmentosDonut.length > 0 && (
        <div className="rounded-2xl p-4 mt-3" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          <div className="text-[12px] text-neutral-400 uppercase tracking-wide font-medium mb-3">
            Distribución por deudor
          </div>
          <DonutDistribucion segmentos={segmentosDonut} />
        </div>
      )}

      {/* Botón flotante */}
      <a
        href={WHATSAPP_NUEVO_PRESTAMO}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed left-5 right-5 z-40 flex items-center justify-center py-3.5 rounded-full font-bold text-[15px] active:scale-[0.98] transition-transform duration-150"
        style={{
          bottom: 'calc(64px + env(safe-area-inset-bottom) + 12px)',
          background: '#C4E938',
          color: '#0A0A0A',
          maxWidth: '390px',
          margin: '0 auto',
        }}
      >
        + Nuevo préstamo
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
