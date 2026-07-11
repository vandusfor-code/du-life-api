-- ============================================================
--  Du Life — RLS (defensa en profundidad) — Auditoría FIX 5 / #5
--  GENERADO PARA REVISIÓN. NO ejecutado por Claude.
--  Corre esto TÚ en Supabase → SQL Editor, por PARTES, leyendo
--  primero la PARTE 0.
-- ============================================================
--
--  CONTEXTO IMPORTANTE (por qué el script es como es):
--
--  Du Life NO usa Supabase Auth. Autentica con un JWT propio
--  (dulife_token, firmado con JWT_SECRET) que NUNCA se manda a
--  Supabase. El backend habla con Supabase SIEMPRE con la
--  service_role key (SUPABASE_KEY). Consecuencias:
--
--   1. `auth.uid()` es SIEMPRE NULL en este proyecto → políticas
--      del tipo `USING (auth.uid() = usuario_id)` NUNCA otorgarían
--      acceso a nadie; equivalen a "denegar todo" para roles
--      anon/authenticated. No aportan nada extra y confunden.
--   2. El token del usuario nunca llega a Postgres, así que tampoco
--      se puede leer un claim de usuario en la política.
--   3. La service_role key IGNORA RLS (atributo BYPASSRLS). Por eso
--      activar RLS NO cambia el comportamiento actual del backend.
--
--  => El modelo correcto acá es: ACTIVAR RLS + DENEGAR POR DEFECTO
--     (sin políticas permisivas). El backend (service_role) sigue
--     funcionando igual; cualquier acceso con la anon key (si algún
--     día se filtra o se usa desde el cliente) queda BLOQUEADO.
--     Eso es exactamente la defensa en profundidad que falta hoy.
--
-- ============================================================


-- ============================================================
--  PARTE 0 — PREFLIGHT (SOLO LECTURA). Corre esto PRIMERO.
-- ============================================================
--
--  0.a) CONFIRMA que SUPABASE_KEY es la service_role key, NO la anon.
--       ⚠️ Si por error fuera la anon key, activar RLS ROMPERÍA toda
--       la app (anon + RLS + sin política = sin acceso). Verifícalo:
--       Supabase → Project Settings → API → copia el valor de
--       "service_role" y compáralo con el SUPABASE_KEY que tienes en
--       Vercel. Deben coincidir. NO sigas si no coinciden.

--  0.b) Estado actual de RLS por tabla (para comparar antes/después):
SELECT tablename, rowsecurity AS rls_activo
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;


-- ============================================================
--  PARTE 1 — ACTIVAR RLS (deny-by-default) EN TODAS LAS TABLAS
--  DE DATOS DE USUARIO. Idempotente y seguro: si una tabla no
--  existe, la omite en vez de abortar. NO crea políticas: RLS
--  activo + sin política = denegado para anon/authenticated,
--  y service_role sigue pasando por BYPASSRLS.
-- ============================================================
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'usuarios',               -- identidad (clave: id)
    'mensajes',               -- historial de conversación
    'entidades',              -- personas/objetivos/memoria
    'hechos',                 -- hechos de memoria
    'tareas',
    'prestamos',
    'prestamos_movimientos',  -- hijo de prestamos
    'ingresos',
    'gastos',
    'ventas',                 -- negocio
    'clientes_negocio',       -- negocio
    'notas',
    'ideas',
    'calendario_eventos',
    'arbol_vida',
    'relaciones',
    'emociones',
    'registro_animo',
    'patrones',
    'resumen_semanal',
    'onboarding_estado',
    'usuario_perfil_estado',
    'push_subscriptions',
    'documentos',
    'archivos_multimedia',
    'codigos_otp'             -- OTP (flujo pre-login, también vía service_role)
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      RAISE NOTICE 'RLS habilitado: %', t;
    ELSE
      RAISE NOTICE 'OMITIDA (no existe en public): %', t;
    END IF;
  END LOOP;
END $$;


-- ============================================================
--  PARTE 2 — VERIFICACIÓN. Corre esto DESPUÉS de la PARTE 1.
-- ============================================================

--  2.a) Todas las tablas de la lista deben tener rls_activo = true.
--       Si alguna sale en false, no se activó (revisa el nombre).
SELECT tablename, rowsecurity AS rls_activo
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'usuarios','mensajes','entidades','hechos','tareas','prestamos',
    'prestamos_movimientos','ingresos','gastos','ventas','clientes_negocio',
    'notas','ideas','calendario_eventos','arbol_vida','relaciones','emociones',
    'registro_animo','patrones','resumen_semanal','onboarding_estado',
    'usuario_perfil_estado','push_subscriptions','documentos','archivos_multimedia',
    'codigos_otp'
  )
ORDER BY rls_activo, tablename;

--  2.b) Detecta tablas de public con RLS AÚN apagado (deberían ser 0
--       entre las de datos de usuario; si aparece alguna tabla nueva
--       que no está en la lista, evalúa si también necesita RLS):
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false
ORDER BY tablename;

--  2.c) Políticas existentes (esperado: NINGUNA — deny-by-default).
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;


-- ============================================================
--  PARTE 3 — ROLLBACK (por si algo se rompe tras activar).
--  Solo si notas que la app dejó de leer/escribir datos (lo que
--  indicaría que SUPABASE_KEY NO era service_role). Desactiva RLS:
-- ============================================================
-- DO $$
-- DECLARE
--   t text;
--   tablas text[] := ARRAY[
--     'usuarios','mensajes','entidades','hechos','tareas','prestamos',
--     'prestamos_movimientos','ingresos','gastos','ventas','clientes_negocio',
--     'notas','ideas','calendario_eventos','arbol_vida','relaciones','emociones',
--     'registro_animo','patrones','resumen_semanal','onboarding_estado',
--     'usuario_perfil_estado','push_subscriptions','documentos','archivos_multimedia',
--     'codigos_otp'
--   ];
-- BEGIN
--   FOREACH t IN ARRAY tablas LOOP
--     IF EXISTS (SELECT 1 FROM information_schema.tables
--                WHERE table_schema='public' AND table_name=t) THEN
--       EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', t);
--     END IF;
--   END LOOP;
-- END $$;


-- ============================================================
--  NOTA — políticas por usuario (SOLO si algún día migran a
--  Supabase Auth). Hoy NO aplican (auth.uid() es null). Si en el
--  futuro Du Life usa Supabase Auth y usuarios.id pasa a ser el
--  auth.uid() del usuario, recién ahí tendría sentido algo como:
--
--    CREATE POLICY p_sel ON public.gastos FOR SELECT
--      USING (auth.uid() = usuario_id);
--    CREATE POLICY p_ins ON public.gastos FOR INSERT
--      WITH CHECK (auth.uid() = usuario_id);
--
--  y equivalentes por tabla. Mientras tanto, deny-by-default es
--  la protección correcta y suficiente.
-- ============================================================
