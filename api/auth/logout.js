// ============================================================
//  Du Life - Logout
//  api/auth/logout.js
// ============================================================

export default async function handler(req, res) {
  // Borrar cookie
  res.setHeader('Set-Cookie', [
    'dulife_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  ]);
  
  return res.status(200).json({ success: true });
}