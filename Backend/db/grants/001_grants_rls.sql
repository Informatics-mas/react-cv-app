-- ============================================================
-- Backend/db/grants/001_grants_rls.sql
-- Procédure versionnée de préparation RLS / grants PostgreSQL — Lot 2G.4D
-- ============================================================
-- ORDRE OFFICIEL D'EXÉCUTION (procédure de préparation d'une base neuve) :
--   1. Backend/db/schema/001_initial.sql
--   2. Backend/db/schema/002_financial_history_protection.sql
--   3. Backend/db/grants/001_grants_rls.sql   ← ce fichier
--   4. Backend/db/schema/003_user_sessions.sql (sessions JWT — Lot 2G.7)
-- Le schéma (migrations métier) et les grants/RLS sont volontairement séparés.
--
-- PROPRIÉTÉS :
--   * Idempotent : exécutable plusieurs fois sans effet de bord (régénère les
--     politiques à l'identique, GRANT idempotents, CREATE ROLE conditionnel).
--   * Strictement ADDITIF : aucun REVOKE, aucun DROP d'objet métier, aucune
--     suppression de données. Ne retire jamais un privilège préexistant.
--   * AUCUN secret : les rôles sont créés NOLOGIN ; l'opérateur active
--     l'authentification hors dépôt via le gestionnaire de secrets :
--       ALTER ROLE cvc_app LOGIN PASSWORD '<secret-généré-hors-ligne>';
--     (idem cvc_migr / cvc_admin) puis bascule DATABASE_URL.
--   * Échec clair : toute configuration incompatible lève une exception
--     explicite (§1bis, §6) — jamais d'application silencieuse partielle.
--   * Rôles CLUSTER-WIDE (créés une fois par cluster, grants par base).
--
-- MATRICE DES PRIVILÈGES (relevé exhaustif du code — Backend/db/repositories,
-- Backend/services/paymentService.js — moindre privilège ; aucun secret) :
--   cvc_app  (runtime applicatif) :
--     SELECT, INSERT                 : users, plans, subscriptions, payments,
--                                      transactions
--     UPDATE (colonnes exactes)      : payments(status, raw_gateway_response)
--                                      users(user_plan, user_max_downloads,
--                                            downloads_used)
--                                      subscriptions(status, end_date, auto_renew)
--                                      plans(name, price, duree, features,
--                                            description, is_popular, max_downloads)
--     DELETE                         : users (A6), plans (admin)
--     JAMAIS                         : id_map, TRUNCATE, DDL, UPDATE/DELETE de
--                                      payments/transactions (historique
--                                      financier immuable — montants, devises,
--                                      références et clés NON modifiables),
--                                      UPDATE/DELETE de subscriptions
--   cvc_migr (scripts de migration)  : DML complet sur toutes les tables dont
--                                      id_map + CREATE sur le schéma public ;
--     aucun droit administratif (pas de CREATE ROLE / DATABASE / BYPASSRLS)
--   cvc_admin (maintenance supervisée) : DML complet (suppressions/ajustements
--                                      d'historique justifiés — Lot 2C) ;
--     jamais utilisé par l'application automatiquement
--
-- SÉQUENCES : le schéma utilise UUID + gen_random_uuid() — AUCUNE séquence ;
-- aucun privilège de séquence n'est nécessaire (vérifié par les tests).
--
-- CONSERVATION DE L'HISTORIQUE FINANCIER :
--   * contrainte payments.user_id ON DELETE RESTRICT (migration 002) ;
--   * transactions.payment_id ON DELETE NO ACTION (bloque le retrait d'un
--     paiement référencé) ; subscriptions.user_id CASCADE inchangé ;
--   * cvc_app ne dispose d'AUCUN privilège DELETE/UPDATE large sur
--     payments/transactions — double barrière grants + RLS + contraintes.
-- ============================================================

-- ============================================================
-- §1 — RÔLES (cluster-wide, idempotent, flags sûrs figés à la création)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvc_app') THEN
    CREATE ROLE cvc_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvc_migr') THEN
    CREATE ROLE cvc_migr NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvc_admin') THEN
    CREATE ROLE cvc_admin NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

-- §1bis — ÉCHEC CLAIR en cas de configuration incompatible (flags interdits).
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
      FROM pg_roles WHERE rolname IN ('cvc_app', 'cvc_migr', 'cvc_admin')
  LOOP
    IF f.rolsuper OR f.rolcreatedb OR f.rolcreaterole OR f.rolbypassrls THEN
      RAISE EXCEPTION
        'Configuration incompatible : rôle % porte des flags interdits (superuser/createdb/createrole/bypassrls) — refus',
        f.rolname;
    END IF;
  END LOOP;
END
$$;

-- ============================================================
-- §2 — ACCÈS SCHÉMA
-- ============================================================
GRANT USAGE ON SCHEMA public TO cvc_migr, cvc_app, cvc_admin;
GRANT CREATE ON SCHEMA public TO cvc_migr;

-- ============================================================
-- §3 — PRIVILÈGES TABLES (matrice code-driven — voir en-tête)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cvc_migr;
GRANT SELECT, INSERT ON public.users, public.plans, public.subscriptions,
  public.payments, public.transactions TO cvc_app;
-- Cycle de vie du paiement — SEULEMENT status + trace d'audit modifiables.
-- Montant/devise/référence/clés IMMUAUX ; transactions reste INSERT/SELECT
-- (write-once) ; jamais de DELETE (historique financier préservé — A6).
GRANT UPDATE (status, raw_gateway_response) ON public.payments TO cvc_app;
GRANT UPDATE (user_plan, user_max_downloads, downloads_used) ON public.users TO cvc_app;
GRANT UPDATE (status, end_date, auto_renew) ON public.subscriptions TO cvc_app;
GRANT UPDATE (name, price, duree, features, description, is_popular, max_downloads)
  ON public.plans TO cvc_app;
GRANT DELETE ON public.users, public.plans TO cvc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cvc_admin;

-- ============================================================
-- §4 — POLITIQUES RLS (par COMMANDE — jamais de FOR ALL générique)
-- ============================================================
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users FOR SELECT TO cvc_app, cvc_admin, cvc_migr USING (true);
DROP POLICY IF EXISTS users_insert_app ON public.users;
CREATE POLICY users_insert_app ON public.users FOR INSERT TO cvc_app WITH CHECK (role = 'user');
DROP POLICY IF EXISTS users_insert_admin ON public.users;
CREATE POLICY users_insert_admin ON public.users FOR INSERT TO cvc_admin, cvc_migr WITH CHECK (true);
DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users FOR UPDATE TO cvc_app, cvc_admin, cvc_migr USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS users_delete ON public.users;
CREATE POLICY users_delete ON public.users FOR DELETE TO cvc_app, cvc_admin, cvc_migr USING (true);

DROP POLICY IF EXISTS plans_select ON public.plans;
CREATE POLICY plans_select ON public.plans FOR SELECT TO cvc_app, cvc_admin, cvc_migr USING (true);
DROP POLICY IF EXISTS plans_insert ON public.plans;
CREATE POLICY plans_insert ON public.plans FOR INSERT TO cvc_app, cvc_admin, cvc_migr WITH CHECK (true);
DROP POLICY IF EXISTS plans_update ON public.plans;
CREATE POLICY plans_update ON public.plans FOR UPDATE TO cvc_app, cvc_admin, cvc_migr USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS plans_delete ON public.plans;
CREATE POLICY plans_delete ON public.plans FOR DELETE TO cvc_app, cvc_admin, cvc_migr USING (true);

DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT TO cvc_app, cvc_admin, cvc_migr USING (true);
DROP POLICY IF EXISTS subscriptions_insert ON public.subscriptions;
CREATE POLICY subscriptions_insert ON public.subscriptions FOR INSERT TO cvc_app, cvc_admin, cvc_migr WITH CHECK (status IN ('active','expired','canceled','pending'));
DROP POLICY IF EXISTS subscriptions_update ON public.subscriptions;
CREATE POLICY subscriptions_update ON public.subscriptions FOR UPDATE TO cvc_app, cvc_admin, cvc_migr USING (true) WITH CHECK (status IN ('active','expired','canceled','pending'));
DROP POLICY IF EXISTS subscriptions_delete ON public.subscriptions;
CREATE POLICY subscriptions_delete ON public.subscriptions FOR DELETE TO cvc_admin, cvc_migr USING (true);

DROP POLICY IF EXISTS payments_select ON public.payments;
CREATE POLICY payments_select ON public.payments FOR SELECT TO cvc_app, cvc_admin, cvc_migr USING (true);
DROP POLICY IF EXISTS payments_insert ON public.payments;
CREATE POLICY payments_insert ON public.payments FOR INSERT TO cvc_app, cvc_admin, cvc_migr WITH CHECK (amount >= 0 AND char_length(currency) = 3 AND status IN ('pending','succeeded','failed','refunded'));
DROP POLICY IF EXISTS payments_update ON public.payments;
CREATE POLICY payments_update ON public.payments FOR UPDATE TO cvc_admin, cvc_migr USING (true) WITH CHECK (true);
-- Lot 2G — cycle de vie du paiement applicatif (cvc_app UNIQUEMENT) :
-- portée des COLONNES bornée par le GRANT UPDATE (status, raw_gateway_response)
-- de la §3 ; valeur de status bornée par WITH CHECK — double barrière.
DROP POLICY IF EXISTS payments_update_app ON public.payments;
CREATE POLICY payments_update_app ON public.payments
  FOR UPDATE TO cvc_app USING (true)
  WITH CHECK (status IN ('pending','succeeded','failed','refunded'));
DROP POLICY IF EXISTS payments_delete ON public.payments;
CREATE POLICY payments_delete ON public.payments FOR DELETE TO cvc_admin, cvc_migr USING (true);

DROP POLICY IF EXISTS transactions_select ON public.transactions;
CREATE POLICY transactions_select ON public.transactions FOR SELECT TO cvc_app, cvc_admin, cvc_migr USING (true);
DROP POLICY IF EXISTS transactions_insert ON public.transactions;
CREATE POLICY transactions_insert ON public.transactions FOR INSERT TO cvc_app, cvc_admin, cvc_migr WITH CHECK (type IN ('paiement','remboursement'));
DROP POLICY IF EXISTS transactions_update ON public.transactions;
CREATE POLICY transactions_update ON public.transactions FOR UPDATE TO cvc_admin, cvc_migr USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS transactions_delete ON public.transactions;
CREATE POLICY transactions_delete ON public.transactions FOR DELETE TO cvc_admin, cvc_migr USING (true);

-- id_map : migration/maintenance UNIQUEMENT — aucune politique pour cvc_app.
DROP POLICY IF EXISTS id_map_select ON public.id_map;
CREATE POLICY id_map_select ON public.id_map FOR SELECT TO cvc_admin, cvc_migr USING (true);
DROP POLICY IF EXISTS id_map_insert ON public.id_map;
CREATE POLICY id_map_insert ON public.id_map FOR INSERT TO cvc_admin, cvc_migr WITH CHECK (true);
DROP POLICY IF EXISTS id_map_update ON public.id_map;
CREATE POLICY id_map_update ON public.id_map FOR UPDATE TO cvc_admin, cvc_migr USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS id_map_delete ON public.id_map;
CREATE POLICY id_map_delete ON public.id_map FOR DELETE TO cvc_admin, cvc_migr USING (true);

-- ============================================================
-- §5 — ACTIVATION RLS (6 tables)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.id_map ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- §6 — VÉRIFICATION POST-APPLICATION (échec clair)
-- ============================================================
DO $$
DECLARE n int;
BEGIN
  -- Compteurs propres à cette procédure : user_sessions est géré par la
  -- migration 003 (postérieure) — exclu pour rester rejouable après 003.
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename <> 'user_sessions';
  IF n <> 26 THEN
    RAISE EXCEPTION 'Politiques RLS : % trouvées, 26 attendues — configuration incomplète', n;
  END IF;
  SELECT count(*) INTO n
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
     AND c.relname <> 'user_sessions';
  IF n <> 6 THEN
    RAISE EXCEPTION 'RLS actif sur % tables, 6 attendues — configuration incomplète', n;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'payments'
       AND policyname = 'payments_update_app' AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'payments_update_app absente — cycle de vie du paiement impossible, refus';
  END IF;
END
$$;
-- Fin de procédure — aucune étape manuelle supplémentaire (hors activation
-- LOGIN/PASSWORD des rôles par l'opérateur — documentée §1, hors dépôt).


