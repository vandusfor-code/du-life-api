'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  IconUsers, IconMessageCircle, IconSend, IconReceipt2, IconCoins,
  IconBellRinging, IconSparkles, IconDatabase, IconBrandWhatsapp, IconClock,
  IconCloud, IconWallet, IconNote, IconBulb, IconUserPlus,
} from '@tabler/icons-react';
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

function Contador({ icon: Icon, label, valor }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <Icon size={16} color="var(--text-secondary)" />
      </div>
      <div className="text-[26px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
        {valor}
      </div>
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

  const { contadores, estado_sistema: estado } = datos;
  const claudeActivo = estado.claude.ultima_llamada && (Date.now() - new Date(estado.claude.ultima_llamada).getTime()) < 30 * 60 * 1000;
  const metaActivo = estado.meta.ultima_actividad && (Date.now() - new Date(estado.meta.ultima_actividad).getTime()) < 30 * 60 * 1000;
  const cronActivo = !!estado.cron.ultima_ejecucion;

  return (
    <div className="p-8 flex flex-col gap-7">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Dashboard del sistema
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Se actualiza solo cada 5 segundos — no hace falta recargar.
        </p>
      </div>

      <section>
        <div className="text-[12px] font-black uppercase mb-3" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          Números en vivo
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Contador icon={IconUsers} label="Usuarios registrados" valor={contadores.usuarios_registrados} />
          <Contador icon={IconUsers} label="Usuarios activos" valor={contadores.usuarios_activos} />
          <Contador icon={IconMessageCircle} label="Conversaciones hoy" valor={contadores.conversaciones_hoy} />
          <Contador icon={IconSend} label="Mensajes enviados hoy" valor={contadores.mensajes_enviados_hoy} />
          <Contador icon={IconReceipt2} label="Mensajes recibidos hoy" valor={contadores.mensajes_recibidos_hoy} />
          <Contador icon={IconSparkles} label="Tokens (output) hoy" valor={contadores.tokens_output_hoy.toLocaleString('es-CO')} />
          <Contador icon={IconCoins} label="Préstamos activos" valor={contadores.prestamos_activos} />
          <Contador icon={IconBellRinging} label="Recordatorios hoy" valor={contadores.recordatorios_enviados_hoy} />
        </div>
        <div className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
          Costo de IA e input tokens: no disponible todavía (el proyecto solo captura output tokens hoy).
        </div>
      </section>

      <section>
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
      </section>

      <section>
        <div className="text-[12px] font-black uppercase mb-3" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          Actividad reciente
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {actividad.length === 0 ? (
            <div className="p-6 text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>
              Sin actividad reciente todavía.
            </div>
          ) : (
            actividad.map((e, i) => {
              const Icon = ICONO_EVENTO[e.tipo] || IconMessageCircle;
              return (
                <div
                  key={`${e.tipo}-${e.fecha}-${i}`}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : 'none' }}
                >
                  <Icon size={16} color="var(--accent)" />
                  <span className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>{e.texto}</span>
                  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(e.fecha)}</span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
