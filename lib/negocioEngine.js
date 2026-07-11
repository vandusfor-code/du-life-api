// ============================================================
//  Du Life - Motor de Negocio (Ventas)
//  lib/negocioEngine.js
//  Fase 1: activar modo negocio, registrar venta por lenguaje
//  natural, clientes automáticos. El resto del módulo (fiados,
//  inventario, alertas, comprobantes) llega en fases siguientes.
// ============================================================

import {
  actualizarModoNegocioDB,
  crearVenta,
  resolverOCrearCliente,
} from './supabase.js';
import { emojiParaProducto } from './emojiProductos.js';

function formatCOP(n) {
  return '$' + Math.round(Number(n)).toLocaleString('es-CO');
}

export async function activarModoNegocio(usuario) {
  if (usuario.modo_negocio) {
    return '💼 El modo negocio ya estaba activo. Cuéntame tus ventas cuando quieras, ej: "vendí 2 hamburguesas por $35.000".';
  }
  await actualizarModoNegocioDB(usuario.id, true);
  usuario.modo_negocio = true;
  return '💼 ¡Modo negocio activado!\n\nDesde ahora puedes contarme tus ventas así: "vendí 2 hamburguesas por $35.000" o "cobré $120.000 a Juan por mantenimiento", y yo llevo las cuentas por ti. Revisa el dashboard completo en la app web, en la sección Negocio.';
}

// El nombre del cliente es opcional (una venta de mostrador sin cliente
// identificado es igual de válida) — solo se crea/busca el cliente si el
// usuario lo mencionó explícitamente.
export async function registrarVentaYFormatear(usuarioId, datos) {
  const monto = Number(datos.valor_total);
  if (!monto || monto <= 0) return 'No entendí el valor de la venta. ¿Cuánto fue?';

  let clienteId = null;
  if (datos.cliente_nombre) {
    const cliente = await resolverOCrearCliente(usuarioId, datos.cliente_nombre);
    clienteId = cliente?.id || null;
  }

  const venta = await crearVenta(usuarioId, {
    cliente_id: clienteId,
    producto: datos.producto || 'Venta',
    cantidad: datos.cantidad || 1,
    precio_unitario: datos.precio_unitario || null,
    valor_total: monto,
    metodo_pago: datos.metodo_pago || null,
    fecha: datos.fecha || undefined,
    mensaje_original: datos.mensaje_original || null,
  });

  if (!venta) return 'No pude registrar la venta. Intenta de nuevo.';

  const horaTexto = new Date().toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });

  let texto = `✅ Venta registrada\n\n`;
  texto += `${emojiParaProducto(venta.producto)} Producto: ${venta.producto}\n`;
  if (Number(venta.cantidad) !== 1) texto += `🔢 Cantidad: ${venta.cantidad}\n`;
  if (datos.cliente_nombre) texto += `👤 Cliente: ${datos.cliente_nombre}\n`;
  texto += `💰 Total: ${formatCOP(venta.valor_total)}\n`;
  texto += `📅 Fecha: Hoy ${horaTexto}`;
  return texto;
}
