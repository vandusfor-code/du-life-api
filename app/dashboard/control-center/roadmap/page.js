import { IconCircleDashed, IconClockPause } from '@tabler/icons-react';

// Curado a mano a partir de conversaciones reales sobre próximos pasos.
// Actualizar cuando se decida construir o descartar algo de esta lista.
const PENDIENTES = [
  {
    titulo: 'Audio nativo con Gemini',
    descripcion: 'Reemplazar Whisper por Gemini para transcribir/entender notas de voz (con fallback a Whisper), y un estado "audio activo" para notas largas, igual al patrón de "PDF activo".',
    estado: 'listo_para_construir',
  },
  {
    titulo: 'Modo de contexto extendido ("modo proyecto")',
    descripcion: 'Modo especial para charlas temáticas/estratégicas largas usando la ventana de 1M tokens de Gemini, reutilizando el historial ya guardado en la tabla mensajes en vez de solo los últimos 15.',
    estado: 'necesita_definicion',
    pendiente: 'Falta definir: cómo se activa/desactiva, si necesita persistir varios días, y si el procesamiento normal de gastos/tareas sigue funcionando durante el modo.',
  },
  {
    titulo: 'Notificaciones push nativas (Android/iPhone)',
    descripcion: 'Ya existe push_subscriptions y el envío vía Web Push; falta evaluar el flujo de activación/permisos en el cliente para que el usuario las prenda desde el dashboard.',
    estado: 'necesita_definicion',
  },
  {
    titulo: 'Rediseño completo de las páginas de escritorio restantes',
    descripcion: 'Solo Inicio, login y verify tienen diseño de escritorio a medida; las otras 14 páginas solo tienen ajustes mínimos de ancho.',
    estado: 'listo_para_construir',
  },
];

const ESTILO_ESTADO = {
  listo_para_construir: { color: 'var(--accent)', label: 'Listo para construir' },
  necesita_definicion: { color: '#F59E0B', label: 'Necesita definición' },
};

export default function RoadmapPage() {
  return (
    <div className="p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Roadmap</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Lo que sigue, curado de conversaciones reales — no un backlog live.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PENDIENTES.map((p) => {
          const estilo = ESTILO_ESTADO[p.estado];
          const Icon = p.estado === 'necesita_definicion' ? IconClockPause : IconCircleDashed;
          return (
            <div key={p.titulo} className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={16} color={estilo.color} />
                  <span className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>{p.titulo}</span>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md" style={{ color: estilo.color, background: 'rgba(196,233,56,0.10)' }}>
                  {estilo.label}
                </span>
              </div>
              <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{p.descripcion}</div>
              {p.pendiente && (
                <div className="text-[12px] mt-2 italic" style={{ color: 'var(--text-muted)' }}>{p.pendiente}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
