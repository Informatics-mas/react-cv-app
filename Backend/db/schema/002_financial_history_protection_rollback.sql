-- ============================================================
-- 002 (ROLLBACK) — Retour à ON DELETE CASCADE sur payments.user_id
--                    (Lot 2G.4A.2)
-- ============================================================
-- ⚠️⚠️ AVERTISSEMENT DE SÉCURITÉ ⚠️⚠️
-- Ce rollback RESTAURE UNE POLITIQUE MOINS SÛRE : avec ON DELETE CASCADE,
-- la suppression d'un utilisateur possédant des paiements SUPPRIME SILENCIEUSEMENT
-- son historique financier en SQL direct (contournant le garde applicatif A6).
-- Il ne doit être exécuté que :
--   - sur une base JETABLE de test (validation de la procédure) ;
--   - sur décision explicite et tracée si un incident l'exige en production.
-- Il ne supprime AUCUNE donnée par lui-même (seule la règle de contrainte
-- est restaurée) — mais il réactive le risque de suppression en cascade.
--
-- Application : psql "$URL" -1 -v ON_ERROR_STOP=1 -f 002_financial_history_protection_rollback.sql
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_name text;
  v_del  "char";
BEGIN
  SELECT c.conname, c.confdeltype INTO v_name, v_del
    FROM pg_constraint c
   WHERE c.contype = 'f'
     AND c.conrelid = 'public.payments'::regclass
     AND c.confrelid = 'public.users'::regclass
     AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute
                            WHERE attrelid = 'public.payments'::regclass AND attname = 'user_id')]::smallint[];

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'FK payments.user_id → users.id introuvable — rollback interrompu';
  END IF;

  IF v_del = 'c' THEN
    RAISE NOTICE 'Déjà en état d''origine (ON DELETE CASCADE) — aucune opération (idempotence)';
  ELSIF v_del = 'r' THEN
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', v_name);
    EXECUTE format('ALTER TABLE public.payments ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE NO ACTION', v_name);
    RAISE NOTICE 'FK % restaurée : RESTRICT → CASCADE (politique moins sûre — voir avertissement)', v_name;
  ELSE
    RAISE EXCEPTION 'État ON DELETE inattendu (%) pour % — rollback interrompu', v_del, v_name;
  END IF;
END $$;

COMMIT;
