-- ============================================================
-- Backend/db/schema/003_user_sessions.sql
-- Registre de sessions JWT (Lot 2G.7 — révocation côté serveur)
-- ============================================================
-- ORDRE OFFICIEL : 001_initial.sql → 002_financial_history_protection.sql
--                  → grants/001_grants_rls.sql → 003_user_sessions.sql
-- (003 vient APRÈS la procédure de grants ; celle-ci exclut user_sessions de
--  ses compteurs de vérification — voir §6 de grants/001_grants_rls.sql).
--
-- PRINCIPE : chaque JWT porte un claim `jti` (identifiant de session unique) ;
-- toute requête authentifiée vérifie que la session est ACTIVE (présente, non
-- révoquée, non expirée) — échec de stockage = REFUS FERMÉ (jamais d'acceptation
-- silencieuse). Le logout révoque la session AVANT de confirmer.
-- RÉTENTION : purge opportuniste des sessions expirées de plus de 7 jours
-- (déclenchée au login) ; les lignes expirées sont purgables par l'app
-- (politique RLS dédiée) — aucune croissance indéfinie.
-- Sessions ≠ historique financier : user_id ON DELETE CASCADE (la suppression
-- d'un compte emporte ses sessions ; les protections financières 002 restent
-- inchangées).
-- ============================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  jti        TEXT PRIMARY KEY,               -- claim `jti` du JWT
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,           -- aligné sur l'expiration du JWT
  revoked_at TIMESTAMPTZ                     -- NULL = session active
);

CREATE INDEX IF NOT EXISTS user_sessions_expires_idx ON user_sessions (expires_at);
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id);

-- ============================================================
-- Privilèges (moindre autorité — nécessité démontrée : le rôle applicatif doit
-- enregistrer, vérifier et révoquer SES sessions) :
--   cvc_app   : SELECT/INSERT ; UPDATE (revoked_at) uniquement ; DELETE
--               restreint aux sessions EXPIRÉES par la politique RLS ;
--   cvc_migr  : DML complet (migration/audit) ;
--   cvc_admin : DML complet (maintenance supervisée).
-- ============================================================
GRANT SELECT, INSERT ON public.user_sessions TO cvc_app;
GRANT UPDATE (revoked_at) ON public.user_sessions TO cvc_app;
GRANT DELETE ON public.user_sessions TO cvc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO cvc_migr, cvc_admin;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_select ON public.user_sessions;
CREATE POLICY sessions_select ON public.user_sessions
  FOR SELECT TO cvc_app, cvc_admin, cvc_migr USING (true);

DROP POLICY IF EXISTS sessions_insert ON public.user_sessions;
CREATE POLICY sessions_insert ON public.user_sessions
  FOR INSERT TO cvc_app, cvc_admin, cvc_migr WITH CHECK (true);

DROP POLICY IF EXISTS sessions_update ON public.user_sessions;
CREATE POLICY sessions_update ON public.user_sessions
  FOR UPDATE TO cvc_app, cvc_admin, cvc_migr USING (true) WITH CHECK (true);

-- Rétention : l'app ne peut supprimer que des sessions EXPIRÉES.
DROP POLICY IF EXISTS sessions_delete_app ON public.user_sessions;
CREATE POLICY sessions_delete_app ON public.user_sessions
  FOR DELETE TO cvc_app USING (expires_at < now());

DROP POLICY IF EXISTS sessions_delete_admin ON public.user_sessions;
CREATE POLICY sessions_delete_admin ON public.user_sessions
  FOR DELETE TO cvc_admin, cvc_migr USING (true);

-- ============================================================
-- Vérification post-application (échec clair)
-- ============================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'user_sessions';
  IF n <> 5 THEN
    RAISE EXCEPTION 'user_sessions : % politiques, 5 attendues — configuration incomplète', n;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_sessions' AND relrowsecurity) THEN
    RAISE EXCEPTION 'user_sessions : RLS non actif — refus';
  END IF;
END
$$;
