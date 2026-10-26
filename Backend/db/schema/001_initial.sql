-- ============================================================
-- CV.CRAFT — Schéma PostgreSQL initial (Phase 5B)
-- Cible : Supabase PostgreSQL (utilisé uniquement comme moteur SQL)
-- Application : `psql -f 001_initial.sql` (idempotence : DDL "IF NOT EXISTS")
--
-- Conventions :
-- - PK UUID (gen_random_uuid) ; legacy_object_id = ObjectId MongoDB d'origine
--   (traçabilité de migration, recherches dual pendant la transition)
-- - updated_at maintenu par trigger (équivalent timestamps Mongoose)
-- - CHECK constraints = anciens enums Mongoose (voir Backend/constants.js)
-- - Aucune donnée n'est créée par ce fichier (DDL uniquement)
-- ============================================================

-- Emails insensibles à la casse (comportement Mongoose lowercase + recherches)
CREATE EXTENSION IF NOT EXISTS citext;

-- Trigger commun : met à jour updated_at à chaque UPDATE
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- USERS (Mongoose: User / collection users)
-- NB : le rôle "premium" legacy n'est PAS conservé (consigne Phase 5B) :
-- le statut Premium se détermine par plans/subscriptions ; user_plan reste
-- un champ de compatibilité avec la logique d'entitlements existante.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id   CHAR(24) UNIQUE,
  name               TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 50),
  email              CITEXT NOT NULL UNIQUE CHECK (char_length(email) <= 254),
  password           TEXT NOT NULL,
  role               TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  user_plan          TEXT NOT NULL DEFAULT 'Free' CHECK (user_plan IN ('Free', 'Basic', 'Premium')),
  user_max_downloads INTEGER NOT NULL DEFAULT 5 CHECK (user_max_downloads >= 0),
  downloads_used     INTEGER NOT NULL DEFAULT 0 CHECK (downloads_used >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PLANS (Mongoose: Plans / collection plans)
-- max_downloads >= 0 (consigne : ne pas imposer >= 2, préserver les valeurs)
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id CHAR(24) UNIQUE,
  name             TEXT NOT NULL UNIQUE CHECK (name IN ('Free', 'Basic', 'Premium')),
  price            NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  duree            INTEGER NOT NULL CHECK (duree >= 0),
  features         TEXT[] NOT NULL DEFAULT '{}',
  description      TEXT NOT NULL,
  is_popular       BOOLEAN NOT NULL DEFAULT false,
  max_downloads    INTEGER NOT NULL CHECK (max_downloads >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS plans_set_updated_at ON plans;
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SUBSCRIPTIONS (Mongoose: Subscription / collection subscriptions)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id CHAR(24) UNIQUE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id          UUID NOT NULL REFERENCES plans(id),
  start_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date         TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'expired', 'canceled', 'pending')),
  auto_renew       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PAYMENTS (Mongoose: Payment / collection payments)
-- transaction_reference UNIQUE = anti double-paiement (comportement Mongoose).
-- La détection de doublons éventuels dans MongoDB est faite par
-- scripts/migrate/validate-mongo.js AVANT import (pas de suppression auto).
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id       CHAR(24) UNIQUE,
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id        UUID NOT NULL REFERENCES subscriptions(id),
  amount                 NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency               TEXT NOT NULL DEFAULT 'XOF' CHECK (char_length(currency) = 3),
  method                 TEXT NOT NULL
                           CHECK (method IN ('orange_money', 'moov_money', 'mtn_money', 'wave', 'card', 'paypal')),
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  transaction_reference  TEXT NOT NULL UNIQUE,
  payment_date           TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_gateway_response   JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS payments_set_updated_at ON payments;
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRANSACTIONS (Mongoose: Transaction / collection transactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id CHAR(24) UNIQUE,
  payment_id       UUID NOT NULL REFERENCES payments(id),
  type             TEXT NOT NULL CHECK (type IN ('paiement', 'remboursement')),
  amount           NUMERIC(12,2) NOT NULL,
  description      TEXT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS transactions_set_updated_at ON transactions;
CREATE TRIGGER transactions_set_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ID_MAP — traçabilité de migration uniquement (jamais exposée à l'API)
-- ============================================================
CREATE TABLE IF NOT EXISTS id_map (
  object_id  CHAR(24) NOT NULL,
  table_name TEXT NOT NULL,
  uuid       UUID NOT NULL,
  PRIMARY KEY (table_name, object_id),
  UNIQUE (table_name, uuid)
);

-- ============================================================
-- INDEX (justifiés par les requêtes réelles — audit Phase 5 §7)
-- users.email / users.legacy_object_id : couverts par UNIQUE
-- payments.transaction_reference : couvert par UNIQUE
-- ============================================================
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx   ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx   ON subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx    ON subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_end_date_idx  ON subscriptions (end_date);

CREATE INDEX IF NOT EXISTS payments_user_id_idx         ON payments (user_id);
CREATE INDEX IF NOT EXISTS payments_subscription_id_idx ON payments (subscription_id);

CREATE INDEX IF NOT EXISTS transactions_payment_id_idx       ON transactions (payment_id);
CREATE INDEX IF NOT EXISTS transactions_transaction_date_idx ON transactions (transaction_date);