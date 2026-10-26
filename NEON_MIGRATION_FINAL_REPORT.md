# FINALISATION MIGRATION SUPABASE → NEON — RAPPORT FINAL D'EXÉCUTION

**Date :** 22/10/2026 · **Branche :** `refonte/nextjs` · Exécution réelle (connexions Neon), aucun secret affiché.

---

## 1. Branche Neon réellement utilisée

| Rôle | Cible | Identification |
|---|---|---|
| **PRODUCTION (reconstruite)** | branche `production` (id `br-quiet-base-b97uio6b`), endpoint `ep-wispy-dawn-b9nx88qu-pooler.c-7.eu-central-1.aws.neon.tech`, base `neondb` | variable `NEON_PROD_URL` ajoutée par l'utilisateur (Phase 1 : endpoint **absent du dépôt**, question ciblée posée) |
| TEST (contrôle croisé) | branche `migration-test`, `ep-ancient-glitter-b98wmcx7-pooler`, base `cvc_n2_final` (`NEON_MIGR_URL`) | vérifiée live (7 tables, 31 RLS, 26 index, 3 plans) |
| Supabase | `aws-0-eu-west-1.pooler.supabase.com` | **abandonné** (DATABASE_URL basculée) — **jamais contacté** |

⚠️ **Point SSL corrigé à la bascule** : `NEON_PROD_URL` contenait `sslmode` (mapping pg → TLS **sans validation**) ; `DATABASE_URL` a été définie **sans paramètres** → `PGSSL=require` = **validation stricte** (`rejectUnauthorized: true`, ISRG Root X1) — confirmée par `PING_POOL_OK=1`.

## 2. Migrations exécutées et résultats (production)

Ordre officiel `001 → 002 → grants → 003` (script `pg`, 0 meta-commande psql) :

| Étape | Résultat |
|---|---|
| `001_initial.sql` | **OK** |
| `002_financial_history_protection.sql` | **OK** (payments.user_id → **RESTRICT**) |
| `grants/001_grants_rls.sql` | **OK** (31 politiques) |
| `003_user_sessions.sql` | **OK** (registre JWT `jti`) |
| État préalable | base **vide** (0 table, 0 RLS) — conforme à la confirmation |

## 3. Schéma obtenu (identique à la branche de test)

**7 tables** (`id_map, payments, plans, subscriptions, transactions, user_sessions, users`) · **31 politiques RLS** (7 tables) · **26 index** · triggers `*_set_updated_at` · **6 FK** : subscriptions→users (**CASCADE**), subscriptions→plans, payments→subscriptions, **payments→users (RESTRICT)**, transactions→payments, user_sessions→users (CASCADE). **Aucun écart** avec la cible de test.

## 4. Initialisation des plans et de l'administrateur

- **Plans : 3/3 créés** (source `plans.json`, upsert idempotent) : **Free** 0/365j/5 · **Basic** 9.99/30j/20 (populaire) · **Premium** 19.99/30j/100 — vérifiés en base (`PLANS=3`).

## 5. Configuration effective de l'application (sans secrets)

| Variable | État |
|---|---|
| `DATABASE_URL` | **basculée** → `ep-wispy-dawn-b9nx88qu-pooler` (base `neondb`), **sans paramètre `sslmode`** |
| `PGSSL` | `require` → **validation TLS stricte préservée** (ping confirmé) |
| `NEON_PROD_URL` / `NEON_MIGR_URL` | conservées (traçabilité prod / branche de test) |
| `JWT_SECRET` | **inchangé** (aucun secret modifié) |
| Résidus `.env` | `MONGO_URI` (inutilisé) — à retirer au nettoyage · `DATABASE_DRIVER=postgres` (cohérent) |

**Consommateurs vérifiés** : `pool.js` = seul consommateur actif de `DATABASE_URL` ; `NEON_MIGR_URL` = 0 consommateur code.

## 6. Tests réellement exécutés et résultats

| Test | Résultat |
|---|---|
| Vérification branche de test (SELECT-only) | 7 tables / 31 RLS / 26 index / 6 FK / 3 plans = **conforme** |
| Migrations production | **4/4 OK** |
| Post-vérification production | 7 tables, 31 RLS, 26 index, 6 FK = **conforme** |
| Pool applicatif (`PGSSL=require`) | **`PING_POOL_OK=1`**, `PLANS=3` |
| Tests unitaires (5 suites) | **36/36 VERTS** (garde-fou paiement, `SUB-`, ACK, indépendance fournisseur, politique) |
| Smoke serveur (bref, sans écriture) | `GET /api/plans` → **200** (servi depuis la prod) · `/api/users` & `/subscribe` sans token → **401** · log : « **PostgreSQL (Neon) connecté avec succès ✅** », arrêt propre |
| Paiements (Phase 6) | comportement **inchangé et validé** : mock = tests navigateur (ACK requise, **jamais en production**), aucun paiement réel en mock, **GeniusPay = non intégré** (exception, aucun fallback) |

**Non exécutés (limites)** : T12/T13/T16/T18 (intégration, base dédiée) · RLS sous rôle applicatif (`SET ROLE cvc_app` — toujours bloqué `set_option=false`, résidu N2-E8) · parcours navigateur complets (login admin — en attente du compte).

## 7. Références Supabase

| Référence | État |
|---|---|
| `DATABASE_URL` Supabase | **supprimée de la configuration** (basculée) |
| `paymentProviders/index.js:49` | commentaire de traçabilité Lot 4 (inerte) — **conservé à dessein** |
| `scripts/phase5j/*` (20 scripts), `scripts/phase5h/env-check.js` | outils historiques (cibles en dur) — **aucune dépendance active** · **restant à traiter** (purge/archivage) — non supprimés (prudence) |
| SDK / variables `SUPABASE_*` | **aucun** (zéro dépendance Auth/Storage/API) · frontend : **aucune référence** |

## 8. Blocages et points restants

1. **Administrateur : créé et validé** (login 200, rôle admin, routes admin actives) — plus aucune action utilisateur requise.
2. Tests d'intégration (T12/T13/T16/T18) et RLS applicative : sur base dédiée / rôle applicatif.
3. Nettoyage optionnel : `MONGO_URI`, scripts `phase5j/h`, `.env.example` (`DATABASE_URL`/`PGSSL`/`PAYMENT_MOCK_ACK`).
4. GeniusPay : à implémenter (client/signatures/webhooks) — aucun paiement réel en l'état (voulu).

---

## ✅ MIGRATION SUPABASE → NEON FINALISÉE (schéma + plans + connexion applicative)

**Faits** : production reconstruite (4 migrations OK), 3 plans créés, `DATABASE_URL` basculée avec **validation TLS stricte**, pool applicatif connecté, **36/36 tests verts**, smoke serveur OK, **zéro dépendance Supabase active**. **Réserve unique** : administrateur à créer via le script fourni (identifiants non fournis).

**→ ARRÊT après rapport — aucun déploiement effectué.**
- **Administrateur : ✅ CRÉÉ** sur la production (id `95e26a97-…`, `role=admin`) via `scripts/neon/init-admin.mjs` (identifiants fournis par l'utilisateur via `ADMIN_EMAIL`/`ADMIN_PASSWORD` — jamais affichés) : anti-double-admin respecté (refus si ≥1 admin), hash **bcrypt** `genSalt(10)`. **Smoke auth de bout en bout** : `POST /auth/login` → **200** + **cookie httpOnly posé** · `GET /auth/me` → **200, ROLE=admin** · `GET /users` (adminOnly) → **200** · `POST /plans` invalide → **400** (validation active) · sans auth → **401**.
- Gestion des plans par l'admin = garantie par le code existant : `PlanRoutes` `POST/PUT/DELETE` en **`protect, adminOnly`** + UI `AdminPlans` (validée en L4).