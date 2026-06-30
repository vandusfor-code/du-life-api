// ============================================================
//  Du Life - Cron Diario
//  api/cron-daily.js
//  Se ejecuta cada día a las 6am (configurado en vercel.json)
// ============================================================

import { supabase } from '../lib/supabase.js';
import { analizarPatronesUsuario } from '../lib/patronesEngine.js';
import { ejecutarRevisionEnvejecimiento } from '../lib/envejecimiento.js';

export default async function handler(req, res) {
  
  // Verificar que sea Vercel quien llama (seguridad)
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log('🕐 Cron diario iniciado');
  
  try {
    // Obtener todos los usuarios activos
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id, telefono, nombre')
      .eq('activo', true)
      .eq('onboarding_completo', true);
    
    if (!usuarios || usuarios.length === 0) {
      console.log('No hay usuarios para procesar');
      return res.status(200).json({ status: 'ok', usuarios: 0 });
    }
    
    console.log(`Procesando ${usuarios.length} usuarios`);
    
    const resultados = {
      usuarios_procesados: 0,
      patrones_detectados: 0,
      elementos_envejecidos: 0,
      errores: 0
    };
    
    // Procesar cada usuario
    for (const usuario of usuarios) {
      try {
        console.log(`\n👤 Usuario: ${usuario.nombre}`);
        
        // 1. Detectar patrones
        const patrones = await analizarPatronesUsuario(usuario.id);
        if (patrones && patrones.pagos_recurrentes) {
          resultados.patrones_detectados += patrones.pagos_recurrentes.length;
        }
        
        // 2. Revisar envejecimiento
        const envejecimiento = await ejecutarRevisionEnvejecimiento(usuario.id);
        if (envejecimiento) {
          resultados.elementos_envejecidos += envejecimiento.total;
        }
        
        resultados.usuarios_procesados++;
      } catch (e) {
        console.error(`Error procesando usuario ${usuario.id}:`, e.message);
        resultados.errores++;
      }
    }
    
    console.log('\n✅ Cron diario completado:', resultados);
    
    return res.status(200).json({
      status: 'ok',
      ...resultados
    });
    
  } catch (e) {
    console.error('❌ Error en cron:', e.message);
    return res.status(500).json({ error: e.message });
  }
}