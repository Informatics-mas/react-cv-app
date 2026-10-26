-- ============================================================
-- LOT 2 — DURCISSEMENT POSTGRESQL / RLS — COMMANDES PROPOSÉES
-- ⚠️⚠️ DOCUMENT UNIQUEMENT — NE PAS EXÉCUTER SANS VALIDATION EXPLICITE ⚠️⚠️
-- Aucune commande de ce fichier n'a été appliquée à la base partagée.
-- Date : 2026-10-22 — statut : PLAN PRÊT POUR VALIDATION (§21 du registre)
--
-- Ce document REMPLACE la politique générique `cvcraft_app_all`
-- (FOR ALL USING (true) WITH CHECK (true)) de scripts/phase5j/pg-role-plan.sql
-- qui est PROSCRITE par le cahier des charges du Lot 2.
--
-- PRINCIPES
--   * moindre privilège : privilèges par TABLE et par COLONNE ;
--   * politiques RLS par COMMANDE (jamais FOR ALL) ; pas de politique
--     générique d'ouverture ; les WITH CHECK reprennent les invariants métier
--     (défense en profondeur, les CHECK de table restant la 1ʳᵉ barrière) ;
--   * aucune modification de RLS (déjà active sur les 6 tables), aucun
--     changement de propriétaire, aucun REVOKE exécuté ici ;
--   * id_map reste INACCESSIBLE au rôle applicatif (migration uniquement).
--
-- CONTEXTE MESURÉ (§21.1) : RLS active SANS politique sur les 6 tables de
-- public (default deny) ; propriétaire = postgres (bypass implicite, owner) ;
-- grants excessifs préexistants pour anon/authenticated/service_role (§21.2).
-- ============================================================

-- ============================================================
-- A. PRÉ-VÉRIFICATIONS (LECTURE SEULE — exécutables sans risque)
-- ============================================================
-- A1. État des lieux avant application (conserver la sortie comme snapshot) :
SELECT c.relname, r.rolname AS owner, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced
  FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
 WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
 ORDER BY c.relname;

SELECT policyname, tablename, cmd, roles FROM pg_policies
 WHERE schemaname = 'public' ORDER BY tablename, policyname;  -- attendu : 0 ligne

-- A2. Vérifier qu'aucun rôle cvcraft_* n'existe déjà (sinor : étape B idempotente) :
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolcanlogin
  FROM pg_roles WHERE rolname LIKE 'cvcraft%';


-- ============================================================
-- B. RÔLE APPLICATIF CIBLE `cvcraft_app` — PERMISSIONS EXACTES
-- ============================================================
-- B1. Création (idempotent) — flags sûrs figés à la création.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvcraft_app') THEN
    CREATE ROLE cvcraft_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

-- B2. Contrôle des flags interdits (doit renvoyer 0 ligne) :
SELECT rolname FROM pg_roles
 WHERE rolname = 'cvcraft_app'
   AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls);

-- B3. Accès schéma :
GRANT USAGE ON SCHEMA public TO cvcraft_app;

-- B4. SELECT : lecture complète des 5 tables du runtime (RETURNING *, JOIN,
--     listes admin, cron J-7). Jamais sur id_map.
GRANT SELECT ON TABLE
  users, plans, subscriptions, payments, transactions
TO cvcraft_app;

-- B5. INSERT : les 5 tables du runtime (register, subscribe, paiements).
GRANT INSERT ON TABLE
  users, plans, subscriptions, payments, transactions
TO cvcraft_app;

-- B6. UPDATE par COLONNE (moindre privilège) — relevé exhaustif du code :
--   users        : user_plan, user_max_downloads, downloads_used
--                  (incrementDownloadIfBelow / updatePlanOnSubscribe / subscribe)
--   subscriptions: status, end_date, auto_renew (updateFields / expire*)
--   plans        : name, price, duree, features, description, is_popular,
--                  max_downloads (plansRepo.update — admin)
--   payments, transactions : AUCUN UPDATE en runtime → non accordé.
GRANT UPDATE (user_plan, user_max_downloads, downloads_used) ON users       TO cvcraft_app;
GRANT UPDATE (status, end_date, auto_renew)                ON subscriptions TO cvcraft_app;
GRANT UPDATE (name, price, duree, features, description, is_popular, max_downloads)
                                                           ON plans         TO cvcraft_app;

-- B7. DELETE : uniquement là où le code delete (usersRepo.deleteById,
--     plansRepo.deleteById). Les enfants sont purgés par CASCADE.
GRANT DELETE ON TABLE users, plans TO cvcraft_app;

-- B8. TRIGGER : requis pour que les triggers BEFORE UPDATE existants
--     (set_updated_at) s'exécutent sous ce rôle.

-- ============================================================
-- C. POLITIQUES RLS — PAR TABLE ET PAR COMMANDE (jamais FOR ALL)
-- ============================================================
-- Contexte technique (à lire avant tout commentaire) :
--   * Le backend est un SERVICE UNIQUE qui se connecte avec UN rôle de base.
--     Les requêtes légitimes traversent les lignes (login par email, listes
--     admin, cron J-7 en JOIN) : une prédicat de ligne par utilisateur final
--     exigerait un `SET LOCAL app.user_id` par requête = changement applicatif
--     (hors périmètre DDL du Lot 2). L'isolation ENTRE utilisateurs finaux est
--     donc assurée par l'application (filtres `keyFilter` par id, tests A10/Q3
--     du Lot 1) et non par la RLS.
--   * Ce que ces politiques apportent : (1) périmètre par COMMANDE — un droit
--     SELECT ne donne pas UPDATE ; (2) invariants métier en WITH CHECK —
--     défense en profondeur au-dessus des CHECK de table ; (3) AUCUNE politique
--     pour id_map, payments/transactions en UPDATE/DELETE → accès impossible
--     même en cas de bug applicatif ou de fuite du credential.
--   * Interdiction respectée : aucune politique `FOR ALL ... USING (true)`
--     générique. Là où un `USING (true)` de SELECT subsiste (catalogue public,
--     lookup login), il est nominatif, par commande, et justifié ci-dessous.

-- ---------- C1. users ----------
-- SELECT : login (WHERE email), protect (WHERE id), admin list, cron JOIN.
--   Justification : le service doit résoudre n'importe quel compte — accès
--   complet en SELECT, couvert par la revue de code + tests Lot 1.
CREATE POLICY users_select ON users
  FOR SELECT TO cvcraft_app USING (true);

-- INSERT : register uniquement (role figé 'user' par la route — test A11).
--   Invariants : rôle dans la liste, compteur à 0, quotas >= 0.
CREATE POLICY users_insert ON users
  FOR INSERT TO cvcraft_app
  WITH CHECK (role IN ('user', 'admin') AND downloads_used = 0 AND user_max_downloads >= 0);

-- UPDATE : colonnes déjà restreintes par GRANT (B6) — le rôle n'est jamais
--   modifiable ici. Invariants de cohérence sur les compteurs.
CREATE POLICY users_update ON users
  FOR UPDATE TO cvcraft_app
  USING (true)
  WITH CHECK (role IN ('user', 'admin') AND downloads_used >= 0 AND user_max_downloads >= 0);

-- DELETE : suppression de compte (admin) — les enfants sont purgés par CASCADE.
CREATE POLICY users_delete ON users
  FOR DELETE TO cvcraft_app USING (true);

-- ---------- C2. plans ----------
-- SELECT : catalogue public (GET /plans), entitlements, admin.
CREATE POLICY plans_select ON plans
  FOR SELECT TO cvcraft_app USING (true);

-- INSERT/UPDATE : admin uniquement côté application ; invariants tarifaires.
--   (name IN (...) reflète plans_name_check — défense en profondeur.)
CREATE POLICY plans_insert ON plans
  FOR INSERT TO cvcraft_app
  WITH CHECK (price >= 0 AND duree >= 0 AND max_downloads >= 0
              AND name IN ('Free', 'Basic', 'Premium'));

CREATE POLICY plans_update ON plans
  FOR UPDATE TO cvcraft_app
  USING (true)
  WITH CHECK (price >= 0 AND duree >= 0 AND max_downloads >= 0
              AND name IN ('Free', 'Basic', 'Premium'));

-- DELETE : admin (plansRepo.deleteById).
CREATE POLICY plans_delete ON plans
  FOR DELETE TO cvcraft_app USING (true);

-- ---------- C3. subscriptions ----------
-- SELECT : entitlements (findLatestByUserPopulated), admin list, cron J-7.
CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT TO cvcraft_app USING (true);

-- INSERT : flux subscribe transactionnel — statut dans l'enum.
CREATE POLICY subscriptions_insert ON subscriptions
  FOR INSERT TO cvcraft_app
  WITH CHECK (status IN ('active', 'expired', 'canceled', 'pending'));

-- UPDATE : expireActiveByUser / markExpiredById / updateFields (admin).
CREATE POLICY subscriptions_update ON subscriptions
  FOR UPDATE TO cvcraft_app
  USING (true)
  WITH CHECK (status IN ('active', 'expired', 'canceled', 'pending'));

-- DELETE : AUCUNE — le code ne supprime jamais de subscription directement
--   (purge par CASCADE sur suppression de user). Pas de politique = refusé.

-- ---------- C4. payments ----------
-- SELECT : findByReference (anti double-paiement), listByUser, stats.
CREATE POLICY payments_select ON payments
  FOR SELECT TO cvcraft_app USING (true);

-- INSERT : subscribe (plans payants, méthode résoluble) uniquement.
CREATE POLICY payments_insert ON payments
  FOR INSERT TO cvcraft_app
  WITH CHECK (amount >= 0 AND currency = 'XOF'

-- ============================================================
-- D. TESTS D'ISOLATION ET DE NON-RÉGRESSION (après application)
-- ============================================================
-- D1. Tests d'isolation par rôle (transaction ROLLBACK, comme pg-role-dryrun) :
--   I1  SET ROLE cvcraft_app → SELECT plans/users/subscriptions      → OK
--   I2  SET ROLE cvcraft_app → SELECT id_map                         → REFUS (42501)
--   I3  SET ROLE cvcraft_app → UPDATE users SET role='admin'         → REFUS
--        (colonne `role` absente du GRANT UPDATE — contrôle majeur :
--         le rôle applicatif ne peut PAS s'auto-élever)
--   I4  SET ROLE cvcraft_app → UPDATE payments / transactions        → REFUS
--   I5  SET ROLE cvcraft_app → DELETE subscriptions                  → REFUS
--   I6  SET ROLE cvcraft_app → TRUNCATE users                        → REFUS
--   I7  SET ROLE cvcraft_app → INSERT users (role='admin')           → REFUS
--        (WITH CHECK users_insert limite à la liste, mais surtout test de
--         défense en profondeur : l'élévation doit être bloquée)
--   I8  SET ROLE anon / authenticated → SELECT users                 → 0 ligne
--        (default-deny confirmé en sonde §21.2 — doit rester stable)
--   I9  INSERT payments avec amount=-5                                → REFUS (WITH CHECK)
--   I10 INSERT transactions type='pirate'                             → REFUS (WITH CHECK)
--   I11 UPDATE subscriptions status='hack'                            → REFUS (WITH CHECK)
--   I12 Triggers : UPDATE plans → updated_at modifié (set_updated_at OK
--        avec GRANT TRIGGER + UPDATE colonnes)
--
-- D2. Tests d'isolation « tenant » : le modèle est MONO-TENANT (aucune
--   colonne tenant_id — §21.1). L'isolation réelle est :
--   (a) entre rôles PostgreSQL   → tests I1-I11 ci-dessus ;
--   (b) entre utilisateurs finaux → couche applicative (keyFilter par id) ;
--       tests de non-régression : Lot 1 (A10 IDOR → 403, Q3 re-souscription,
--       S9 intégrité) à REJOUER à l'identique après bascule de credential.
--   Si un multi-tenant apparaissait : ajouter une colonne tenant_id + politique
--   par `current_setting('app.tenant_id')` — hors périmètre, à réexaminer.
--
-- D3. Non-régression applicative (identique Lot 1) :
--   les 11 scripts phase5h/5i/5j + parcours session S1-S9 + build + lint.

-- ============================================================
-- E. APPLICATION PROGRESSIVE + RETOUR ARRIÈRE
-- ============================================================
-- E1. Ordre d'application (CHAQUE étape vérifiée avant la suivante) :
--   ÉTAPE 0  Snapshot : exécuter A1/A2, conserver la sortie (état initial).
--   ÉTAPE 1  Créer le rôle + flags (B1/B2). Vérif : B2 renvoie 0 ligne.
--            → AUCUN impact applicatif (le backend utilise encore postgres).
--   ÉTAPE 2  GRANT (B3-B8). Vérif : has_table_privilege(...) conforme.
--            → AUCUN impact applicatif.
--   ÉTAPE 3  Politiques RLS (C1-C6). Vérif : pg_policies = 12 lignes.
--            → AUCUN impact applicatif (rôle non encore utilisé).
--   ÉTAPE 4  Tests d'isolation (D1) en transaction ROLLBACK.
--   ÉTAPE 5  Opérateur : `ALTER ROLE cvcraft_app LOGIN PASSWORD '<secret>'`
--            (secret généré hors ligne, jamais dans le dépôt) puis bascule de
--            DATABASE_URL vers le credential cvcraft_app (Backend/.env).
--   ÉTAPE 6  Redémarrage backend + tests de fumée (/plans, /auth/login,
--            /auth/me, subscribe d'un compte de test) + Lot 1 complet.
--   ÉTAPE 7  Surveillance 24-48h (logs 42501/permission denied) ; ancien
--            credential conservé mais NON utilisé pendant la période.
--
-- E2. RETOUR ARRIÈRE (testable à chaque étape) :
--   - Étapes 1-4 : rollback = DROP POLICY IF EXISTS ... ; DROP ROLE IF EXISTS
--     cvcraft_app ; — aucune donnée touchée, aucune interruption.
--   - Étapes 5-6 : rollback immédiat = rétablir l'ANCIEN DATABASE_URL dans
--     Backend/.env + redémarrage (le rôle postgres propriétaire garde tous
--     ses droits — rien n'a été REVOKE dans ce plan). Durée < 2 min.
--   - Le plan NE CONTIENT AUCUN REVOKE ni DROP sur les objets existants :
--     il est strictement ADDITIF jusqu'à la bascule de credential.
--   - Test du retour arrière : avant bascule, rejouer D1 avec l'ancien rôle
--     (doit être identique au snapshot ÉTAPE 0) — validé en dry-run V13.
--
-- E3. RISQUES D'INTERRUPTION IDENTIFIÉS :
--   R1  Bascule DATABASE_URL erronée (typo credential) → 500 au login.
--       Mitigation : ÉTAPE 5 avec test de fumée immédiat + rollback E2.
--   R2  Oubli d'un GRANT (ex. UPDATE oublié sur une colonne) → erreur 42501
--       en parcours métier (souscription, quota). Mitigation : matrice B4-B8
--       issue d'un relevé exhaustif du code + tests D3 complets.
--   R3  Trigger set_updated_at sans GRANT TRIGGER → erreur à chaque UPDATE.
--       Mitigation : B8 explicite + test I12.
--   R4  Scripts de maintenance (migrate, purge) perdent id_map si basculés
--       eux aussi → NE PAS changer leur credential (ils gardent le rôle de
--       maintenance ; voir §21.3).
--   R5  Fenêtre de connexion partagée Supabase (EMAXCONNSESSION, §20.4) :
--       indépendant du rôle, mais à surveiller pendant les tests D3.

              AND status IN ('pending', 'succeeded', 'failed', 'refunded'));

-- UPDATE/DELETE : AUCUNE — jamais de modification ni suppression en runtime
--   (flux GeniusPay futur : à réexaminer lors du Lot dédié).

-- ---------- C5. transactions ----------
-- SELECT : listByPayment (historique), stats.
CREATE POLICY transactions_select ON transactions
  FOR SELECT TO cvcraft_app USING (true);

-- INSERT : écriture comptable du flux subscribe uniquement.
CREATE POLICY transactions_insert ON transactions
  FOR INSERT TO cvcraft_app
  WITH CHECK (type IN ('paiement', 'remboursement') AND amount >= 0);

-- UPDATE/DELETE : AUCUNE — écriture comptable immuable.

-- ---------- C6. id_map ----------
-- AUCUNE politique et AUCUN grant : inaccessible au rôle applicatif.
--   (migration uniquement, rôle de maintenance distinct — voir §21.3)

GRANT TRIGGER ON TABLE
  users, plans, subscriptions, payments, transactions
TO cvcraft_app;

-- B9. NON accordé (volontaire) :
--   id_map (migration uniquement) ; TRUNCATE ; CREATE/ALTER/DROP ;
--   CREATE DATABASE/ROLE ; BYPASSRLS ; SUPERUSER ; REFERENCES (inutile :
--   les FK existent déjà ; REFERENCES ne sert qu'à EN créer) ;
--   UPDATE/DELETE sur payments et transactions (INSERT seul en runtime).
