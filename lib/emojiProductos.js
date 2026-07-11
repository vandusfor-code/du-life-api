// ============================================================
//  Du Life - Emoji por producto/servicio
//  lib/emojiProductos.js
//  Repositorio de emoji (no una librería de íconos externa: cero
//  dependencias nuevas, cobertura amplia de comida/servicios comunes
//  en negocios pequeños de LatAm) para que cada venta se identifique
//  a simple vista, tanto en WhatsApp como en el dashboard web.
//  Sin acentos internamente: quitarSufijoAcentos() normaliza antes
//  de comparar, así "café", "cafe" y "CAFÉ" matchean igual.
// ============================================================

const MAPA_EMOJI = [
  { palabras: ['hamburguesa', 'burger'], emoji: '🍔' },
  { palabras: ['perro caliente', 'hot dog', 'hotdog', 'salchipapa'], emoji: '🌭' },
  { palabras: ['pizza'], emoji: '🍕' },
  { palabras: ['empanada'], emoji: '🥟' },
  { palabras: ['arepa'], emoji: '🫓' },
  { palabras: ['taco'], emoji: '🌮' },
  { palabras: ['burrito'], emoji: '🌯' },
  { palabras: ['sushi'], emoji: '🍣' },
  { palabras: ['pollo', 'alitas'], emoji: '🍗' },
  { palabras: ['carne', 'churrasco', 'asado', 'res', 'chuleta'], emoji: '🥩' },
  { palabras: ['pescado', 'ceviche', 'camaron', 'camarón', 'mariscos'], emoji: '🐟' },
  { palabras: ['ensalada'], emoji: '🥗' },
  { palabras: ['sopa', 'caldo', 'ajiaco', 'sancocho'], emoji: '🍲' },
  { palabras: ['sandwich', 'sanduche', 'sánduche'], emoji: '🥪' },
  { palabras: ['papa', 'papas fritas', 'fritos'], emoji: '🍟' },
  { palabras: ['arroz'], emoji: '🍚' },
  { palabras: ['pasta', 'espagueti'], emoji: '🍝' },
  { palabras: ['pastel', 'torta', 'ponque', 'cupcake', 'brownie'], emoji: '🍰' },
  { palabras: ['helado'], emoji: '🍦' },
  { palabras: ['dulce', 'chocolate', 'bombon', 'bombón'], emoji: '🍫' },
  { palabras: ['galleta'], emoji: '🍪' },
  { palabras: ['donut', 'dona'], emoji: '🍩' },
  { palabras: ['pan', 'panaderia', 'panadería', 'croissant'], emoji: '🍞' },
  { palabras: ['cafe', 'tinto', 'capuchino', 'latte'], emoji: '☕' },
  { palabras: ['te', 'té', 'aromatica', 'aromática'], emoji: '🍵' },
  { palabras: ['jugo', 'batido', 'smoothie', 'malteada'], emoji: '🥤' },
  { palabras: ['gaseosa', 'soda', 'cola', 'refresco'], emoji: '🥤' },
  { palabras: ['cerveza'], emoji: '🍺' },
  { palabras: ['vino'], emoji: '🍷' },
  { palabras: ['agua'], emoji: '💧' },
  { palabras: ['huevo'], emoji: '🥚' },
  { palabras: ['queso'], emoji: '🧀' },
  { palabras: ['leche'], emoji: '🥛' },
  { palabras: ['fruta', 'manzana', 'banano', 'platano', 'plátano', 'mango', 'fresa'], emoji: '🍎' },
  { palabras: ['verdura', 'vegetal', 'brocoli', 'brócoli'], emoji: '🥦' },
  { palabras: ['corte de cabello', 'corte de pelo', 'peluqueria', 'peluquería', 'barberia', 'barbería', 'barba', 'tinte', 'mechas'], emoji: '💇' },
  { palabras: ['manicure', 'uñas', 'unas', 'pedicure', 'esmaltado'], emoji: '💅' },
  { palabras: ['masaje', 'spa'], emoji: '💆' },
  { palabras: ['maquillaje'], emoji: '💄' },
  { palabras: ['mantenimiento', 'reparacion', 'reparación', 'tecnico', 'técnico', 'computador', 'portatil', 'portátil', 'laptop', 'pc'], emoji: '🔧' },
  { palabras: ['celular', 'telefono', 'teléfono', 'smartphone'], emoji: '📱' },
  { palabras: ['diseño', 'diseno', 'logo', 'grafico', 'gráfico', 'ilustracion', 'ilustración'], emoji: '🎨' },
  { palabras: ['asesoria', 'asesoría', 'consultoria', 'consultoría', 'contabilidad', 'auditoria', 'auditoría'], emoji: '📋' },
  { palabras: ['limpieza', 'aseo'], emoji: '🧹' },
  { palabras: ['plomeria', 'plomería', 'fontaneria', 'fontanería'], emoji: '🚿' },
  { palabras: ['electric'], emoji: '⚡' },
  { palabras: ['clase', 'curso', 'tutoria', 'tutoría', 'capacitacion', 'capacitación'], emoji: '📚' },
  { palabras: ['foto', 'fotografia', 'fotografía'], emoji: '📷' },
  { palabras: ['video', 'edicion', 'edición'], emoji: '🎬' },
  { palabras: ['musica', 'música', 'dj', 'sonido'], emoji: '🎵' },
  { palabras: ['camisa', 'camiseta', 'blusa', 'ropa', 'pantalon', 'pantalón', 'vestido', 'chaqueta', 'falda'], emoji: '👕' },
  { palabras: ['zapato', 'tenis', 'calzado', 'bota', 'sandalia'], emoji: '👟' },
  { palabras: ['bolso', 'cartera', 'maleta'], emoji: '👜' },
  { palabras: ['joya', 'anillo', 'collar', 'pulsera', 'accesorio'], emoji: '💍' },
  { palabras: ['flor', 'ramo'], emoji: '💐' },
  { palabras: ['planta', 'jardineria', 'jardinería'], emoji: '🪴' },
  { palabras: ['libro'], emoji: '📖' },
  { palabras: ['juguete'], emoji: '🧸' },
  { palabras: ['mascota', 'perro', 'gato', 'veterinaria'], emoji: '🐾' },
  { palabras: ['medicamento', 'droga', 'farmacia', 'droguer'], emoji: '💊' },
  { palabras: ['transporte', 'domicilio', 'envio', 'envío', 'flete', 'mudanza'], emoji: '🚚' },
  { palabras: ['taller', 'moto', 'carro', 'vehiculo', 'vehículo', 'llanta'], emoji: '🔩' },
  { palabras: ['lavado', 'lavanderia', 'lavandería'], emoji: '🧺' },
  { palabras: ['gimnasio', 'entrenamiento', 'fitness'], emoji: '🏋️' },
];

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function escaparRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Límite de palabra a la izquierda (\b) + plural opcional (s|es) a la
// derecha: un includes() simple hacía falsos positivos como "té" adentro
// de "man-TE-nimiento" o "cor-TE", pero exigir \b en ambos lados rompía
// los plurales normales ("hamburguesas" ya no matcheaba "hamburguesa").
// Ambos casos confirmados con un script de prueba antes de usarlo.
const MAPA_NORMALIZADO = MAPA_EMOJI.map(({ palabras, emoji }) => ({
  patrones: palabras.map((p) => new RegExp(`\\b${escaparRegex(normalizar(p))}(s|es)?\\b`)),
  emoji,
}));

export function emojiParaProducto(nombreProducto) {
  if (!nombreProducto) return '📦';
  const texto = normalizar(nombreProducto);
  for (const { patrones, emoji } of MAPA_NORMALIZADO) {
    if (patrones.some((re) => re.test(texto))) return emoji;
  }
  return '📦';
}
