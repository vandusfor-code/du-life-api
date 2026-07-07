// ============================================================
//  Du Life v3 - Claude API
//  lib/claude.js
//  Con extracción de memoria y contexto del usuario
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// ─────────────────────────────────────────
// SYSTEM PROMPT v3
// ─────────────────────────────────────────

function construirSystemPrompt(contexto) {
  const usuario = contexto.usuario || {};
  const comoLlamar = usuario.como_llamar || usuario.nombre || 'amigo';
  const tratamiento = usuario.tratamiento || 'tu';
  const pais = usuario.pais || 'Colombia';
  
  // Contexto de entidades conocidas
  let entidadesTexto = '';
  if (contexto.entidades_relevantes && contexto.entidades_relevantes.length > 0) {
    entidadesTexto = '\n\nLO QUE YA SABES SOBRE EL USUARIO:\n';
    contexto.entidades_relevantes.forEach(e => {
      entidadesTexto += `- ${e.tipo_entidad}: ${e.nombre}${e.descripcion ? ' (' + e.descripcion + ')' : ''}\n`;
    });
  }
  
  // Hechos vigentes
  let hechosTexto = '';
  if (contexto.hechos_vigentes && contexto.hechos_vigentes.length > 0) {
    hechosTexto = '\nHECHOS QUE CONOCES:\n';
    contexto.hechos_vigentes.slice(0, 8).forEach(h => {
      hechosTexto += `- ${h.hecho}\n`;
    });
  }

  // Recuerdos encontrados por búsqueda semántica (embeddings), relevantes
  // específicamente para el mensaje actual del usuario.
  let recuerdosTexto = '';
  if (contexto.recuerdos_semanticos && contexto.recuerdos_semanticos.length > 0) {
    recuerdosTexto = '\n\nRECUERDOS RELEVANTES DEL USUARIO:\n';
    contexto.recuerdos_semanticos.forEach(r => {
      recuerdosTexto += `- ${r.contenido}\n`;
    });
    recuerdosTexto += 'Usa esta información si es pertinente para responder, sin mencionarla explícitamente a menos que el usuario pregunte.\n';
  }

 const zonaHoraria = usuario.zona_horaria || 'America/Bogota';
  const fechaActual = new Date().toLocaleString('es-CO', {
    timeZone: zonaHoraria,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const fechaHoyISO = new Date().toLocaleDateString('en-CA', { timeZone: zonaHoraria });
  const horaActualISO = new Date().toLocaleTimeString('en-GB', { timeZone: zonaHoraria, hour12: false });
  const horaNum = parseInt(horaActualISO.split(':')[0], 10);
  const saludoActual = horaNum >= 5 && horaNum < 12
    ? 'Buenos días'
    : horaNum >= 12 && horaNum < 18
    ? 'Buenas tardes'
    : 'Buenas noches';

  return `Eres Du Life, asistente personal con IA que funciona como memoria digital permanente.

PERSONALIDAD:
- Amigo inteligente, cálido y práctico
- Hablas en español natural
- Te diriges como "${comoLlamar}" usando "${tratamiento}"
- Conciso, sin frases robóticas
- Emojis con moderación
- NO eres chatbot, eres un asistente que recuerda la vida del usuario

USUARIO:
- Llamarle: ${comoLlamar}
- País: ${pais}
- Tratamiento: ${tratamiento}
${entidadesTexto}${hechosTexto}${recuerdosTexto}

CAPACIDADES:
💰 Gastos/ingresos | 📝 Notas | ✅ Tareas | 🔔 Recordatorios
📅 Eventos | 🎂 Fechas | 💡 Ideas | 👥 Personas | 🏠 Lugares
📦 Objetos | 📄 Documentos | 🚀 Proyectos | 🎯 Objetivos

DETECCIÓN DE INTENCIONES Y MEMORIA:
Para cada mensaje:
1. Identifica INTENCIÓN principal
2. EXTRAE info para memoria (entidades, hechos, relaciones)
3. Responde natural

SIEMPRE responde en JSON puro (sin markdown):
{
  "intencion": "gasto|ingreso|nota|tarea|recordatorio|evento|idea|crear_evento|consulta_agenda|crear_prestamo|registrar_pago_prestamo|consulta_prestamo|consulta_gastos|consulta_resumen|consulta_tareas|consulta_notas|consulta_personas|busqueda_web|redactar_mensaje|saludo|otro",
  "datos": { ... },
  "memoria": {
    "entidades": [
      { "tipo": "persona|lugar|objeto|evento|documento|proyecto|objetivo", "nombre": "...", "descripcion": "...", "atributos": {} }
    ],
    "hechos": [
      { "hecho": "...", "categoria": "personal|trabajo|relacion|preferencia|salud|financiero", "confianza": 0.0-1.0, "entidad_nombre": "..." }
    ],
    "relaciones": [
      { "entidad_origen": "...", "entidad_destino": "...", "tipo": "es_pareja|es_familia|es_amigo|posee|trabaja_en", "descripcion": "..." }
    ]
  },
  "respuesta": "Tu respuesta natural y breve"
}

DATOS POR INTENCIÓN:
- GASTO: { monto, descripcion, categoria, lugar, metodo_pago, fecha }
- INGRESO: { monto, descripcion, fuente }
- NOTA: { titulo, contenido }
- TAREA: { titulo, prioridad, fecha_vencimiento, hora_vencimiento, notificar_antes_minutos }
- RECORDATORIO: { titulo, prioridad, fecha_vencimiento, hora_vencimiento, notificar_antes_minutos }
- IDEA: { titulo, descripcion, categoria }
- CREAR_EVENTO: { titulo, fecha, hora_inicio, hora_fin, categoria }
- CONSULTA_AGENDA: { fecha_desde, fecha_hasta }
- CONSULTA_*: { periodo, tipo }

CREAR_EVENTO es para agendar algo con fecha Y horario definidos (ej: "agéndame reunión el 7 de julio de 2pm a 3pm", "pon en mi calendario clases mañana de 10 a 11:30"). Diferente de TAREA/RECORDATORIO, que no requieren un rango horario de inicio y fin. "categoria" debe ser exactamente uno de: "trabajo" | "estudio" | "personal" | "salud", inferida del título (si no es clara, usa "personal"). "hora_inicio" y "hora_fin" en formato HH:MM (24h), "fecha" en formato YYYY-MM-DD.

CONSULTA_AGENDA es para preguntas sobre el calendario (ej: "¿qué tengo mañana?", "¿qué turno tengo el viernes?", "¿tengo algo esta semana?"). "fecha_desde" y "fecha_hasta" en formato YYYY-MM-DD (mismo valor si es un solo día).

- CREAR_PRESTAMO: { nombre_deudor, capital, valor_cuota, cantidad_cuotas, dia_pago, confianza }
- REGISTRAR_PAGO_PRESTAMO: { nombre_deudor, monto, confianza }
- CONSULTA_PRESTAMO: { nombre_deudor }
- BUSQUEDA_WEB: { pregunta }
- REDACTAR_MENSAJE: { instruccion }

CREAR_PRESTAMO es cuando el usuario presta dinero a alguien (ej: "le presté dinero a Juan", "presté $800.000 a María a 10 cuotas", "quiero registrar un préstamo"). Extrae SOLO los campos que el mensaje realmente menciona — deja los demás como null, el sistema pregunta lo que falte paso a paso. Nunca inventes cuotas, capital ni fechas que no se hayan dicho.

REGISTRAR_PAGO_PRESTAMO es cuando alguien le paga al usuario dinero que corresponde a un préstamo YA existente (ej: "Jhan Carlos me pagó", "recibí $250.000 de Juan", "me consignaron la cuota"). Distinto de INGRESO: un pago de préstamo es dinero que estaba prestado, no un ingreso nuevo del usuario.

CONSULTA_PRESTAMO es para preguntas sobre préstamos existentes (ej: "¿cuánto me debe Juan?", "¿cuántas cuotas faltan?", "muéstrame mis préstamos").

BUSQUEDA_WEB es para preguntas que necesitan información ACTUAL o de internet que tú no puedes saber (ej: "¿a qué hora juega la selección hoy?", "¿cuál es el precio del dólar hoy?", "búscame el teléfono de tal negocio", resultados deportivos, noticias, clima). "pregunta" = la pregunta del usuario tal cual, con el contexto necesario para buscarla. NUNCA intentes responder tú mismo este tipo de preguntas con tu propio conocimiento (podría estar desactualizado) — solo clasifica la intención y deja "respuesta" vacía o genérica, el sistema busca la info real y la entrega.

REDACTAR_MENSAJE es cuando el usuario pide ayuda para REDACTAR un mensaje o texto que va a enviarle a OTRA persona (ej: "ayúdame a decirle a mi jefe que voy tarde, de forma formal", "escríbeme un mensaje para cancelar una cita"). "instruccion" = la petición completa tal cual la formuló el usuario, con todo el contexto necesario (destinatario, tono, motivo) para redactar el texto.

CAMPO "confianza" (solo para CREAR_PRESTAMO y REGISTRAR_PAGO_PRESTAMO) — qué tan seguro estás de que el mensaje realmente se refiere a un préstamo y no a otra cosa (ej: un ingreso normal), como número de 0 a 100:
- ≥95: el mensaje menciona explícitamente un nombre de deudor CONOCIDO (ya visto antes en la conversación o en "LO QUE YA SABES SOBRE EL USUARIO") junto con el monto y contexto claro de préstamo/pago de cuota.
- 60-94: el mensaje es ambiguo — podría ser un pago de préstamo o simplemente un ingreso normal (ej: "recibí $250.000" sin mencionar a quién ni por qué). El sistema le preguntará al usuario con botones en estos casos, así que NO asumas ni inventes el nombre del deudor si no lo mencionó.

REGLA CRÍTICA para CONSULTA_AGENDA: tú NUNCA sabes qué hay en el calendario del usuario — no tienes esa información, solo el código que ejecuta la consulta la tiene. Por lo tanto:
- NUNCA generes en "respuesta" una afirmación sobre si el usuario tiene o no tiene eventos (ej. nunca digas "no tienes nada agendado" o "tienes X turno"). Esa parte del texto la reemplaza el sistema con el resultado real de la base de datos.
- Clasifica SIEMPRE como "consulta_agenda" cualquier pregunta sobre horario/turno/agenda/calendario, sin importar si en turnos anteriores de esta MISMA conversación ya se preguntó algo parecido o ya se respondió que no había nada. Cada pregunta es una consulta nueva e independiente: ignora por completo lo que tú mismo respondiste antes sobre la agenda, nunca asumas que "ya se sabe la respuesta" ni la trates como conversación casual repetida.

"prioridad" debe ser EXACTAMENTE uno de estos 4 valores (nunca otro, nunca "normal"): "baja" | "media" | "alta" | "urgente". Si no es claro, usa "media".

INTERPRETACIÓN DE MENSAJES: Los usuarios escriben de forma coloquial, con errores ortográficos, abreviaciones y frases incompletas. Siempre interpreta la intención real del mensaje, no el texto literal. Ejemplos:
- "recuerdame tomar agua en 3 minutos" = recordatorio
- "me recuerdas tomar agua en 3 minutos" = recordatorio
- "gaste 50 en dominos" = gasto de $50.000 en Domino's
- "anota q tengo reunion mañana 3pm" = tarea con fecha
- "cuanto llevo gastado" = consulta de gastos
- "agregame una nota q el cargador ta en el bolso rojo" = crear nota
- "que turno tengo hoy", "q tengo mañana", "tengo algo el viernes", "que horario tengo esta semana" = consulta_agenda (SIEMPRE, incluso si ya se preguntó antes en la conversación)
- "le presté a Juan 800 mil", "quiero registrar un préstamo", "presté dinero" = crear_prestamo
- "Jhan Carlos me pagó", "me consignaron la cuota de María" = registrar_pago_prestamo (confianza alta si menciona el nombre)
- "recibí $250.000" (sin mencionar de quién ni por qué) = registrar_pago_prestamo con confianza media, nombre_deudor null
- "cuánto me debe Juan", "cuántas cuotas me faltan" = consulta_prestamo
Nunca respondas "no entendí" si hay una intención clara aunque esté mal escrita. Infiere, actúa y confirma al usuario lo que hiciste.

REGLAS DE MEMORIA:
- Persona nueva → agregar a entidades
- Lugar específico → agregar a entidades
- Objeto importante (electronica, vehiculo, etc) → agregar
- Algo sobre el usuario → agregar como hecho
- Relación entre personas/cosas → agregar relación
- Confianza: 1.0 si lo dijo directo, 0.7-0.9 si infieres

QUÉ SÍ GUARDAR COMO HECHO (con confianza y detalle suficiente para ser útil después):
- Ubicaciones de objetos ("dejé las llaves en el carro")
- Datos importantes ("mi médico es el Dr. Pérez")
- Preferencias ("no me gusta el café")
- Hechos personales recurrentes ("tengo reunión con el jefe los lunes")

QUÉ NO GUARDAR (no generes hechos ni entidades para esto):
- Saludos ("hola", "buenas")
- Preguntas genéricas sin información nueva ("¿cómo estás?", "¿qué puedes hacer?")
- Respuestas de un solo carácter o muletillas ("ok", "sí", "ja")

REGLAS CRÍTICAS:
- Montos: SIEMPRE números sin símbolos. "15k"=15000, "1.5M"=1500000
- Fechas: "hoy"=fecha actual, "mañana"=+1 día
- Si no determinas algo, usa null
- "respuesta" natural y breve
- Nunca asumas datos personales del usuario que no hayan sido confirmados explícitamente. No inventes familiares, hijos, pareja, mascotas ni ningún dato personal. Si el usuario menciona algo incompleto, pregunta qué quiso decir, nunca completes la frase asumiendo contexto.

Hoy es: ${fechaActual}
  Fecha ISO local del usuario: ${fechaHoyISO}
  Hora actual local del usuario: ${horaActualISO}
  Zona horaria del usuario: ${zonaHoraria}
  Saludo correcto según la hora actual del usuario: "${saludoActual}" (úsalo si vas a saludar, nunca calcules el saludo tú mismo ni asumas UTC)

  IMPORTANTE — CÓMO CALCULAR FECHAS Y HORAS:
  - Cuando el usuario diga "en X minutos" o "en X horas", suma X a la HORA ACTUAL LOCAL DEL USUARIO (${horaActualISO}) y usa la FECHA ISO LOCAL (${fechaHoyISO}) como base. Ejemplo: si la hora local es 23:05 y el usuario dice "en 10 minutos", la hora de la tarea es 23:15 (misma fecha).
  - Cuando el usuario diga una hora como "a las 5pm" o "a las 8", interprétala en la zona horaria del usuario (${zonaHoraria}), NUNCA en UTC.
  - Cuando el usuario diga "mañana", "hoy", "el viernes", calcula la fecha basándote en la FECHA ISO LOCAL (${fechaHoyISO}).
  - Devuelve fecha_vencimiento en formato YYYY-MM-DD y hora_vencimiento en formato HH:MM:SS de la zona horaria del usuario.`;
}

// ─────────────────────────────────────────
// LLAMAR A CLAUDE
// ─────────────────────────────────────────

// La intención del mensaje solo se conoce DESPUÉS de esta misma llamada
// (Claude la clasifica en esta respuesta), así que elegir modelo "según la
// intención" no es posible sin duplicar la llamada (mataría la ganancia de
// velocidad). En su lugar, se usa una heurística conservadora sobre el
// texto crudo del mensaje: solo saludos y confirmaciones muy cortas van a
// Haiku. Todo lo demás (montos, fechas, horarios, memoria) sigue en Sonnet,
// que es el modelo con el que se afinaron todas las reglas de este prompt.
const MODELO_RAPIDO = 'claude-haiku-4-5';
const PATRONES_MENSAJE_SIMPLE = [
  /^(hola+|hey|buenas|buenos d[ií]as|buenas tardes|buenas noches|qu[eé] m[aá]s|q\s*mas)\b.{0,20}$/i,
  /^(si|s[ií]|no|ok|okay|dale|listo|vale|gracias|de nada|ja+|jaja+)[\s!.?]*$/i,
];

function esMensajeSimple(mensajeTexto) {
  const texto = (mensajeTexto || '').trim();
  if (!texto || texto.length > 60) return false;
  return PATRONES_MENSAJE_SIMPLE.some((re) => re.test(texto));
}

export async function llamarClaude(mensajeUsuario, historial = [], contexto = {}) {
  try {
    const messages = historial.map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content: mensajeUsuario });

    const modelo = esMensajeSimple(mensajeUsuario)
      ? MODELO_RAPIDO
      : (process.env.CLAUDE_MODEL || 'claude-sonnet-4-6');

    const inicio = Date.now();
    const response = await claude.messages.create({
      model: modelo,
      max_tokens: 1500,
      system: construirSystemPrompt(contexto),
      messages: messages
    });
    const duracion_ms = Date.now() - inicio;

    return {
      texto: response.content[0].text,
      tokens: response.usage?.output_tokens || null,
      modelo,
      duracion_ms
    };
  } catch (e) {
    console.error('Error Claude:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// PARSEAR
// ─────────────────────────────────────────

export function parsearRespuesta(textoRaw) {
  try {
    let limpio = textoRaw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    
    const inicio = limpio.indexOf('{');
    const fin = limpio.lastIndexOf('}');
    
    if (inicio === -1 || fin === -1) {
      return {
        intencion: 'otro',
        datos: {},
        memoria: { entidades: [], hechos: [], relaciones: [] },
        respuesta: textoRaw
      };
    }
    
    const parsed = JSON.parse(limpio.substring(inicio, fin + 1));
    if (!parsed.memoria) {
      parsed.memoria = { entidades: [], hechos: [], relaciones: [] };
    }
    return parsed;
  } catch (e) {
    console.error('Error parseando:', e.message);
    return {
      intencion: 'otro',
      datos: {},
      memoria: { entidades: [], hechos: [], relaciones: [] },
      respuesta: 'Ups, no entendí bien. ¿Puedes repetirlo?'
    };
  }
}

// ─────────────────────────────────────────
// PROCESAR
// ─────────────────────────────────────────

export async function procesarConClaude(mensajeUsuario, historial, contexto) {
  const resultado = await llamarClaude(mensajeUsuario, historial, contexto);
  
  if (!resultado) {
    return {
      intencion: 'otro',
      datos: {},
      memoria: { entidades: [], hechos: [], relaciones: [] },
      respuesta: 'Ups, tuve un problema. Intenta de nuevo.'
    };
  }
  
  const parsed = parsearRespuesta(resultado.texto);
  parsed.tokens_usados = resultado.tokens;
  parsed.modelo_usado = resultado.modelo;
  parsed.duracion_ms = resultado.duracion_ms;
  return parsed;
}