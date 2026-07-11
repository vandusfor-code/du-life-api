import { IconCircleCheck } from '@tabler/icons-react';

// Curado a mano a partir del historial real de commits (git log). No se
// genera en vivo — actualizar esta lista a mano cuando se agreguen
// features grandes nuevas (ver regla de sync del Control Center).
const CAMBIOS = [
  {
    fecha: '2026-07-10',
    titulo: '💼 Nuevo módulo: Negocio (Ventas) — Fase 1',
    items: [
      'Modo negocio opcional (opt-in): activable desde el perfil (web) o pidiéndolo por WhatsApp',
      'Registrar una venta en lenguaje natural por WhatsApp (ej. "vendí 2 hamburguesas por $35.000", "cobré $120.000 a Juan por mantenimiento") — sin formularios',
      'Clientes automáticos: si se menciona un nombre, se crea o actualiza el cliente y su historial',
      'Dashboard de Negocio (web, desktop y móvil): ventas hoy/semana/mes, ticket promedio, tendencia de 7 días, productos más vendidos, cliente más importante, historial y lista de clientes',
      'La intención "venta" solo existe para Claude si el usuario activó modo negocio — cero riesgo de confundir gastos/ingresos personales con ventas para el resto de usuarios',
      'Fase 2 (pendiente): fiados/cartera, inventario simple, alertas inteligentes, comprobantes, resumen nocturno e insights de IA',
    ],
  },
  {
    fecha: '2026-07-10',
    titulo: 'Borrar mis datos + recordatorio de pago a deudores',
    items: [
      'Opción para borrar datos por categoría (financiero, notas, tareas, calendario, memoria, etc.) desde la app y por WhatsApp con confirmación "ELIMINAR" — nunca borra la cuenta',
      'Recordatorio de pago al deudor de un préstamo (activable por préstamo) + confirmación automática al deudor cuando se registra el pago',
      'Rediseño del Dashboard del Control Center con métricas, dona de intenciones y tendencia de mensajes reales',
      'Fix: recordatorio de evento de calendario duplicado cuando coincidían el job puntual y la revisión periódica',
      'Fix: agradecimientos ("gracias") mal clasificados como saludo',
      'Perfil: elegir tratamiento (tú/usted) en cualquier momento, no solo durante el registro',
      'App web: agregar gasto y editar ingresos/notas directamente (antes solo se podía por WhatsApp)',
    ],
  },
  {
    fecha: '2026-07-07',
    titulo: 'Módulo Usuarios del Control Center',
    items: [
      'Listar, buscar, editar y eliminar cualquier cuenta (con borrado en cascada real)',
      'Rediseño de Inicio (móvil): tarjeta motivacional, resumen de Ingresos/Gastos, sin carrusel de banners',
    ],
  },
  {
    fecha: '2026-07-06',
    titulo: 'Integración de Gemini + Control Center Fase 1',
    items: [
      'Búsqueda web, redacción rápida, Vision y lectura de PDFs con Gemini',
      'Control Center: roles, protección 403 real, Dashboard en vivo, Arquitectura Viva',
      'Login y verificación con diseño propio para escritorio',
      'Restauración del passthrough de Du Academy en el webhook (fix de regresión)',
    ],
  },
  {
    fecha: '2026-07-05 a 2026-07-06',
    titulo: 'Versión de escritorio',
    items: [
      'Sidebar + panel de IA conviviendo con la app móvil',
      'Tema claro por defecto en escritorio, paleta premium Slate + Emerald',
      'Rediseño premium de Inicio (hero de marca, resumen, banners fotográficos)',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Changelog</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Historial curado de features grandes — no reemplaza el git log completo.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {CAMBIOS.map((c) => (
          <div key={c.fecha} className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>{c.titulo}</span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>{c.fecha}</span>
            </div>
            <div className="flex flex-col gap-2">
              {c.items.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <IconCircleCheck size={14} color="var(--accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
