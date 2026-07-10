'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  IconUsers, IconMessageCircle, IconSend, IconSparkles, IconDatabase,
  IconBrandWhatsapp, IconClock, IconCloud, IconCoins, IconBellRinging,
  IconUserPlus, IconNote, IconBulb, IconCalendarEvent, IconMoodSmile,
  IconWorldSearch, IconPencil, IconDots, IconReceipt2,
} from '@tabler/icons-react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

function timeAgo(fechaISO) {
  if (!fechaISO) return null;
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace segundos';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias}d`;
}

const ICONO_EVENTO = {
  mensaje: IconMessageCircle,
  usuario_nuevo: IconUserPlus,
  prestamo: IconCoins,
  recordatorio: IconBellRinging,
};

const ICONO_INTENCION = {
  gasto: IconReceipt2,
  ingreso: IconCoins,
  tarea: IconClock,
  recordatorio: IconBellRinging,
  nota: IconNote,
  idea: IconBulb,
  crear_evento: IconCalendarEvent,
  consulta_agenda: IconCalendarEvent,
  crear_prestamo: IconCoins,
  registrar_pago_prestamo: IconCoins,
  consulta_prestamo: IconCoins,
  busqueda_web: IconWorldSearch,
  redactar_mensaje: IconPencil,
  saludo: IconMoodSmile,
  otro: IconDots,
};

// Paleta fija (no depende del tema claro/oscuro): el acento lima primero,
// el resto tonos que ya conviven bien con él en el resto del proyecto.
const PALETA_DONA = ['#C4E938', '#7DD3FC', '#F59E0B', '#A78BFA', '#F87171', '#55555F'];

function MetricCard({ icon: Icon, label, valor, nota }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent-bg)' }}
        >
          <Icon size={15} color="var(--accent)" />
        </div>
      </div>
      <div className="text-[28px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {valor}
      </div>
      {nota && (
        <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{nota}</div>
      )}
    </div>
  );
}

function EstadoDot({ activo }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: activo ? 'var(--cc-success)' : 'var(--text-muted)' }}
    />
  );
}

function TarjetaEstado({ icon: Icon, nombre, principal, secundario, activo }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} color="var(--text-secondary)" />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{nombre}</span>
        </div>
        <EstadoDot activo={activo} />
      </div>
      <div className="text-[13px] font-medium" style={{ color: activo ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {principal}
      </div>
      {secundario && (
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{secundario}</div>
      )}
    </div>
  );
}

function DonaIntenciones({ datos }) {
  const total = datos.reduce((s, d) => s + d.total, 0);
  const top5 = datos.slice(0, 5);
  const resto = datos.slice(5).reduce((s, d) => s + d.total, 0);
  const chartData = resto > 0 ? [...top5, { intencion: 'otros', total: resto }] : top5;

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Intenciones de hoy</div>
      <div className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>Qué le está pidiendo la gente al asistente</div>

      {total === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Sin mensajes procesados todavía hoy.
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div style={{ width: 140, height: 140, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="total"
                  nameKey="intencion"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={PALETA_DONA[i % PALETA_DONA.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {chartData.map((d, i) => {
              const Icon = ICONO_INTENCION[d.intencion] || IconDots;
              const pct = Math.round((d.total / total) * 100);
              return (
                <div key={d.intencion} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PALETA_DONA[i % PALETA_DONA.length] }} />
                  <Icon size={13} color="var(--text-secondary)" />
                  <span className="text-[12px] flex-1 truncate capitalize" style={{ color: 'var(--text-primary)' }}>
                    {d.intencion.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TendenciaMensajes({ datos }) {
  const data = datos.map((d) => ({
    dia: new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short' }),
    total: d.total,
  }));

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Mensajes procesados</div>
      <div className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>Últimos 7 días</div>
      <div style={{ width: '100%', height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTendencia" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C4E938" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#C4E938" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="dia"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--text-primary)' }}
              itemStyle={{ color: 'var(--accent)' }}
            />
            <Area type="monotone" dataKey="total" stroke="#C4E938" strokeWidth={2} fill="url(#gradTendencia)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function UsuariosRecientes({ usuarios }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="px-5 pt-4 pb-3 text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
        Usuarios recientes
      </div>
      {usuarios.length === 0 ? (
        <div className="px-5 pb-5 text-[12px]" style={{ color: 'var(--text-muted)' }}>Sin usuarios todavía.</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr style={{ borderTop: '1px solid var(--border-color)' }}>
              <th className="text-left px-5 py-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Nombre</th>
              <th className="text-left px-5 py-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Plan</th>
              <th className="text-right px-5 py-2 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Registrado</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-2.5 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{u.nombre}</td>
                <td className="px-5 py-2.5">
                  <span
                    className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                    style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                  >
                    {u.plan}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-[12px] text-right" style={{ color: 'var(--text-secondary)' }}>
                  {timeAgo(u.creado_en)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PanelNotificaciones({ actividad }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="px-5 pt-4 pb-3 text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
        Actividad reciente
      </div>
      {actividad.length === 0 ? (
        <div className="px-5 pb-5 text-[12px]" style={{ color: 'var(--text-muted)' }}>Sin actividad reciente todavía.</div>
      ) : (
        <div className="pb-2">
          {actividad.slice(0, 10).map((e, i) => {
            const Icon = ICONO_EVENTO[e.tipo] || IconMessageCircle;
            return (
              <div key={`${e.tipo}-${e.fecha}-${i}`} className="flex items-start gap-3 px-5 py-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-bg)' }}
                >
                  <Icon size={14} color="var(--accent)" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] leading-snug" style={{ color: 'var(--text-primary)' }}>{e.texto}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{timeAgo(e.fecha)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ControlCenterDashboard() {
  const [datos, setDatos] = useState(null);
  const [actividad, setActividad] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard/admin_dashboard').then((r) => r.json()),
      fetch('/api/dashboard/admin_actividad').then((r) => r.json()),
    ])
      .then(([dashboardData, actividadData]) => {
        if (!dashboardData.error) setDatos(dashboardData);
        if (!actividadData.error) setActividad(actividadData.eventos || []);
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

  // Cada 5s: "en vivo" sin recargar la página, reutilizando el mismo
  // patrón de auto-refresh que ya usa el resto del dashboard (sin agregar
  // Supabase Realtime + canales/RLS nuevos para una herramienta interna).
  useAutoRefresh(cargarDatos, 5000);

  if (loading || !datos) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 rounded animate-pulse mb-6" style={{ background: 'var(--bg-card)' }} />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      </div>
    );
  }

  const { contadores, estado_sistema: estado, tendencia_mensajes, distribucion_intenciones, usuarios_recientes } = datos;
  const claudeActivo = estado.claude.ultima_llamada && (Date.now() - new Date(estado.claude.ultima_llamada).getTime()) < 30 * 60 * 1000;
  const metaActivo = estado.meta.ultima_actividad && (Date.now() - new Date(estado.meta.ultima_actividad).getTime()) < 30 * 60 * 1000;
  const cronActivo = !!estado.cron.ultima_ejecucion;

  return (
    <div className="p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Dashboard del sistema
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Se actualiza solo cada 5 segundos — no hace falta recargar.
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard icon={IconUsers} label="Usuarios registrados" valor={contadores.usuarios_registrados} nota={`${contadores.usuarios_activos} activos`} />
        <MetricCard icon={IconMessageCircle} label="Conversaciones hoy" valor={contadores.conversaciones_hoy} />
        <MetricCard icon={IconSend} label="Mensajes enviados hoy" valor={contadores.mensajes_enviados_hoy} nota={`${contadores.mensajes_recibidos_hoy} recibidos`} />
        <MetricCard icon={IconCoins} label="Préstamos activos" valor={contadores.prestamos_activos} nota={`${contadores.recordatorios_enviados_hoy} recordatorios hoy`} />
      </div>

      {/* Cuerpo: contenido principal (2/3) + panel lateral (1/3) */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <DonaIntenciones datos={distribucion_intenciones} />
            <TendenciaMensajes datos={tendencia_mensajes} />
          </div>

          <div>
            <div className="text-[12px] font-black uppercase mb-3" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
              Estado del sistema
            </div>
            <div className="grid grid-cols-5 gap-4">
              <TarjetaEstado
                icon={IconSparkles}
                nombre="Claude"
                activo={claudeActivo}
                principal={estado.claude.duracion_ms != null ? `${(estado.claude.duracion_ms / 1000).toFixed(1)}s última respuesta` : 'Sin datos aún'}
                secundario={estado.claude.ultima_llamada ? `Última llamada ${timeAgo(estado.claude.ultima_llamada)}` : null}
              />
              <TarjetaEstado
                icon={IconBrandWhatsapp}
                nombre="Meta"
                activo={metaActivo}
                principal={estado.meta.ultima_actividad ? `Última actividad ${timeAgo(estado.meta.ultima_actividad)}` : 'Sin datos aún'}
              />
              <TarjetaEstado
                icon={IconDatabase}
                nombre="Supabase"
                activo
                principal={`${estado.supabase.latencia_ms}ms de latencia`}
                secundario="medida en esta misma carga"
              />
              <TarjetaEstado
                icon={IconClock}
                nombre="Cron"
                activo={cronActivo}
                principal={estado.cron.ultima_ejecucion ? `Última ejecución ${timeAgo(estado.cron.ultima_ejecucion)}` : 'Sin datos aún'}
              />
              <TarjetaEstado
                icon={IconCloud}
                nombre="Vercel"
                activo
                principal="Online"
                secundario="si esto cargó, Vercel está sirviendo"
              />
            </div>
          </div>

          <UsuariosRecientes usuarios={usuarios_recientes} />
        </div>

        <PanelNotificaciones actividad={actividad} />
      </div>
    </div>
  );
}
