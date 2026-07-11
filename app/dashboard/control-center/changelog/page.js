import { IconCircleCheck } from '@tabler/icons-react';

// Curado a mano a partir del historial real de commits (git log). No se
// genera en vivo — actualizar esta lista a mano cuando se agreguen
// features grandes nuevas (ver regla de sync del Control Center).
const CAMBIOS = [
  {
    fecha: '2026-07-11',
    titulo: 'Du Life responde sobre su seguridad',
    items: [
      'Nueva intención "pregunta_seguridad": cuando un usuario pregunta si Du Life es seguro o cómo protege sus datos, el bot responde de forma cálida y no técnica (comunicación cifrada, cada quien ve solo lo suyo, no se vende la info, puede borrar sus datos cuando quiera)',
      'La respuesta evita a propósito revelar proveedores, límites o detalles internos, y no promete cosas falsas ("imposible de hackear")',
    ],
  },
  {
    fecha: '2026-07-11',
    titulo: '🔒 Endurecimiento de seguridad — ronda 2 (auditoría)',
    items: [
      'OTP con generador criptográfico (crypto.randomInt) en vez de Math.random(), y ya no se loguea el código ni el teléfono',
      'Rate limiting con Upstash: 3 códigos por número / 15 min y 10 por IP / 1 h en el envío, 10 intentos por IP / 15 min en la verificación, y 30 mensajes por usuario / 10 min en el pipeline de IA (con aviso único al usuario). Fail-open si Redis cae',
      'RLS verificado: ya estaba activo con deny-by-default en todas las tablas; se documentó el script de defensa en profundidad',
      'Logging saneado: se quitó de los logs el contenido de mensajes, transcripciones de audio, códigos OTP y números de teléfono — solo quedan tipo de evento y éxito/error',
    ],
  },
  {
    fecha: '2026-07-11',
    titulo: '🔒 Endurecimiento de seguridad (auditoría)',
    items: [
      'JWT_SECRET sin fallback: se elimina el secreto por defecto público; si falta la variable, la app falla ruidosamente en vez de firmar sesiones con un valor conocido',
      'Webhook de WhatsApp: ahora valida la firma X-Hub-Signature-256 (HMAC del App Secret de Meta) antes de procesar — bloquea mensajes inyectados por terceros',
      'Endpoint de jobs (/api/jobs): valida la firma criptográfica real de QStash (antes solo miraba si el header existía) — bloquea disparo de jobs falsos',
      'Con esas dos firmas, se cierra el vector de suplantación por número de teléfono: el `from` solo llega por canales firmados y verificados',
    ],
  },
  {
    fecha: '2026-07-11',
    titulo: 'Fix crítico: perfil desaparecido + sesión permanente',
    items: [
      'Fix: el perfil completo (nombre, foto, resumen financiero y la tarjeta Negocio en Espacios) desaparecía si a la base le faltaba una columna nueva — el endpoint resumen ahora es resiliente a migraciones pendientes',
      'Fix: guardar el perfil ya no falla completo si el nombre del negocio no se puede guardar — guarda el resto y avisa exactamente qué faltó',
      'Sesión permanente: 90 días con renovación automática en cada uso — mientras sigas entrando, la sesión configurada por WhatsApp nunca se cierra',
      'Dashboard Negocio: hero sin texto partido, ranking de productos compacto estilo BI, Productos y Clientes en dos columnas, mini-gráficas en Ventas semana y Ticket promedio (serie real por día)',
    ],
  },
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
