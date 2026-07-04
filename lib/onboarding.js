// ============================================================
//  Du Life - Onboarding
//  lib/onboarding.js
//  Onboarding profesional de 5 pasos
// ============================================================

import { supabase, obtenerOCrearUsuario, actualizarUsuario, crearOActualizarEntidad, crearHecho } from './supabase.js';

// ─────────────────────────────────────────
// DETECCIÓN DE PAÍS POR TELÉFONO
// ─────────────────────────────────────────

const PAISES = {
  '57':  { nombre: 'Colombia',   emoji: '🇨🇴', moneda: 'COP', tz: 'America/Bogota' },
  '52':  { nombre: 'México',     emoji: '🇲🇽', moneda: 'MXN', tz: 'America/Mexico_City' },
  '34':  { nombre: 'España',     emoji: '🇪🇸', moneda: 'EUR', tz: 'Europe/Madrid' },
  '1':   { nombre: 'USA',        emoji: '🇺🇸', moneda: 'USD', tz: 'America/New_York' },
  '54':  { nombre: 'Argentina',  emoji: '🇦🇷', moneda: 'ARS', tz: 'America/Argentina/Buenos_Aires' },
  '51':  { nombre: 'Perú',       emoji: '🇵🇪', moneda: 'PEN', tz: 'America/Lima' },
  '56':  { nombre: 'Chile',      emoji: '🇨🇱', moneda: 'CLP', tz: 'America/Santiago' },
  '58':  { nombre: 'Venezuela',  emoji: '🇻🇪', moneda: 'VES', tz: 'America/Caracas' },
  '593': { nombre: 'Ecuador',    emoji: '🇪🇨', moneda: 'USD', tz: 'America/Guayaquil' }
};

function detectarPais(telefono) {
  const codigos = ['593', '57', '52', '34', '54', '51', '56', '58', '1'];
  for (const codigo of codigos) {
    if (telefono.startsWith(codigo)) {
      return { codigo, ...PAISES[codigo] };
    }
  }
  return { codigo: '57', ...PAISES['57'] };
}

// ─────────────────────────────────────────
// ESTADO DE ONBOARDING
// ─────────────────────────────────────────

async function obtenerEstadoOnboarding(usuarioId) {
  const { data } = await supabase
    .from('onboarding_estado')
    .select('*')
    .eq('usuario_id', usuarioId)
    .limit(1)
    .maybeSingle();
  
  if (data) return data;
  
  // Crear
  const { data: nuevo } = await supabase
    .from('onboarding_estado')
    .insert({
      usuario_id: usuarioId,
      paso_actual: 1,
      completado: false
    })
    .select()
    .single();
  return nuevo;
}

async function actualizarEstado(estadoId, datos) {
  return await supabase
    .from('onboarding_estado')
    .update(datos)
    .eq('id', estadoId);
}

// ─────────────────────────────────────────
// PROCESAR ONBOARDING
// ─────────────────────────────────────────

export async function procesarOnboarding(telefono, mensajeTexto, nombreContacto) {
  const usuario = await obtenerOCrearUsuario(telefono, nombreContacto);
  if (!usuario) return 'Disculpa, hubo un problema. Intenta de nuevo.';
  
  if (usuario.onboarding_completo) return null;
  
  const estado = await obtenerEstadoOnboarding(usuario.id);
  if (!estado) return 'Disculpa, hubo un problema iniciando tu registro.';
  
  const pais = detectarPais(telefono);
  
  switch (estado.paso_actual) {
    case 1: return await paso1(usuario, estado);
    case 2: return await paso2(usuario, estado, mensajeTexto);
    case 3: return await paso3(usuario, estado, mensajeTexto, pais);
    case 4: return await paso4(usuario, estado, mensajeTexto, pais);
    case 5: return await paso5(usuario, estado, mensajeTexto, pais);
    default: return await finalizar(usuario, estado, pais);
  }
}

// ─────────────────────────────────────────
// PASOS
// ─────────────────────────────────────────

async function paso1(usuario, estado) {
  await actualizarEstado(estado.id, { paso_actual: 2 });
  return '¡Hola! 👋 Soy Du Life, tu asistente personal.\n\n' +
         'Veo que eres nuevo por acá, me gustaría saber ¿cómo te llamas?';
}

async function paso2(usuario, estado, mensajeTexto) {
  const nombre = extraerNombre(mensajeTexto);
  if (!nombre) {
    return 'Disculpa, no entendí bien. ¿Podrías decirme solo tu nombre?';
  }
  
  await actualizarEstado(estado.id, {
    nombre_capturado: nombre,
    como_llamar_capturado: nombre,
    paso_actual: 3
  });
  await actualizarUsuario(usuario.id, { nombre: nombre });
  
  return `¡Mucho gusto, ${nombre}! 🙌\n\n¿Así te gusta que te llame, o prefieres otro nombre o apodo?`;
}

async function paso3(usuario, estado, mensajeTexto, pais) {
  const texto = (mensajeTexto || '').toLowerCase().trim();
  const afirmaciones = ['si', 'sí', 'asi', 'así', 'esta bien', 'está bien', 'ok', 'dale', 'perfecto', 'claro', 'correcto', 'sip', 'simon', 'simón'];
  const esAfirmacionExacta = afirmaciones.includes(texto);
  
  let comoLlamar = estado.nombre_capturado;
  if (!esAfirmacionExacta) {
    const apodo = await extraerApodoConClaude(mensajeTexto);
    if (apodo) comoLlamar = apodo;
  }
  
  await actualizarEstado(estado.id, {
    como_llamar_capturado: comoLlamar,
    pais_detectado: pais.nombre,
    zona_horaria_detectada: pais.tz,
    moneda_detectada: pais.moneda,
    paso_actual: 4
  });
  await actualizarUsuario(usuario.id, { como_llamar: comoLlamar });
  
  return `Listo.\n\nVeo que eres de ${pais.nombre} ${pais.emoji}\n\n¿Todo correcto?`;
}

async function paso4(usuario, estado, mensajeTexto, pais) {
  const texto = (mensajeTexto || '').toLowerCase().trim();
  const negaciones = ['no', 'incorrecto', 'mal', 'nop', 'nope'];
  const esNegacion = negaciones.some(n => texto === n || texto.startsWith(n + ' '));
  
  if (esNegacion) {
    return 'Disculpa el error. Por ahora solo manejamos detección automática.\n\n¿Continuamos?';
  }
  
  await actualizarUsuario(usuario.id, {
    pais: pais.nombre,
    zona_horaria: pais.tz
  });
  await actualizarEstado(estado.id, { paso_actual: 5 });
  
  const comoLlamar = estado.como_llamar_capturado || estado.nombre_capturado;
  return `Una última cosa, ${comoLlamar}:\n\n¿Prefieres que te trate de tú o de usted?`;
}

async function paso5(usuario, estado, mensajeTexto, pais) {
  const texto = (mensajeTexto || '').toLowerCase().trim();
  const tratamiento = texto.includes('usted') ? 'usted' : 'tu';
  
  await actualizarUsuario(usuario.id, { tratamiento: tratamiento });
  await actualizarEstado(estado.id, {
    tratamiento_capturado: tratamiento,
    completado: true,
    fecha_completado: new Date().toISOString()
  });
  
  return await finalizar(usuario, estado, pais);
}

// ─────────────────────────────────────────
// FINALIZAR
// ─────────────────────────────────────────

async function finalizar(usuario, estado, pais) {
  const comoLlamar = estado.como_llamar_capturado || estado.nombre_capturado || usuario.nombre;
  
  await actualizarUsuario(usuario.id, {
    onboarding_completo: true,
    onboarding_paso: 5
  });
  
  // Estructura inicial
  await crearEstructuraInicial(usuario.id, comoLlamar, pais);
  
  return `¡Listo, ${comoLlamar}! 🎉\n\n` +
         'A partir de ahora, cuéntame lo que sea:\n\n' +
         '💰 "Gasté 50k almorzando"\n' +
         '📝 "Recordar pagar internet el 5"\n' +
         '👥 "Mi novia se llama Laura"\n' +
         '🎯 "Quiero ahorrar 5M este año"\n\n' +
         'Iré aprendiendo de ti poco a poco.\n' +
         'Si me equivoco, dímelo y aprendo.\n\n' +
         '¿En qué te ayudo?';
}

async function crearEstructuraInicial(usuarioId, comoLlamar, pais) {
  try {
    await crearOActualizarEntidad(usuarioId, {
      tipo_entidad: 'persona',
      nombre: comoLlamar,
      descripcion: 'El usuario (yo mismo)',
      atributos: { es_usuario: true, pais: pais.nombre },
      importancia: 10
    });
    
    await crearHecho(usuarioId, {
      hecho: `El usuario se llama ${comoLlamar}`,
      categoria: 'personal',
      confianza: 1.0,
      verificado: true
    });
    
    await crearHecho(usuarioId, {
      hecho: `Vive en ${pais.nombre}`,
      categoria: 'personal',
      confianza: 1.0,
      verificado: true
    });
  } catch (e) {
    console.error('Error estructura inicial:', e.message);
  }
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function extraerNombre(texto) {
  if (!texto) return null;
  let limpio = texto.trim();
  const prefijos = ['mi nombre es', 'me llamo', 'soy', 'me dicen', 'llámame', 'llamame'];
  for (const p of prefijos) {
    const regex = new RegExp('^' + p + '\\s+', 'i');
    limpio = limpio.replace(regex, '');
  }
  limpio = limpio.replace(/[.,!?]/g, '').trim();
  if (limpio.length < 2 || limpio.length > 50) return null;
  return limpio.split(' ')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

async function extraerApodoConClaude(mensajeTexto) {
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

    const extraction = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `El usuario respondió esto cuando le preguntamos cómo le gusta que le llamen: "${mensajeTexto}".

Si el usuario indica que le gusta su nombre tal como está (frases como "así me gusta", "así está bien", "déjalo así", "como está", "igual"), responde SOLO con: MANTENER_NOMBRE

Si menciona un apodo o nombre diferente, extrae ÚNICAMENTE esa palabra. Sin comillas, sin explicación.

Ejemplos:
"me dicen Du" → Du
"así me gusta" → MANTENER_NOMBRE
"así está bien" → MANTENER_NOMBRE
"puedes llamarme Juancho" → Juancho
"Du" → Du`
      }]
    });

    const resultado = extraction.content[0]?.text?.trim();
    if (!resultado || resultado === 'MANTENER_NOMBRE') return null;
    if (resultado.length < 1 || resultado.length > 40) return null;
    return resultado;
  } catch (e) {
    console.error('Error extrayendo apodo con Claude:', e.message);
    return null;
  }
}