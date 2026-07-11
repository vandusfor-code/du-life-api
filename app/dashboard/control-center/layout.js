import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '../../../lib/supabase.js';
import AdminShell from '../../../components/control-center/AdminShell.js';

// Mismo algoritmo que api/dashboard/[modulo].js (Node, no Edge acá — los
// layouts corren como Server Component normal). Se duplica en vez de
// importar del router de la API para no tocar ese archivo ni su patrón de
// consolidación de endpoints.
// Nunca uses un secreto por defecto: si JWT_SECRET falta, falla ruidosamente.
function obtenerJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está configurado');
  return secret;
}

function verificarToken(token) {
  if (!token) return null;
  const secret = obtenerJwtSecret();
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return null;
    const [header, payload, signature] = partes;
    const data = `${header}.${payload}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (signature !== expected) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch (e) {
    return null;
  }
}

// El middleware (raíz del proyecto) ya devuelve 403 para acceso directo por
// URL sin rol. Este layout es la segunda capa: resuelve el bootstrap del
// owner (persiste metadata.rol la primera vez) y protege también la
// navegación normal dentro de la app.
export default async function ControlCenterLayout({ children }) {
  const cookieStore = cookies();
  const token = cookieStore.get('dulife_token')?.value;
  const sesion = verificarToken(token);
  if (!sesion || !sesion.usuario_id) {
    redirect('/login');
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('telefono, metadata')
    .eq('id', sesion.usuario_id)
    .single();

  if (!usuario) {
    redirect('/dashboard');
  }

  let rol = usuario.metadata?.rol;

  if (!rol && process.env.OWNER_PHONE && usuario.telefono === process.env.OWNER_PHONE) {
    rol = 'owner';
    await supabase
      .from('usuarios')
      .update({ metadata: { ...usuario.metadata, rol: 'owner' } })
      .eq('id', sesion.usuario_id);
  }

  if (rol !== 'owner' && rol !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="cc-theme">
      <AdminShell rol={rol}>{children}</AdminShell>
    </div>
  );
}
