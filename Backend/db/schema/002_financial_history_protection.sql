-- ============================================================
-- 002 — Protection SQL de l'historique financier (Lot 2G.4A.2)
-- ============================================================
-- Objectif : empêcher qu'une suppression d'utilisateur efface INDIRECTEMENT
-- des données financières, même en SQL direct par un rôle de maintenance
-- (contournant les protections applicatives A6).
--
-- A. payments.user_id → users.id : ON DELETE CASCADE  ⇒  ON DELETE RESTRICT
--    (la suppression d'un utilisateur possédant des paiements est REFUSÉE par
--    la base, quel que soit le rôle — y compris le propriétaire).
-- B. transactions.payment_id → payments.id : reste ON DELETE NO ACTION
--    (déjà conforme : un paiement référencé par une transaction ne peut pas
--    être supprimé) — vérifié par assertions ci-dessous.
-- C. subscriptions.user_id : CASCADE PRÉSERVÉ (décision documentée : les
--    abonnements sont purgeables avec le compte ; seul l'historique financier
--    est protégé) — vérifié par assertion.
--
-- Sécurité de la migration :
-- - Aucun DROP TABLE, aucune suppression de données, aucun reset de schéma ;
-- - types, colonnes (NOT NULL), index, triggers, privilèges NON concernés
--   préservés (seule la règle ON DELETE de la FK est remplacée) ;
-- - ON UPDATE conservé à NO ACTION (valeur réelle mesurée) ;
-- - IDEMPOTENTE : réappliquable sans effet (état cible détecté ; état inattendu
--   ⇒ EXCEPTION, jamais de bascule silencieuse) ;
-- - transactionnelle (psql -1 recommandé) ;
-- - VERROUS : ALTER TABLE ... DROP/ADD CONSTRAINT prend un verrou ACCESS
--   EXCLUSIVE bref sur `payments` (+ validation sur `users`) — instantané sur
--   un petit volume ; à planifier dans une fenêtre de maintenance sur un gros
--   volume (aucune donnée n'est réécrite).
--
-- Application (mécanisme du projet) :  psql "$URL" -1 -v ON_ERROR_STOP=1 -f 002_financial_history_protection.sql
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_name text;
  v_del  "char";
BEGIN
  -- Localisation par la DÉFINITION réelle (pas par nom supposé) + contrôle du nom.
  SELECT c.conname, c.confdeltype INTO v_name, v_del
    FROM pg_constraint c
   WHERE c.contype = 'f'
     AND c.conrelid = 'public.payments'::regclass
     AND c.confrelid = 'public.users'::regclass
     AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute
                            WHERE attrelid = 'public.payments'::regclass AND attname = 'user_id')]::smallint[];

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'FK payments.user_id → users.id introuvable — migration interrompue';
  END IF;

  IF v_del = 'r' THEN
    RAISE NOTICE 'Déjà en état cible (ON DELETE RESTRICT) — aucune opération (idempotence)';
  ELSIF v_del = 'c' THEN
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', v_name);
    EXECUTE format('ALTER TABLE public.payments ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE NO ACTION', v_name);
    RAISE NOTICE 'FK % remplacée : CASCADE → RESTRICT', v_name;
  ELSE
    RAISE EXCEPTION 'État ON DELETE inattendu (%) pour % — migration interrompue', v_del, v_name;
  END IF;
END $$;

-- Assertions de non-régression (B et C inchangés — états réels attendus).
DO $$
BEGIN
  IF (SELECT confdeltype FROM pg_constraint
       WHERE contype='f' AND conrelid='public.transactions'::regclass
         AND confrelid='public.payments'::regclass) IS DISTINCT FROM 'a' THEN
    RAISE EXCEPTION 'transactions.payment_id n''est plus NO ACTION — état inattendu';
  END IF;
  IF (SELECT confdeltype FROM pg_constraint
       WHERE contype='f' AND conrelid='public.subscriptions'::regclass
         AND confrelid='public.users'::regclass) IS DISTINCT FROM 'c' THEN
    RAISE EXCEPTION 'subscriptions.user_id n''est plus CASCADE — état inattendu';
  END IF;
END $$;

COMMIT;
