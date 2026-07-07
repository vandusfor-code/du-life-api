// Mapeo de comercios/marcas conocidas -> logo real, para que gastos y
// actividades muestren el logo de la marca (Netflix, Rappi, Bancolombia...)
// en vez de un ícono genérico. Dos fuentes, ambas gratis y sin API key:
//
// - 'icon'    -> cdn.simpleicons.org/<slug> (SVG oficial de marca, mejor
//                calidad, pero solo cubre marcas globales de tech/consumo).
// - 'favicon' -> favicon vía icons.duckduckgo.com/ip3/<dominio>.ico, para
//                marcas colombianas/regionales que Simple Icons no tiene
//                (bancos, retail). Antes se usaba el favicon de Google
//                (google.com/s2/favicons) pero resultó poco confiable: el
//                mismo dominio a veces cargaba y a veces no (es un endpoint
//                no documentado, sin garantía real de disponibilidad). El
//                de DuckDuckGo se probó de forma repetida y consistente
//                para los ~25 dominios de esta lista sin ningún fallo.
//
// Es una lista curada a mano: se revisa/agranda cuando aparezcan comercios
// nuevos frecuentes. Si un texto no matchea nada de acá, el llamador debe
// caer al ícono de categoría de siempre (ver components/LogoComercio.js).
const COMERCIOS = [
  // Streaming / entretenimiento
  { patrones: ['netflix'], tipo: 'icon', valor: 'netflix' },
  { patrones: ['spotify'], tipo: 'icon', valor: 'spotify' },
  { patrones: ['hbo', 'max app', 'hbo max'], tipo: 'icon', valor: 'hbomax' },
  { patrones: ['disney'], tipo: 'favicon', valor: 'www.disneyplus.com' },
  { patrones: ['amazon prime', 'prime video'], tipo: 'favicon', valor: 'primevideo.amazon.com' },
  { patrones: ['youtube'], tipo: 'icon', valor: 'youtube' },

  // Transporte
  { patrones: ['uber eats', 'ubereats'], tipo: 'favicon', valor: 'ubereats.com' },
  { patrones: ['uber'], tipo: 'icon', valor: 'uber' },
  { patrones: ['didi'], tipo: 'favicon', valor: 'www.didiglobal.com' },
  { patrones: ['cabify'], tipo: 'favicon', valor: 'www.cabify.com' },
  { patrones: ['rappi'], tipo: 'favicon', valor: 'rappi.com' },

  // Comida rápida
  { patrones: ['mcdonald', 'mcdonalds'], tipo: 'icon', valor: 'mcdonalds' },
  { patrones: ['starbucks'], tipo: 'icon', valor: 'starbucks' },
  { patrones: ['kfc'], tipo: 'icon', valor: 'kfc' },
  { patrones: ['burger king', 'burgerking'], tipo: 'icon', valor: 'burgerking' },
  { patrones: ['crepes', 'crepes & waffles'], tipo: 'favicon', valor: 'crepesywaffles.com.co' },

  // Supermercados / retail Colombia
  { patrones: ['exito', 'éxito'], tipo: 'favicon', valor: 'exito.com' },
  { patrones: ['carulla'], tipo: 'favicon', valor: 'carulla.com' },
  { patrones: ['d1', 'tiendas d1'], tipo: 'favicon', valor: 'tiendasd1.com' },
  { patrones: ['ara', 'tiendas ara'], tipo: 'favicon', valor: 'tiendasara.co' },
  { patrones: ['olimpica', 'olímpica'], tipo: 'favicon', valor: 'www.olimpica.com' },
  { patrones: ['jumbo'], tipo: 'favicon', valor: 'tiendasjumbo.co' },
  { patrones: ['falabella'], tipo: 'favicon', valor: 'falabella.com.co' },

  // Bancos / billeteras
  { patrones: ['bancolombia'], tipo: 'favicon', valor: 'grupobancolombia.com' },
  { patrones: ['nequi'], tipo: 'favicon', valor: 'www.nequi.com.co' },
  { patrones: ['daviplata'], tipo: 'favicon', valor: 'daviplata.davivienda.com' },
  { patrones: ['davivienda'], tipo: 'favicon', valor: 'davivienda.com' },
  { patrones: ['bbva'], tipo: 'favicon', valor: 'www.bbva.com.co' },
  { patrones: ['banco de bogota', 'banco de bogotá'], tipo: 'favicon', valor: 'bancodebogota.com' },

  // Servicios / telecom
  { patrones: ['claro'], tipo: 'favicon', valor: 'claro.com' },
  { patrones: ['movistar'], tipo: 'icon', valor: 'movistar' },
  { patrones: ['tigo'], tipo: 'favicon', valor: 'www.tigo.com.co' },

  // Tech / otros globales
  { patrones: ['apple', 'app store', 'itunes'], tipo: 'icon', valor: 'apple' },
  { patrones: ['google play', 'playstore'], tipo: 'icon', valor: 'googleplay' },
  { patrones: ['microsoft'], tipo: 'favicon', valor: 'www.microsoft.com' },
  { patrones: ['amazon'], tipo: 'favicon', valor: 'www.amazon.com' },
  { patrones: ['airbnb'], tipo: 'icon', valor: 'airbnb' },
  { patrones: ['paypal'], tipo: 'icon', valor: 'paypal' },
];

export function obtenerLogoComercio(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase();
  const match = COMERCIOS.find((c) => c.patrones.some((p) => t.includes(p)));
  if (!match) return null;

  if (match.tipo === 'icon') {
    return `https://cdn.simpleicons.org/${match.valor}`;
  }
  return `https://icons.duckduckgo.com/ip3/${match.valor}.ico`;
}
