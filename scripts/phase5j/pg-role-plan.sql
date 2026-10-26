-- ============================================================
-- Phase 5J-C — Rôle applicatif minimal `cvcraft_app` (plan C2/C3)
-- Idempotent : exécutable plusieurs fois sans effet de bord.
-- AUCUN mot de passe dans ce fichier : le credential est configuré
-- séparément par l'opérateur via le gestionnaire de secrets :
--   ALTER ROLE cvcraft_app LOGIN PASSWORD '<secret-généré-hors-ligne>';
--
-- Périmètre accordé (relevé du runtime — Backend/db/repositories) :
--   SELECT, INSERT, UPDATE, DELETE, TRIGGER sur :
--     users, plans, subscriptions, payments, transactions
-- NON accordé (volontaire) :
--   id_map (migration uniquement), TRUNCATE, CREATE, ALTER, DROP,
--   CREATE DATABASE, CREATE ROLE, BYPASSRLS, SUPERUSER
-- Aucun REVOKE : les rôles existants (migration, Supabase) sont conservés.
-- ============================================================

-- 1. Rôle applicatif (création idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvcraft_app') THEN
    -- NOLOGIN ici : l'opérateur active LOGIN + PASSWORD après bascule.
    CREATE ROLE cvcraft_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

-- 2. Flags : NON modifiables par ALTER sans superuser (Supabase).
--    Ils sont déjà posés par CREATE ROLE ci-dessus ; on VÉRIFIE seulement.
DO $$
DECLARE f record;
BEGIN
  SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls INTO f
    FROM pg_roles WHERE rolname = 'cvcraft_app';
  IF f.rolsuper OR f.rolcreatedb OR f.rolcreaterole OR f.rolbypassrls THEN
    RAISE EXCEPTION 'cvcraft_app : flags interdits détectés — corriger manuellement';
  END IF;
END
$$;

-- 3. Accès schéma
GRANT USAGE ON SCHEMA public TO cvcraft_app;

-- 4. Privilèges minimaux sur les 5 tables du runtime
GRANT SELECT, INSERT, UPDATE, DELETE, TRIGGER ON TABLE
  users, plans, subscriptions, payments, transactions
TO cvcraft_app;

-- 4bis. Politiques RLS explicites pour cvcraft_app — RLS est active SANS
--       politique sur ces tables (default deny) : un rôle sans BYPASSRLS serait
--       intégralement bloqué. On accorde l'accès par POLITIQUE (pas par
--       BYPASSRLS) : les rôles anon/authenticated restent bloqués, la
--       protection RLS demeure contre les autres rôles.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','plans','subscriptions','payments','transactions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS cvcraft_app_all ON %I', t);
    EXECUTE format(
      'CREATE POLICY cvcraft_app_all ON %I FOR ALL TO cvcraft_app USING (true) WITH CHECK (true)', t);
  END LOOP;
END
$$;

-- 5. Vérification : id_map volontairement NON accordée au runtime
--    (utilisée par scripts/migrate/* avec le rôle de migration).

-- ============================================================
-- ACTIVATION (opérateur uniquement — hors dépôt, secret jamais committé) :
--   ALTER ROLE cvcraft_app LOGIN PASSWORD '<secret-généré-hors-ligne>';
--   -- puis bascule DATABASE_URL vers le nouveau credential :
--   -- postgresql://cvcraft_app:<secret>@<host-pooler>:5432/postgres
-- ============================================================
