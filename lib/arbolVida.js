// ============================================================
//  Du Life - Árbol de Vida
//  lib/arbolVida.js
// ============================================================

import { supabase } from './supabase.js';

const RAMAS = {
  'familia':      { icono: '👨‍👩‍👧', orden: 1, color: '#FF6B6B' },
  'relaciones':   { icono: '💕', orden: 2, color: '#FF8FA3' },
  'trabajo':      { icono: '💼', orden: 3, color: '#4ECDC4' },
  'finanzas':     { icono: '💰', orden: 4, color: '#FFE66D' },
  'salud':        { icono: '🏥', orden: 5, color: '#95E1D3' },
  'viajes':       { icono: '✈️', orden: 6, color: '#A8E6CF' },
  'aprendizaje':  { icono: '📚', orden: 7, color: '#C7CEEA' },
  'proyectos':    { icono: '🚀', orden: 8, color: '#FF9AA2' },
  'objetivos':    { icono: '🎯', orden: 9, color: '#FFDAC1' },
  'documentos':   { icono: '📄', orden: 10, color: '#B5EAD7' },
  'vehiculos':    { icono: '🚗', orden: 11, color: '#E2F0CB' },
  'propiedades':  { icono: '🏠', orden: 12, color: '#FFDFD3' },
  'mascotas':     { icono: '🐕', orden: 13, color: '#F0E68C' },
  'amigos':       { icono: '👥', orden: 14, color: '#DDA0DD' },
  'hobbies':      { icono: '🎨', orden: 15, color: '#98D8C8' }
};

// ─────────────────────────────────────────
// DETERMINAR RAMA AUTOMÁTICAMENTE
// ─────────────────────────────────────────

export function determinarRamaAuto(entidad) {
  if (!entidad) return null;
  
  const tipo = entidad.tipo_entidad;
  const nombre = (entidad.nombre || '').toLowerCase();
  const desc = (entidad.descripcion || '').toLowerCase();
  const textoCompleto = `${nombre} ${desc}`;
  
  // Personas
  if (tipo === 'persona') {
    const familia = ['mamá', 'mama', 'papá', 'papa', 'madre', 'padre', 'hijo', 'hija', 'hermano', 'hermana', 'abuelo', 'abuela', 'tío', 'tio', 'tía', 'tia', 'primo', 'prima'];
    const pareja = ['novia', 'novio', 'pareja', 'esposa', 'esposo', 'marido', 'mujer'];
    
    if (familia.some(f => textoCompleto.includes(f))) return 'familia';
    if (pareja.some(p => textoCompleto.includes(p))) return 'relaciones';
    return 'amigos';
  }
  
  // Objetos
  if (tipo === 'objeto') {
    const vehiculos = ['carro', 'auto', 'moto', 'vehículo', 'vehiculo', 'bicicleta', 'camioneta'];
    const propiedades = ['casa', 'apartamento', 'lote', 'terreno', 'finca', 'oficina'];
    const documentos = ['cedula', 'cédula', 'pasaporte', 'licencia', 'contrato', 'factura'];
    const mascotas = ['perro', 'gato', 'mascota', 'cachorro'];
    
    if (vehiculos.some(v => textoCompleto.includes(v))) return 'vehiculos';
    if (propiedades.some(p => textoCompleto.includes(p))) return 'propiedades';
    if (documentos.some(d => textoCompleto.includes(d))) return 'documentos';
    if (mascotas.some(m => textoCompleto.includes(m))) return 'mascotas';
    return null;
  }
  
  if (tipo === 'proyecto') return 'proyectos';
  if (tipo === 'objetivo') return 'objetivos';
  if (tipo === 'documento') return 'documentos';
  
  return null;
}

// ─────────────────────────────────────────
// AGREGAR AL ÁRBOL
// ─────────────────────────────────────────

export async function agregarAlArbol(usuarioId, entidadId, rama) {
  if (!RAMAS[rama]) return null;
  
  // Verificar si ya está
  const { data: existente } = await supabase
    .from('arbol_vida')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('entidad_id', entidadId)
    .eq('rama', rama)
    .limit(1)
    .maybeSingle();
  
  if (existente) return existente;
  
  const config = RAMAS[rama];
  const { data } = await supabase
    .from('arbol_vida')
    .insert({
      usuario_id: usuarioId,
      rama: rama,
      entidad_id: entidadId,
      importancia: 5,
      orden: config.orden,
      icono: config.icono,
      color: config.color,
      activo: true
    })
    .select()
    .single();
  return data;
}

// ─────────────────────────────────────────
// AGREGAR AUTOMÁTICAMENTE
// ─────────────────────────────────────────

export async function agregarAlArbolAuto(usuarioId, entidad) {
  const rama = determinarRamaAuto(entidad);
  if (!rama) return null;
  return await agregarAlArbol(usuarioId, entidad.id, rama);
}

// ─────────────────────────────────────────
// OBTENER ÁRBOL COMPLETO
// ─────────────────────────────────────────

export async function obtenerArbol(usuarioId) {
  const { data: nodos } = await supabase
    .from('arbol_vida')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('activo', true)
    .order('orden', { ascending: true });
  
  if (!nodos || nodos.length === 0) return { ramas: {}, total: 0 };
  
  // Cargar entidades
  const entIds = nodos.map(n => n.entidad_id).filter(Boolean);
  const { data: entidades } = await supabase
    .from('entidades')
    .select('*')
    .in('id', entIds);
  
  const mapaEnt = {};
  (entidades || []).forEach(e => { mapaEnt[e.id] = e; });
  
  // Agrupar
  const arbol = { ramas: {}, total: nodos.length };
  nodos.forEach(n => {
    if (!arbol.ramas[n.rama]) {
      const config = RAMAS[n.rama] || {};
      arbol.ramas[n.rama] = {
        nombre: n.rama,
        icono: config.icono || '📌',
        color: config.color,
        orden: config.orden,
        entidades: []
      };
    }
    const ent = mapaEnt[n.entidad_id];
    arbol.ramas[n.rama].entidades.push({
      ...n,
      nombre: ent?.nombre,
      descripcion: ent?.descripcion,
      tipo_entidad: ent?.tipo_entidad
    });
  });
  
  return arbol;
}

// ─────────────────────────────────────────
// FORMATEAR PARA WHATSAPP
// ─────────────────────────────────────────

export async function formatearArbolWhatsApp(usuarioId) {
  const arbol = await obtenerArbol(usuarioId);
  
  if (arbol.total === 0) {
    return '🌳 *Tu Árbol de Vida está vacío*\n\nA medida que me cuentes cosas, lo iré construyendo.';
  }
  
  const ramasOrdenadas = Object.entries(arbol.ramas)
    .sort((a, b) => a[1].orden - b[1].orden);
  
  let texto = '🌳 *Tu Árbol de Vida*\n\n';
  
  ramasOrdenadas.forEach(([nombreRama, datos]) => {
    texto += `${datos.icono} *${capitalizar(nombreRama)}* (${datos.entidades.length})\n`;
    datos.entidades.slice(0, 5).forEach(e => {
      texto += `  • ${e.nombre || 'sin nombre'}\n`;
    });
    if (datos.entidades.length > 5) {
      texto += `  ... y ${datos.entidades.length - 5} más\n`;
    }
    texto += '\n';
  });
  
  return texto.trim();
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}