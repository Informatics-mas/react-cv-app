# AUDIT DE MIGRATION SUPABASE → NEON (LECTURE SEULE)

**Date :** 22/10/2026 · **Branche :** `refonte/nextjs` · **Aucune migration exécutée, aucune variable modifiée, aucune base contactée.**

---

## 1. Étape 1 — Inventaire (variables par NOMS uniquement)

### Variables présentes dans `Backend/.env` (noms relevés, valeurs non lues)

`CLIENT_URL`, `DATABASE_DRIVER`, **`DATABASE_URL`**, `EMAIL_HOST`, `EMAIL_PASS`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `FRONTEND_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, **`MONGO_URI`**, **`NEON_MIGR_URL`**, **`PGSSL`**, `PORT`.

Variables client Supabase (`NEXT_PUBLIC_SUPABASE*`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE*`) : **0 occurrence** dans le code et `.env.example` — **aucune dépendance Supabase Auth / Storage / API** (confirmé par ailleurs : `Backend/package.json` ne déclare que `pg` — **aucun SDK `@supabase/*`**).

### Usages (code, scripts, config)

| Variable | Consommateurs | Rôle |
|---|---|---|
| `DATABASE_URL` | `Backend/db/pool.js:15,25` (+ fail-fast), `Backend/services/paymentProviders/index.js:48` (**regex `/supabase/i`**), scripts | **seule connexion PostgreSQL du runtime** — cible actuelle : **pooler Supabase** (`aws-0-eu-west-1.pooler.supabase.com:5432`, Phase 2) |
| `DATABASE_DRIVER` | `pool.js:13,15`, `paymentProviders/index.js` | forcé `postgres` |
| `PGSSL` | `pool.js:50` | `require` → `ssl: { rejectUnauthorized: true }` **sans `ca`** |
| `NEON_MIGR_URL` | **0 consommateur actuel** (`scripts/` = migration nettoyée : ne reste que `scripts/migrate/data/`) | orpheline aujourd'hui — prévue pour la migration de données Neon |
| `MONGO_URI` | **0 consommateur** (code mongoose supprimé en N2) | **résidu** à retirer lors du nettoyage |
| `JWT_SECRET` | backend (middleware `jose` + auth) | indépendant du fournisseur |

**Variable utilisée par `Backend/db/pool.js` : `DATABASE_URL` (+ `DATABASE_DRIVER`, `PGSSL`).** `NEON_MIGR_URL` **n'est pas consommable par le code actuel** : elle n'est lue par aucun module du runtime ni script subsistant — c'est une variable d'exploitation (migration) à câbler explicitement lors de la transition.

### Connexion PostgreSQL vs dépendances Supabase
- **Connexion PostgreSQL** : `DATABASE_URL` (pooler Supabase actuellement) via `pg` — pur protocole PostgreSQL, **aucune API Supabase**.

## 2. Étape 2 — État de la cible Neon (statique, sans réseau)

**Configuration attendue par le pool** (`pool.js`) : une `DATABASE_URL` au format `postgres://user:pass@host:port/db` (+ `PGSSL=require` pour la validation stricte) — **aucun code spécifique fournisseur**.

**Compatibilité de format Neon** : les URLs Neon (`postgres://…@ep-…[-pooler].<region>.aws.neon.tech:5432/<db>`) sont **compatibles nativement** avec `pg` (le pool ne lit ni `sslrootcert` ni module fournisseur). Points d'attention vérifiés :
- **TLS** : la doc Neon (citée dans `BACKEND_POSTGRES_TLS_AUDIT.md` §6) : racine **publique ISRG Root X1 (Let's Encrypt)** → la validation stricte actuelle (`rejectUnauthorized: true`, magasin système) est **théoriquement compatible sans `ca` ajouté**, à confirmer par un test réseau ultérieur (Phase 2 Étape 3 — non exécuté).
- **Conflit URL ↔ `ssl`** : ne **jamais** ajouter `?sslmode=require` à l'URL Neon — doc node-postgres : `sslmode` **écrase** l'objet `ssl` et perd la validation (pg mappe `sslmode=require` → `rejectUnauthorized: false`). Options sûres : URL **sans paramètre TLS** + `PGSSL=require` (config actuelle), ou `sslmode=verify-full` dans l'URL (validation stricte via URL).
- **Pooler** : le `-pooler` Neon (serverless) est compatible `min: 2`/`max: 8`/`keepAlive` du pool (commentaire `pool.js:37-39`, Session Pooler).
- Aucune validation de certificat désactivée dans cette audit.

## 3. Étape 3 — Risques, dépendances et prérequis

### Fonctionnalités à risque si les variables Supabase sont retirées/modifiées

| Élément | Risque | Détail |
|---|---|---|
| **`paymentProviders/index.js:48`** — `if (/supabase/i.test(env.DATABASE_URL))` | **ÉLEVÉ — à réévaluer AVANT bascule** | Ce garde-fou **refuse les paiements mock si `DATABASE_URL` contient « supabase »** (signal de production). Avec une URL **Neon**, le motif ne se déclenche **plus** → le mock pourrait redevenir actif sur une base Neon de production. Le reste du fail-closed (`NODE_ENV`/`APP_ENV` + signal positif obligatoire, l.45-56) reste, mais **la sémantique du blocker Supabase doit être redéfinie** (ex. : exiger un signal dev/test quel que soit l'hôte, ou étendre le motif à tout hôte non-local) |
| `DATABASE_URL` (Supabase → Neon) | Moyen | Toute la connexion bascule : sessions, RLS, quotas, JWT — **à valider intégralement** après bascule |
| `NEON_MIGR_URL` | Faible | Orpheline actuellement ; à consommer par la migration de données puis retirée |
| `MONGO_URI` | Nul (code) | Résidu — 0 consommateur ; retrait sans impact |
| Frontend / `NEXT_PUBLIC_*` | Nul | 0 variable Supabase côté client |
| `JWT_SECRET` | Indépendant | Fonctionne avec Neon tel quel (rotation déjà validée côté `neondb_owner`, N2-E10A) |

### Données et schéma sur Neon — **preuves locales uniquement**

- **21 rapports `MIGRATION_NEON*.md`** présents (historique complet des phases N0→N2) + `scripts/migrate/data/` **complet** : `plans.json`, `users.json`, `subscriptions.json`, `payments.json`, `transactions.json`, `id_map.json`, `manifest.json`, `SHA256SUMS.txt`, `transform-report.json`, `load.sql`.
- Ces éléments attestent qu'un **pipeline de migration a été exécuté en environnement de TEST** (base `cvc_n2_final`, branche Neon `migration-test` — voir rapports), avec schéma (7 tables, politiques RLS, triggers) et données seedées.
- ⚠️ **Non prouvé par cette audit** : que Neon soit **opérationnel pour la production** (disponibilité, données à jour, performances) — **aucune connexion effectuée**. La migration des données de production **n'est pas faite**.

### Plan de transition ordonné (proposé — **non exécuté**)

1. **Départager H2/H3** (Phase 2 Étape 3 — `openssl` sur le pair actuel) : comprendre si l'échec TLS vient d'un MITM ou de la chaîne Supabase — condition pour sécuriser tout autre bascule.
2. **Provisionner la cible Neon** (projet/branche de production) et y appliquer le schéma (`scripts/migrate` : `load.sql` + `manifest.json`).
3. **Migrer les données** via le pipeline existant (`data/*.json`, checksums `SHA256SUMS.txt`) — en environnement de validation d'abord.
4. **Réévaluer le garde-fou `paymentProviders`** (Étape 3 ci-dessus) **AVANT** toute bascule de `DATABASE_URL`.
5. **Basculer `DATABASE_URL`** vers l'URL Neon **sans paramètre TLS**, conserver `PGSSL=require` (validation stricte, ISRG Root X1) — vérifier avec le test `openssl`/démarrage que la chaîne est acceptée.
6. **Valider le runtime** : démarrage fail-fast, `/auth/me`, quotas, RLS, paiement mock/sandbox, admin.
7. **Nettoyer** : `MONGO_URI`, `NEON_MIGR_URL` (après usage), commentaires Supabase/Supavisor restants.

**→ AUDIT TERMINÉ. ARRÊT OBLIGATOIRE — aucun changement (variable, URL, code, données) sans autorisation explicite.**
- **Dépendances Supabase Auth/Storage/API** : **aucune** (code et dépendances vérifiés).
- Les **seules traces « supabase »** dans le code actif : `Backend/db/index.js:9` (commentaire) et `Backend/services/paymentProviders/index.js:11` (commentaire) + **l.48 : `if (/supabase/i.test(env.DATABASE_URL || ""))` = garde-fou métier actif** (voir Étape 3).