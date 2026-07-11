// ============================================================
//  Du Life - Motor del Ángel Guardián
//  lib/angelGuardianEngine.js
//
//  Fase 0: manejar los botones de la plantilla del chequeo de fin de
//  semana (chequeo_fin_semana → "En casa" / "Salidita"), que hoy caen
//  en el "else" del pipeline porque llegan como type:'button' y nadie
//  los procesa. El flujo completo de activación del Ángel Guardián
//  (opt-in, disclaimer, chequeos adaptativos, cierre) llega en Fase 1.
// ============================================================

// Los botones de una PLANTILLA de WhatsApp llegan como mensaje.type === 'button'
// con { text, payload } — distinto de los botones interactivos del API de
// mensajes (type:'interactive', button_reply), que ya maneja el pipeline.
// Meta autocorrigió "Salida 🍺" a "Salidita" y no admite emojis en el texto
// del botón, así que el match es por el texto EXACTO de la plantilla.
export async function procesarBotonPlantilla(usuario, textoBoton) {
  const texto = String(textoBoton || '').trim();

  if (texto === 'En casa') {
    return 'Genial, descanso y compartir en familia 🏡. Recuerda que puedes registrar tus gastos del día con solo escribirme, para llevar el control. 💚';
  }

  if (texto === 'Salidita') {
    // Fase 1 reemplazará esto por la pregunta de activación del Ángel
    // Guardián (botones "Sí, actívalo" / "No, gracias"). Por ahora, una
    // respuesta cálida y completa — nunca un callejón sin salida.
    return '¡Que disfrutes tu salida! 🎉 Cuídate mucho y cualquier cosa por aquí estoy. 💚';
  }

  // Botón no reconocido: no respondemos nada (evita mensajes raros).
  return null;
}
