'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  IconBell, IconSparkles, IconChevronRight,
  IconWallet, IconNote, IconBulb, IconUsers, IconSquareCheck, IconBrandWhatsapp,
} from '@tabler/icons-react';
import Avatar from '../../components/Avatar';
import ProfileSheet from '../../components/ProfileSheet';
import { useAutoRefresh } from '../../components/useAutoRefresh';

const WHATSAPP_LINK = 'https://wa.me/573239117508';
const NOTIFICACIONES_MOCK = 3;

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const formatCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const formatCOPCorto = (n) => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'k';
  return '$' + Math.round(n);
};

function capitalizar(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function construirResumenTexto(tareasPendientes, recordatoriosHoy) {
  const partes = [];
  if (tareasPendientes > 0) {
    partes.push(`${tareasPendientes} tarea${tareasPendientes === 1 ? '' : 's'}`);
  }
  if (recordatoriosHoy > 0) {
    partes.push(`${recordatoriosHoy} recordatorio${recordatoriosHoy === 1 ? '' : 's'} para hoy`);
  }
  if (partes.length === 0) return null;
  if (partes.length === 1) return `Tienes ${partes[0]}.`;
  return `Tienes ${partes[0]} y ${partes[1]}.`;
}

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
  return new Date(fechaISO).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

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
      fecha: d,
      dia: DIAS_SEMANA[i],
      numero: d.getDate(),
      esHoy: d.toDateString() === hoy.toDateString(),
    };
  });
}

const TIPO_CONFIG = {
  gasto: { label: 'Gasto', color: '#4ADE80', icon: IconWallet },
  idea: { label: 'Idea', color: '#FB923C', icon: IconBulb },
  persona: { label: 'Persona', color: '#A78BFA', icon: IconUsers },
  nota: { label: 'Nota', color: '#C4E938', icon: IconNote },
  tarea: { label: 'Tarea', color: '#2DD4BF', icon: IconSquareCheck },
};

export default function DashboardInicio() {
  const [data, setData] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const cargarDatos = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard/gastos').then((r) => r.json()),
      fetch('/api/dashboard/resumen').then((r) => r.json()),
      fetch('/api/dashboard/ideas').then((r) => r.json()),
      fetch('/api/dashboard/personas').then((r) => r.json()),
      fetch('/api/dashboard/notas').then((r) => r.json()),
      fetch('/api/dashboard/tareas').then((r) => r.json()),
    ])
      .then(([gastosData, resumenData, ideasData, personasData, notasData, tareasData]) => {
        setData(gastosData);
        setUsuario(resumenData.usuario);
        setResumen(resumenData.resumen);
        setIdeas(ideasData.ideas || []);
        setPersonas(personasData.personas || []);
        setNotas(notasData.notas || []);
        setTareas(tareasData.tareas || []);
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

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32 bg-black min-h-screen">
        <div className="flex justify-between items-center mb-5">
          <div className="h-7 w-28 rounded animate-pulse bg-neutral-900" />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full animate-pulse bg-neutral-900" />
            <div className="w-10 h-10 rounded-full animate-pulse bg-neutral-900" />
          </div>
        </div>
        <div className="h-8 w-56 rounded animate-pulse mb-2 bg-neutral-900" />
        <div className="h-4 w-40 rounded animate-pulse mb-5 bg-neutral-900" />
        <div className="h-16 rounded-2xl animate-pulse mb-4 bg-neutral-900" />
        <div className="h-24 rounded-2xl animate-pulse bg-neutral-900" />
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="h-16 rounded animate-pulse bg-neutral-900" />
          <div className="h-16 rounded animate-pulse bg-neutral-900" />
          <div className="h-16 rounded animate-pulse bg-neutral-900" />
          <div className="h-16 rounded animate-pulse bg-neutral-900" />
        </div>
        <div className="rounded-2xl h-[220px] mt-6 animate-pulse bg-neutral-900" />
      </div>
    );
  }

  const gastos = data?.gastos || [];
  const resumenSeguro = resumen || {
    total_gastos: 0, total_ingresos: 0, balance: 0,
    tareas_pendientes: 0, recordatorios_hoy: 0, metas_activas: 0,
  };

  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 7);
  const gastosSemana = gastos
    .filter((g) => new Date(g.fecha) >= hace7dias)
    .reduce((sum, g) => sum + Number(g.monto), 0);

  const fechaHoy = capitalizar(
    new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  );

  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';

  const semana = construirSemana();
  const diaActivo = diaSeleccionado ?? semana.find((d) => d.esHoy)?.numero;

  const resumenTexto = construirResumenTexto(resumenSeguro.tareas_pendientes, resumenSeguro.recordatorios_hoy);
  const mensajeIA = resumenTexto || 'Aún no has registrado nada hoy. Cuéntale a Du Life por WhatsApp.';

  const METRICAS = [
    { valor: resumenSeguro.tareas_pendientes, label: 'Tareas pendientes' },
    { valor: resumenSeguro.recordatorios_hoy, label: 'Recordatorios hoy' },
    { valor: formatCOPCorto(gastosSemana), label: 'Gastos esta semana' },
    { valor: resumenSeguro.metas_activas, label: 'Metas activas' },
  ];

  // Timeline corto: mezclar gastos + ideas + personas + notas + tareas, ordenar desc, top 5
  const timelineCorto = [
    ...gastos.map((g) => ({
      id: `gasto-${g.id}`,
      tipo: 'gasto',
      titulo: g.descripcion || 'Gasto',
      subtitulo: g.categoria || g.lugar || '',
      monto: Number(g.monto),
      fechaHora: new Date(`${g.fecha}T${g.hora || '00:00:00'}`),
    })),
    ...ideas.map((i) => ({
      id: `idea-${i.id}`,
      tipo: 'idea',
      titulo: i.titulo || 'Idea',
      subtitulo: i.descripcion || '',
      fechaHora: new Date(i.creado_en),
    })),
    ...personas.map((p) => ({
      id: `persona-${p.id}`,
      tipo: 'persona',
      titulo: p.nombre,
      subtitulo: p.descripcion || '',
      fechaHora: new Date(p.creado_en),
    })),
    ...notas.map((n) => ({
      id: `nota-${n.id}`,
      tipo: 'nota',
      titulo: n.titulo || 'Nota',
      subtitulo: n.contenido || '',
      fechaHora: new Date(n.creado_en),
    })),
    ...tareas.map((t) => ({
      id: `tarea-${t.id}`,
      tipo: 'tarea',
      titulo: t.titulo,
      subtitulo: t.fecha_vencimiento ? `Vence ${t.fecha_vencimiento}` : '',
      fechaHora: new Date(t.creado_en),
    })),
  ]
    .sort((a, b) => b.fechaHora - a.fechaHora)
    .slice(0, 5);

  return (
    <div className="px-5 pt-4 pb-32 bg-black min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="relative flex items-center">
          <span className="text-xl font-bold tracking-tight" style={{ color: '#C4E938' }}>
            Du
          </span>
          <span className="text-xl font-bold tracking-tight text-white">&nbsp;Life</span>
          <IconSparkles size={14} color="#C4E938" style={{ marginLeft: '2px', marginTop: '-14px' }} />
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

      {/* Saludo */}
      <div className="text-[22px] font-bold tracking-tight text-white">
        {saludo}, <span style={{ color: '#C4E938' }}>{nombre}</span>
      </div>
      <div className="text-[13px] text-neutral-400 mt-0.5 mb-5">{fechaHoy}</div>

      {/* Calendario horizontal */}
      <div className="flex justify-between gap-1 mb-4">
        {semana.map((d) => {
          const activo = d.numero === diaActivo;
          return (
            <button
              key={d.fecha.toISOString()}
              onClick={() => setDiaSeleccionado(d.numero)}
              className="flex flex-col items-center gap-1.5 flex-1 py-1"
            >
              <span className="text-[11px] text-neutral-400">{d.dia}</span>
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
                style={{
                  background: activo ? '#C4E938' : 'transparent',
                  color: activo ? '#000' : '#A3A3A3',
                }}
              >
                {d.numero}
              </span>
            </button>
          );
        })}
      </div>

      {/* Banner de la IA */}
      <div className="rounded-2xl p-4 mb-5 bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-1.5 mb-1.5">
          <IconSparkles size={13} color="#C4E938" />
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#C4E938' }}>
            Du Life
          </span>
        </div>
        <div className="text-[14px] text-white leading-snug">{mensajeIA}</div>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-2 gap-y-5 mb-6 px-4">
        {METRICAS.map((m, i) => (
          <div
            key={m.label}
            className={i % 2 === 0 ? 'pr-4' : 'pl-4'}
            style={i % 2 === 0 ? { borderRight: '1px solid #1F1F1F' } : undefined}
          >
            <div className="text-[24px] font-semibold tracking-tight text-white">{m.valor}</div>
            <div className="text-[12px] text-neutral-400 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Tu timeline */}
      <Link href="/dashboard/timeline" prefetch className="flex justify-between items-center mb-3">
        <div>
          <div className="text-[17px] font-bold tracking-tight text-white">Tu timeline</div>
          <div className="text-[12px] text-neutral-400 mt-0.5">Todo lo que has registrado últimamente</div>
        </div>
        <span
          className="flex items-center gap-0.5 px-3 py-1.5 rounded-full text-[12px] font-bold flex-shrink-0"
          style={{ border: '1px solid #C4E938', color: '#C4E938' }}
        >
          Ver todo <IconChevronRight size={13} />
        </span>
      </Link>

      {timelineCorto.length === 0 ? (
        <div className="rounded-2xl p-6 text-center text-neutral-400 text-[13px] bg-neutral-900 border border-neutral-800">
          Aún no has registrado nada. Cuéntale a Du Life por WhatsApp.
        </div>
      ) : (
        <div className="flex">
          <div className="flex flex-col items-center pr-3" style={{ width: '68px' }}>
            {timelineCorto.map((item, i) => (
              <div
                key={item.id}
                className="flex flex-col items-center"
                style={{ flex: 1, paddingTop: i === 0 ? 0 : '16px' }}
              >
                <div className="text-[10px] text-neutral-500 text-center leading-tight">{timeAgo(item.fechaHora)}</div>
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5"
                  style={{ background: TIPO_CONFIG[item.tipo]?.color || '#71717A' }}
                />
                {i < timelineCorto.length - 1 && (
                  <div className="flex-1 w-px mt-1 bg-neutral-800" />
                )}
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            {timelineCorto.map((item, i) => {
              const cfg = TIPO_CONFIG[item.tipo] || { label: item.tipo, color: '#71717A', icon: IconNote };
              const Icon = cfg.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-4"
                  style={{ borderBottom: i < timelineCorto.length - 1 ? '1px solid #1F1F1F' : 'none' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cfg.color}26` }}
                  >
                    <Icon size={18} color={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-white truncate">{item.titulo}</div>
                    {item.subtitulo && (
                      <div className="text-[12px] text-neutral-400 truncate mt-0.5">{item.subtitulo}</div>
                    )}
                  </div>
                  {item.tipo === 'gasto' && (
                    <div className="text-[14px] font-bold flex-shrink-0 text-white">
                      -{formatCOP(item.monto)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center text-[13px] text-neutral-400 mt-6">
        Así es tu vida, día a día 🖤
      </div>

      {/* Botón flotante WhatsApp */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-lime active:scale-90 transition-transform duration-150"
        style={{ boxShadow: '0 0 16px rgba(196,233,56,0.4)' }}
      >
        <IconBrandWhatsapp size={24} color="#000000" />
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
