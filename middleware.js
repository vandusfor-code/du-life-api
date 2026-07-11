import { NextResponse } from 'next/server';

// Protege TODO /dashboard/**. Corre en Edge runtime (no tiene el módulo
// `crypto` de Node), así que la verificación HMAC del mismo token
// dulife_token se reimplementa con Web Crypto — es la misma lógica que
// api/dashboard/[modulo].js, solo con crypto.subtle.verify en vez de
// crypto.createHmac.
//
// - Sin sesión válida → redirect a /login. Antes las páginas del dashboard
//   (estáticas, sin guard) se renderizaban igual para visitantes sin cookie
//   — la PWA arranca en /dashboard (start_url del manifest) y un usuario
//   nuevo veía el esqueleto con el nombre de relleno, como si hubiera una
//   sesión abierta.
// - /dashboard/control-center/** mantiene además su chequeo de rol con 403,
//   leyendo el rol siempre fresco desde Supabase (REST directo), nunca del
//   JWT: el login (api/auth/verify-code.js) no se toca para nada.
export const config = {
  matcher: ['/dashboard/:path*'],
};

function base64urlToUint8Array(base64url) {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function base64urlDecodeToString(base64url) {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

async function verificarTokenEdge(token, secret) {
  if (!token) return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [header, payload, signature] = partes;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const data = new TextEncoder().encode(`${header}.${payload}`);
    const sigBytes = base64urlToUint8Array(signature);
    const valido = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    if (!valido) return null;

    const decoded = JSON.parse(base64urlDecodeToString(payload));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch (e) {
    return null;
  }
}

// Sin rol guardado todavía: si el teléfono coincide con OWNER_PHONE (ya
// existía como env var sin usar), se trata como 'owner' — el layout de
// Control Center persiste esto en metadata en el primer acceso real.
async function obtenerRol(usuarioId) {
  try {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/usuarios?id=eq.${encodeURIComponent(usuarioId)}&select=telefono,metadata`,
      {
        headers: {
          apikey: process.env.SUPABASE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const usuario = rows?.[0];
    if (!usuario) return null;

    const rol = usuario.metadata?.rol;
    if (rol) return rol;
    if (process.env.OWNER_PHONE && usuario.telefono === process.env.OWNER_PHONE) {
      return 'owner';
    }
    return 'user';
  } catch (e) {
    return null;
  }
}

export async function middleware(req) {
  const token = req.cookies.get('dulife_token')?.value;
  // Nunca uses un secreto por defecto: si JWT_SECRET falta, falla ruidosamente.
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está configurado');
  const sesion = await verificarTokenEdge(token, secret);
  const esControlCenter = req.nextUrl.pathname.startsWith('/dashboard/control-center');

  if (!sesion || !sesion.usuario_id) {
    // Control Center responde 403 seco (no debe ni insinuar que existe);
    // el resto del dashboard manda al login, limpiando una cookie inválida
    // o vencida si la había.
    if (esControlCenter) {
      return new NextResponse('No autorizado', { status: 403 });
    }
    const res = NextResponse.redirect(new URL('/login', req.url));
    if (token) res.cookies.delete('dulife_token');
    return res;
  }

  if (esControlCenter) {
    const rol = await obtenerRol(sesion.usuario_id);
    if (rol !== 'owner' && rol !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return NextResponse.next();
}
