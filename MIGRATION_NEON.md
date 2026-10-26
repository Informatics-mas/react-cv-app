# 🚚 MIGRATION POSTGRESQL — SUPABASE → NEON (CV.CRAFT)

> **Phase : AUDIT ET PRÉPARATION UNIQUEMENT.**
> Aucune migration n'a été exécutée sur Neon, aucune donnée Supabase modifiée, aucune bascule,
> aucun `.env` remplacé. Toutes les vérifications ont été faites en **lecture seule** (SELECT,
> greps statiques, `pg_dump` non exécuté). Aucun secret ni mot de passe n'apparaît dans ce document.
> Branche Git : `refonte/nextjs` — rapport du 2026-10-22.

---

## 1. Audit de compatibilité

### 1.1 Dépendances à Supabase — RÉSULTAT : AUCUNE côté applicatif

| Vérification | Résultat |
|---|---|
| `supabase-js` / `@supabase/*` dans les dépendances | **AUCUN** (`Backend/package.json` : `pg` 8.23.1, `mongoose` 9.10.3, `express` 5.2.1, `node-cron`, `nodemailer`, `bcryptjs`, `jsonwebtoken`, `helmet`, `express-rate-limit`, `multer`, `zod`, `@google/generative-ai`) |
| `auth.uid()`, `auth.users`, schéma `auth` dans le code | **AUCUN** — les schémas `auth`, `storage`, `realtime`, `vault`, `graphql(_public)`, `extensions` existent dans la base Supabase mais **ne sont jamais référencés par l'application** (grep négatif sur tout le dépôt) |
| Stockage Supabase (`storage.*`) | **AUCUN** — les uploads passent par `multer` (disque local) |
| Temps réel Supabase | **AUCUN** |
| Supabase Vault / Edge Functions | **AUCUN** |
| Authentification applicative | JWT maison (`jsonwebtoken`, HS256) + cookies `httpOnly` — **indépendante de Supabase Auth** |
| Mentions « Supabase » dans le code | **Commentaires uniquement** (`server.js`, `pool.js`, `db/index.js`, docs) — aucune logique |

→ **Le schéma applicatif (`public`) est 100 % PostgreSQL standard.** La migration ne concerne que
le schéma `public` + ses données ; les artefacts Supabase (schémas `auth`/`storage`/…, rôles
`anon`/`authenticated`/`service_role`, `DEFAULT PRIVILEGES`, extension `supabase_vault`) ne sont
**pas migrés et ne doivent pas être recréés** sur Neon.

### 1.2 Client PostgreSQL, pool, TLS, reconnexion

| Élément | Constat (`Backend/db/pool.js`) | Impact Neon |
|---|---|---|
| Driver | `pg` 8.23.1, requêtes **paramétrées** ($1…) — aucune concaténation utilisateur | ✅ compatible |
| Pool | `max: 8`, `min: 2`, `idleTimeoutMillis: 30s`, `keepAlive: true` | ✅ compatible ; le plafond `max: 8` était calé sur le Session Pooler Supabase (15 connexions) — Neon autorise davantage, valeur conservable |
| Timeout connexion | `connectionTimeoutMillis: 30_000` (calé sur TLS froid Supabase 7-19 s) | ✅ conservable (plafond, pas une latence) ; à ré-évaluer après mesure sur Neon |
| TLS | `ssl: { rejectUnauthorized: false }` si `PGSSL=require` | ⚠️ fonctionne avec Neon **mais ne vérifie pas le certificat** — décision D2 (§8) |
| Reconnexion | `pool.on('error')` + `pool.on('connect')` (handler anti-crash client actif) + retry borné (2×) dans `AuthMiddleware` pour les erreurs transitoires | ✅ compatible — indépendant de la plateforme |
| `DATABASE_DRIVER` | double driver : `postgres` (repositories `pg`) ou `mongo` (`mongoStore.js` + Mongoose) | ✅ **fallback MongoDB conservé** = filet de sécurité de rollback |
| Refus de démarrage | si `DATABASE_DRIVER=postgres` sans `DATABASE_URL` → exit 1 | ✅ inchangé |
| Transactions | `withTransaction()` : BEGIN/COMMIT/ROLLBACK sur **un seul client** (`pool.connect()`) | ✅ compatible direct **et** pooler |
| Prepared statements nommés | **AUCUN** (requêtes paramétrées non nommées uniquement) | ✅ compatible pooler (mode transaction) |
| `LISTEN`/`NOTIFY`/advisory locks/`SET` côté runtime | **AUCUN** (seul `pg-role-dryrun.js`, script de test, utilise `SET ROLE`) | ✅ compatible pooler |

### 1.3 Contrats API et fonctionnalités

- **API** : toutes les routes passent par `db/*` (façade dual) → **aucun contrat API modifié** par la migration.
- **Cron** : 1 tâche `node-cron` (`0 1 * * *`, prévention J-7 expiration) — **in-process**, aucune
  dépendance externe (pas de pg_cron, pas de file de tâches) → migre avec l'application, pas avec la base.
- **Redis** : ⚠️ **aucune référence Redis dans le dépôt** (grep `redis|ioredis|bullmq` = 0 résultat
  côté `Backend/`, `src/`, `app/`). La consigne « Redis : conservé » est respectée par défaut
  (rien à toucher), mais si Redis existe c'est de l'**infrastructure externe** à ce dépôt — à
  clarifier (§8, décision D5). Aucune suppression, aucun changement.
- **GeniusPay** : **non opérationnel** dans ce dépôt — les plans payants renvoient
  `503 PAYMENT_PROVIDER_UNAVAILABLE` (`subscriptionRoutes.js:96`), aucun code webhook/callback n'existe
  ici. Conséquence : les tests GeniusPay sur Neon se limiteront au **refus 503** + **idempotence**
  garantie par la contrainte `payments.transaction_reference UNIQUE` — **aucun paiement réel
  déclenchable** (souhait de la mission, vérifié structurellement).


---

## 2. Inventaire des objets SQL (source : Supabase, schéma `public`, lecture seule)

### 2.1 Extensions

| Extension | Version (source) | Utilisée par le code ? | Sur Neon |
|---|---|---|---|
| `citext` | 1.6 | ✅ OUI — colonne `users.email` (case-insensitive) | **À installer** (`CREATE EXTENSION IF NOT EXISTS citext;`) — contrib standard, disponible sur Neon |
| `pgcrypto` | 1.3 | ❌ non (`gen_random_uuid()` est intégré à PG ≥ 13) | non migrée |
| `uuid-ossp` | 1.1 | ❌ non | non migrée |
| `pg_stat_statements` | 1.11 | ❌ non (monitoring plateforme) | gérée par Neon si besoin |
| `supabase_vault` | 0.3.1 | ❌ non | 🛑 **propriétaire Supabase — impossible sur Neon, à exclure du dump** |

⚠️ `pg_dump` inclut les `CREATE EXTENSION` des extensions présentes → **filtrer** pour ne garder que
`citext` (le reste provoquerait des erreurs d'extension introuvable à la restauration).

### 2.2 Tables (6), vues (0), séquences (0), triggers (5), index (23), contraintes (36)

| Table | Lignes (mesuré) | FK | Spécificités |
|---|---|---|---|
| `users` | 1 (admin réel `84fc860f-…`) | — | `email CITEXT UNIQUE`, CHECK `role IN (user,admin)`, `user_plan`, compteurs quota |
| `plans` | 3 (Free/Basic/Premium) | — | `name UNIQUE CHECK IN (Free,Basic,Premium)`, `features TEXT[]`, `price NUMERIC(12,2)` |
| `subscriptions` | 0 | `user_id→users CASCADE`, `plan_id→plans NO ACTION` | `status CHECK (active,expired,canceled,pending)` |
| `payments` | 0 | `user_id→users CASCADE`, `subscription_id→subscriptions NO ACTION` | `transaction_reference UNIQUE` (anti double-paiement), `raw_gateway_response JSONB` |
| `transactions` | 0 | `payment_id→payments NO ACTION` | `type CHECK (paiement,remboursement)` |
| `id_map` | 11 (users 5, plans 3, subscriptions 3) | — | traçabilité migration Mongo — **jamais exposée à l'API** |

Toutes les PK : `id UUID DEFAULT gen_random_uuid()`.
- **Triggers (5)** : `*_set_updated_at` (`BEFORE UPDATE`, fonction `set_updated_at()`,
  `SECURITY INVOKER`, `prosecdef=false` — mesuré) → aucune dépendance plateforme.
- **Fonctions** : `set_updated_at()` (plpgsql) + fonctions du type `citext` (portées par l'extension).
  **Aucune fonction `SECURITY DEFINER`** (mesuré).
- **Séquences** : **aucune** (UUID via `gen_random_uuid()`) → aucun `setval` après import.
- **Index (23)** : PK (6), uniques (9), FK/status/date (8) — recréables par `pg_restore` ;
  DDL canonique idempotent disponible : `Backend/db/schema/001_initial.sql`.
- **Contraintes (36)** : 16 CHECK, 5 FK, 6 PK, 9 UNIQUE — **100 % standard PostgreSQL**.
- **RLS** : active (`relrowsecurity=true`, `forced=false`) **sans aucune politique** (0 `pg_policies`)
  → default-deny pour tout rôle non-propriétaire. Voir §6.

### 2.3 Rôles et grants (à NE PAS reproduire sur Neon)

| Élément source (mesuré) | Sortie sur Neon |
|---|---|
| Rôle `postgres` (propriétaire, `bypassrls`, `createdb`, `createrole`) | Neon fournit son rôle admin — **jamais pour les requêtes courantes** (§3.1) |
| `anon`, `authenticated`, `service_role` : `ALL` sur les 6 tables | 🛑 **NON migrés** — rôles internes Supabase (rappel Lot 2 R6 : `service_role` = `BYPASSRLS`) |
| `DEFAULT PRIVILEGES` → `ALL` sur futures tables pour `anon`/`authenticated`/`service_role` | 🛑 **NON reproduits** — piège majeur (revue Lot 2) |
| `supabase_admin`, `supabase_auth_admin`, etc. | 🛑 NON migrés |
| Schémas `auth`, `storage`, `realtime`, `vault`, `graphql*`, `extensions` | 🛑 NON migrés — hors périmètre applicatif (§1.1) |

### 2.4 Données à migrer (volumétrie mesurée)


---

## 3. Préparer Neon (informations NON secrètes uniquement)

> Aucun mot de passe n'est demandé, affiché ni enregistré. Les valeurs secrètes (mot de passe des
> rôles Neon) seront fournies hors dépôt, par canal sécurisé, au moment de l'exécution autorisée.

| Élément | Valeur / statut |
|---|---|
| Projet Neon | ✅ créé (donné par la commande de mission) — **identifiant du projet à confirmer** (console Neon) |
| Branche cible | **`production`** pour la cible finale ; **branche éphémère `migration-test`** pour la migration de test (recommandation : utiliser le branchage natif Neon = rollback par suppression de branche) |
| Version PostgreSQL | **À CONFIRMER** (console Neon) — la source est **PostgreSQL 17.11** (mesuré) ; l'outillage local est **pg_dump/psql/pg_restore 18.6** (mesuré). Un dump pris avec pg_dump 18 **restaure** vers PG 17 sans problème (pg_dump est rétrocompatible vers les versions antérieures supportées) ; dans le sens inverse (dump 17 → restore 18) aucun souci non plus |
| Bases / schémas | 1 base, schéma `public` uniquement (les schémas Supabase `auth`/`storage`/… sont exclus, §2.3) |
| Extensions disponibles | `citext` doit être vérifiée comme disponible sur la région/plan Neon choisie (contrib standard — normalement présente) ; `supabase_vault` **impossible** (exclue) |
| Mode de connexion | **Direct** pour les opérations de migration (`pg_dump`/`pg_restore`/psql) ; **poolé (PgBouncer, `-pooler`)** ou direct pour l'application — le runtime n'utilise **ni** `LISTEN/NOTIFY` **ni** prepared statements nommés **ni** advisory locks (§1.2) → **les deux modes sont compatibles**. Recommandation : démarrer en **direct** (plus simple pour `withTransaction` et le debug), basculer en poolé si le nombre de connexions le justifie |
| Autosuspend Neon | ⚠️ Spécificité Neon : la base peut s'endormir → premier appel après veille = latence de réveil (~1-3 s). Le `connectionTimeoutMillis: 30_000` du pool absorbe ce délai. Optionnel : désactiver l'autosuspend sur la branche de production (décision D6) |

### 3.1 Rôles PostgreSQL cibles (moindre privilège — Lot 2 corrigé)

Conformément à la mission §4 et aux constats A1-A9 (revue Lot 2) : **trois rôles distincts**, et
l'application n'utilise **jamais** le propriétaire :

| Rôle | Usage | Privilèges |
|---|---|---|
| `cvc_migr` (rôle de migration) | `pg_restore`, DDL, seed initial, tâches admin | `CREATE` sur le schéma + DML complet temporaire ; **utilisé uniquement pendant la migration**, jamais par l'application |
| `cvc_app` (rôle applicatif) | requêtes courantes du backend Express | **SELECT/INSERT** sur les 5 tables runtime ; **UPDATE par colonne** (`users(user_plan,user_max_downloads,downloads_used)`, `subscriptions(status,end_date,auto_renew)`, `plans(7 colonnes métier)`) ; **DELETE** `users`,`plans` seulement ; **jamais** `id_map`, **jamais** TRUNCATE/DDL, **jamais** `role` en UPDATE |
| `cvc_admin` (administration) | opérations ponctuelles (audit, purge ciblée, support) | DML élargi + `id_map` ; **pas** de `SUPERUSER`/`CREATEDB`/`CREATEROLE`/`BYPASSRLS` |

**Correction de l'auto-élévation (A1 — obligatoire)** : sur `cvc_app`, la colonne `users.role`
n'est **pas** dans le GRANT UPDATE (déjà prévu) **et** la contrainte `users_role_check` reste ;
ajouter en défense en profondeur une politique RLS `users_insert ... WITH CHECK (role = 'user')`

---

## 5. Procédure de transfert reproductible (NON exécutée — soumise à autorisation)

> Principes : source **lecture seule** (aucun `ALTER`/`DELETE`/`UPDATE` sur Supabase), outils
> PostgreSQL standards (`pg_dump`/`pg_restore`/`psql`), tout se passe d'abord sur une **branche
> Neon de test**, chaque étape vérifiée avant la suivante. Les commandes utilisent des variables
> d'environnement (`$SUPABASE_RO_URL`, `$NEON_MIGR_URL`) — **jamais de mot de passe en clair** dans
> un fichier ou un historique shell.

**Étape 0 — Prérequis** : confirmation des infos §3 (version PG Neon, `citext` disponible,
mode de connexion) ; création de la branche Neon `migration-test` ; création du rôle `cvc_migr`.

**Étape 1 — Export du schéma et des données depuis Supabase (lecture seule)**
```bash
# 1a. DDL du schéma applicatif SEULEMENT (public), sans owners ni ACL Supabase
pg_dump "$SUPABASE_RO_URL" \
  --schema=public --no-owner --no-acl --no-privileges \
  --extension=citext \
  --file=neon-schema.sql --schema-only

# 1b. Données (format custom = parallélisable et restreignible)
pg_dump "$SUPABASE_RO_URL" \
  --schema=public --no-owner --no-acl --no-privileges \
  --data-only --compress=9 \
  --file=neon-data.dump --format=custom

# 1c. (option recommandée) export de contrôle en SQL lisible pour revue humaine
pg_dump "$SUPABASE_RO_URL" --schema=public --no-owner --no-acl --data-only \
  --file=neon-data.sql
```
⚠️ `pg_dump` n'altère **jamais** la source. Exclure explicitement les extensions Supabase
(`supabase_vault`) : si `neon-schema.sql` contient `CREATE EXTENSION supabase_vault`, **supprimer
cette ligne** avant restauration (vérification obligatoire). Idem pour d'éventuelles références à
des rôles Supabase (`anon`, `service_role`, …) dans des `GRANT`/`SET ROLE` résiduels : les
supprimer (le `--no-acl --no-privileges` doit déjà les éviter).

**Étape 2 — Vérification des extensions et objets compatibles**
```bash
grep -nE 'CREATE EXTENSION|CREATE POLICY|GRANT |ALTER DEFAULT' neon-schema.sql   # revue
grep -cE 'CREATE TABLE' neon-schema.sql   # attendu : 6
```
Vérifier : présence de `CREATE EXTENSION citext`, **absence** de `supabase_vault`, absence de
`GRANT` vers `anon`/`authenticated`/`service_role`, absence de `CREATE POLICY` (la source n'en a
pas — mesuré).

**Étape 3 — Import dans la branche Neon de test**
```bash
psql "$NEON_MIGR_URL" -c 'CREATE EXTENSION IF NOT EXISTS citext;'
psql "$NEON_MIGR_URL" -v ON_ERROR_STOP=1 -f neon-schema.sql
pg_restore "$NEON_MIGR_URL" --no-owner --no-privileges --single-transaction neon-data.dump
# (alternative si le .sql lisible a été retenu :) psql "$NEON_MIGR_URL" -f neon-data.sql
```

**Étape 4 — Comparaison objets et comptages (reproductible)**
```sql
-- À exécuter sur les DEUX bases et comparer les sorties
SELECT 'users' t, count(*) FROM users UNION ALL
SELECT 'plans', count(*) FROM plans UNION ALL
SELECT 'subscriptions', count(*) FROM subscriptions UNION ALL
SELECT 'payments', count(*) FROM payments UNION ALL
SELECT 'transactions', count(*) FROM transactions UNION ALL
SELECT 'id_map', count(*) FROM id_map;
-- Structure : tables, index, contraintes, triggers
SELECT count(*) FROM information_schema.tables  WHERE table_schema='public' AND table_type='BASE TABLE'; -- 6
SELECT count(*) FROM pg_indexes     WHERE schemaname='public';   -- 23
SELECT count(*) FROM pg_constraint  WHERE connamespace='public'::regnamespace; -- 36

---

## 6. Sécurité (réexamen des constats A1–A9 du Lot 2)

| Constat Lot 2 | Traitement dans la migration Neon | Statut |
|---|---|---|
| **A1 (critique)** — auto-élévation : `users_insert` autorisait `role='admin'` | **Corrigé par conception sur Neon** : rôle applicatif `cvc_app` sans UPDATE sur `role`, + politique `users_insert … WITH CHECK (role = 'user')` = une inscription publique ne crée **qu'un utilisateur standard**. Le code le fait déjà (`USER_ROLES.USER` forcé, `AuthRoute.js:87`) — le contrôle DB est la seconde barrière | ✅ corrigé (D1(a) de la revue Lot 2 retenu) |
| **A2** — `GRANT TRIGGER` superflu | **Non accordé** sur Neon (les triggers `set_updated_at` s'exécutent sans lui — vérifié I12 en Lot 2) | ✅ évité |
| **A3** — SQL corrompu (statement coupé) | Le DDL Neon sera reconstruit depuis `001_initial.sql` + script de rôles **propre**, relu avant exécution | ✅ évité |
| **A4** — rollback incomplet | La migration se fait sur une **branche Neon éphémère** = rollback = suppression de branche (§8) ; aucune procédure `DROP ROLE` fragile | ✅ simplifié |
| **A5** — comptage politiques | N/A (politique unique et minimale sur Neon) | ✅ |
| **A6** — cascades NO ACTION | Les FK sont identiques (recréées à l'identique) ; le test de cascade **T9** est dans la matrice §7 | ✅ couvert par test |
| **A7** — scripts de test / dry-run | Les scripts de test utiliseront `cvc_migr`/`cvc_admin`, jamais `cvc_app` | ✅ cadré |
| **A8** — `currency='XOF'` durci | Contraignante conservée à l'identique (contrat existant) | ✅ inchangé |
| **A9** — cosmétiques | Sans objet | ✅ |

**Règles de sécurité de la migration :**
1. **Ne pas reproduire les grants Supabase** : aucun `anon`/`authenticated`/`service_role`, aucun
   `ALTER DEFAULT PRIVILEGES` vers ces rôles. Sur Neon, seuls `cvc_migr`, `cvc_app`, `cvc_admin`
   (+ rôle admin Neon) existent.
2. **Stratégie RLS** : la source a une RLS **active sans politique** (default-deny) — elle ne
   protégeait rien côté applicatif (rôle propriétaire = bypass). Sur Neon, on applique une RLS
   **utile et minimale** : uniquement là où elle reflète le modèle d'accès réel —
   `users_insert` `WITH CHECK (role='user')` pour `cvc_app` (anti auto-élévation). Le reste du
   modèle d'accès (service unique backend, isolation inter-utilisateurs **applicative**) ne gagne
   rien d'une RLS par ligne ; **la RLS ne remplace pas l'autorisation applicative** (rappel Lot 2).
3. **Isolation inter-utilisateurs** : reste applicative (`keyFilter` par id, tests A10/Q3) — à
   rejouer sur Neon (§7).
4. **Accès aux paiements** : `payments`/`transactions` en INSERT/SELECT seulement pour `cvc_app`
   (pas d'UPDATE/DELETE) — écriture comptable préservée (Lot 2 §21.4).
5. **JWT / cookies / rate limiting** : **aucun changement** — `JWT_SECRET`, `httpOnly`,
   `authLimiter (max: 5/15 min)` intacts ; la migration ne touche pas l'authentification.
6. **Compte admin existant** : **préservé tel quel** (copié intact : id `84fc860f-…`, rôle admin,

---

## 7. Matrice de tests sur Neon de test — et résultats

> **Résultat global : NON EXÉCUTÉS** — la migration de test n'est pas autorisée à ce stade
> (phase audit/préparation). La matrice est **prête à l'emploi** ; les résultats seront remplis
> lors de l'exécution autorisée. Seules les lignes marquées ✅ ont été exécutées (lecture seule,
> sur la base actuelle) et servent de **référence de départ**.

| # | Test | Procédure | Attendu | Résultat |
|---|---|---|---|---|
| T1 | Connexion / déconnexion | `POST /api/auth/login` → cookie httpOnly → `POST /api/auth/logout` | 200/200 + cookie vidé | ⏳ à exécuter (réf. Lot 1 S1-S7 : ✅ passé sur Supabase) |
| T2 | Cookies JWT + `/api/auth/me` | `GET /api/auth/me` avec cookie ; JWT expiré/falsifié | 200 profil ; 401 sur expiré/falsifié | ⏳ (réf. Lot 1 S2/S6 + J1-J8 ✅) |
| T3 | **Refus d'auto-élévation admin** | (a) `POST /api/auth/register` avec `{role:'admin'}` ; (b) `INSERT` direct en `cvc_app` | (a) compte créé `role='user'` ; (b) **REFUS** (WITH CHECK) | ⏳ **test clé A1** — voir aussi T3' ci-dessous |
| T4 | Accès CV + isolation utilisateurs | user A tente lecture/écriture données de user B (IDOR) | 403 / 404, jamais données de B | ⏳ (réf. A10 ✅) |
| T5 | Plans | `GET /api/plans` public ; CRUD admin | 200 ; 403 si non admin | ⏳ (réf. Lot 1 ✅) |
| T6 | Abonnements | subscribe gratuit/payant ; re-souscription (anti-contournement quota) | 201 / 503 payant / quota non réinitialisé | ⏳ (réf. Q3, P1-P14 ✅) |
| T7 | Paiements & transactions | subscribe payant → `503 PAYMENT_PROVIDER_UNAVAILABLE` ; **idempotence** : 2× `transaction_reference` identique → 1 seule ligne | 503 ; 2ᵉ insert rejeté (UNIQUE) | ⏳ **AUCUN PAIEMENT RÉEL** — GeniusPay non opérationnel (§1.3), aucun callback existant à tester ici |
| T8 | Redis | vérifier l'absence de régression des features qui l'utiliseraient | — | ⏳ **Redis absent du dépôt** (§1.3) — test à définir après clarification (D5) |
| T9 | Tâches planifiées | cron J-7 (`node-cron`) ; rejeu de `findExpiringPopulated` | requêtes OK sur Neon | ⏳ |
| T10 | Migrations & rollback | import sur branche `migration-test` ; suppression de branche | import OK ; rollback = branche supprimée | ⏳ |
| T11 | Non-régression Lot 1 | 11 scripts `phase5h/5i/5j` + parcours S1-S9 | tous PASS | ⏳ (réf. 77 contrôles ✅ sur Supabase) |
| T12 | Build & ESLint | `npm run build`, `npx eslint src --max-warnings 0` | exit 0 | ✅ **ESLint exit 0** (exécuté le 2026-10-22, indépendant de la DB) ; build à refaire dans l'env de test |
| T13 | Cascade NO ACTION (A6) | DELETE user possédant subscription+payment+transaction | enfants purgés ou échec identifié | ⏳ |
| T14 | Intégrité post-import | requêtes §5 étape 4-5 | 0 orphelin, comptages identiques | ⏳ |

**Garde-fous de test** : aucun paiement réel (structurellement impossible — pas de prestataire
opérationnel) ; comptes de test uniquement (`phase5i-*@test.local`) ; suppression ciblée en fin de
tests ; jamais de purge générale.

   hash bcrypt inchangé) — vérification S9 en test.

---

## 8. Livrables complémentaires

### 8.1 Variables d'environnement nécessaires (NOMS uniquement — aucune valeur secrète)

| Variable | Changement pour Neon | Secret ? |
|---|---|---|
| `DATABASE_URL` | **valeur remplacée** par l'URL Neon (direct pour la migration, poolé/direct pour l'app) — nom inchangé, donc **aucun changement de code** | ✅ OUI (mot de passe inclus) — via canal sécurisé, jamais dans Git |
| `PGSSL` | `require` (Neon exige TLS) | non |
| `DATABASE_DRIVER` | `postgres` (inchangé) | non |
| `JWT_SECRET` | **inchangé** (les sessions/cookies restent valides) | ✅ OUI |
| `PORT`, `FRONTEND_URL`, `CLIENT_URL`, `TRUST_PROXY`, `NEXT_PUBLIC_API_URL` | inchangés | non (sauf si URL publique différente) |
| `EMAIL_HOST/PORT/USER/PASS/SECURE`, `GEMINI_API_KEY`, `MONGO_URI` | inchangés (hors périmètre) | ✅ pour PASS/API_KEY/MONGO_URI |
| `NEON_PROJECT_ID`, `NEON_BRANCH` (nouveaux, optionnels) | traçabilité de la cible dans la doc/opérations | non |

`.gitignore` couvre déjà `.env*` (sauf `.env.example`) — **aucun secret ne peut être commité**.

### 8.2 Stratégie de bascule (ultérieure — NON autorisée aujourd'hui)

1. Migration de test **validée** (§7 complète ✅) sur branche `migration-test`.
2. Créer la branche Neon `production` (ou cibler la branche main du projet).
3. **Fenêtre de maintenance courte** : figer les écritures applicatives (mode lecture seule ou arrêt).
4. Dump **frais** depuis Supabase (rejouer §5 étapes 1-3 sur la branche production) pour capturer les
   dernières écritures.
5. Basculer `DATABASE_URL` → Neon, redémarrer le backend, tests de fumée immédiats
   (`/api/plans`, login, `/api/auth/me`, subscribe test).
6. Surveillance : logs 42501/503, latences (autosuspend), cron J-7.
7. Supabase **laissé intact** en lecture seule pendant toute la période de stabilisation (pas de
   suppression).

### 8.3 Stratégie de retour arrière

| Niveau | Action | Durée | Preuve |
|---|---|---|---|
| **Application** | Rétablir l'ancien `DATABASE_URL` (Supabase) + redémarrer le backend | ~minutes | Supabase n'a jamais été modifié → retour fidèle |
| **Données** | Aucune écriture n'a eu lieu sur Supabase pendant la bascule (mode figé) → pas de divergence à réconcilier | — | procédure §8.2 étape 3 |
| **Migration de test** | Suppression de la branche Neon `migration-test` | immédiat | branchage natif Neon |
| **Filet ultime** | `DATABASE_DRIVER=mongo` (fallback conservé — §1.2) | minutes | `Backend/db/CUTOVER-ROLLBACK.md` existant |

### 8.4 Risques et décisions restantes

| # | Risque / décision | Impact | Statut |
|---|---|---|---|
| D1 | **Confirmer la version PG de Neon** vs 17.11 source et la disponibilité de `citext` | bloquant si `citext` indisponible (mais contrib standard) | ⏳ décision opérateur |
| D2 | TLS Neon : `rejectUnauthorized: false` (actuel) vs `true` + CA | sécurité | ⏳ décision |
| D3 | Mode connexion direct vs poolé pour l'app | perf/connexions | ⏳ décision (démarquer en direct) |
| D4 | Autosuspend Neon (veille → réveil ~1-3 s) | UX première requête | ⏳ décision |
| D5 | **Redis : absent du dépôt** — clarifier son usage réel (infra externe ? autre dépôt ?) avant de le considérer « conservé » | périmètre | ⏳ clarification |
| D6 | GeniusPay non opérationnel : les tests paiement sur Neon seront partiels (503 + idempotence UNIQUE) ; les callbacks/idempotence webhooks ne pourront être testés qu'au Lot GeniusPay dédié | couverture de test | ⏳ acté |
| D7 | **Auto-élévation A1** : correction intégrée à la conception Neon (§6) — à valider par le test T3 | sécurité critique Lot 2 | ✅ conçu, à tester |
| D8 | Re-mesure de la volumétrie juste avant le dump (les 15 lignes actuelles sont un instantané) | exactitude | ⏳ à l'exécution |
| R1 | perte d'accès si mauvaise URL Neon (typo) | interruption | mitigée : tests de fumée immédiats + rollback §8.3 |
| R2 | `pg_dump` inclurait des artefacts Supabase non filtrés | échec d'import | mitigée : revue `grep` obligatoire (§5 étape 2) |

---

## 9. Verdict

## AUDIT TERMINÉ — PRÊT POUR MIGRATION DE TEST

- ✅ **Compatibilité confirmée** : schéma applicatif 100 % PostgreSQL standard — **aucune dépendance
  Supabase** (pas de `supabase-js`, `auth.uid()`, `auth.users`, storage, temps réel). Seule
  l'extension `citext` est à installer sur Neon ; `supabase_vault` et les rôles/grants Supabase
  sont explicitement exclus.
- ✅ **Inventaire SQL complet** (§2) : 6 tables, 5 triggers, 23 index, 36 contraintes, 0 séquence,
  0 vue, 0 fonction `SECURITY DEFINER` — DDL canonique disponible (`001_initial.sql`).
- ✅ **Procédure de transfert reproductible** (§5) : `pg_dump`/`pg_restore` standards, source en
  lecture seule, filtrage des artefacts Supabase, import sur branche éphémère, comparaisons
  d'objets/comptages/intégrité à chaque étape.
- ✅ **Sécurité** : auto-élévation (A1) **corrigée par conception** sur Neon (INSERT `role='user'`
  uniquement) ; pas de grants `anon`/`authenticated`/`service_role` ; RLS minimale et justifiée ;
  JWT, cookies httpOnly et rate limiting `max: 5` inchangés ; compte admin préservé.
- ✅ **Rollback** : retour `DATABASE_URL` vers Supabase (intact) + fallback Mongo conservé +
  branche Neon éphémère supprimable.
- ⏳ **En attente d'autorisation** : exécution de la migration de test (§5) et remplissage de la
  matrice §7. Décisions D1-D6 à trancher avant l'exécution.

**Aucune base n'a été modifiée** (Supabase intacte, Neon non touchée), **aucune bascule** n'a été
effectuée, aucun `.env` remplacé, aucun secret exposé. La migration ne sera considérée comme
terminée qu'après **validation des données (§7 T14) et tests fonctionnels (§7 T1-T13)** sur
l'environnement de test Neon — sans paiement réel, sans modification de Supabase.

7. **TLS Neon** : `PGSSL=require` recommandé ; si Neon fournit un certificat vérifiable, préférer
   `rejectUnauthorized: true` + `CA` fournie (amélioration du `false` actuel — décision D2).

SELECT count(*) FROM information_schema.triggers WHERE trigger_schema='public'; -- 5
```
Comparer aussi : `pg_dump --schema-only` des deux côtés (diff normalisé) ; aucune séquence à
aligner (0 séquence — mesuré).

**Étape 5 — Intégrité référentielle et données**
```sql
-- Orphelins (doivent renvoyer 0 sur chaque ligne)
SELECT count(*) FROM subscriptions s LEFT JOIN users u ON u.id=s.user_id  WHERE u.id IS NULL;
SELECT count(*) FROM subscriptions s LEFT JOIN plans  p ON p.id=s.plan_id WHERE p.id IS NULL;
SELECT count(*) FROM payments      p LEFT JOIN users u ON u.id=p.user_id  WHERE u.id IS NULL;
SELECT count(*) FROM payments      p LEFT JOIN subscriptions s ON s.id=p.subscription_id WHERE s.id IS NULL;
SELECT count(*) FROM transactions  t LEFT JOIN payments p ON p.id=t.payment_id WHERE p.id IS NULL;
-- Cohérence métier
SELECT count(*) FROM users WHERE downloads_used > user_max_downloads;   -- 0
SELECT count(*) FROM users WHERE email !~ '^[^@]+@[^@]+\.[^@]+$';       -- 0
```
Puis rejeu du comparateur existant `scripts/migrate/compare.js` (Mongo ↔ cible) si le contrôle
croisé avec la référence Mongo est souhaité.

**Étape 6 — Backend de test avec secret Neon dédié**
- Copier `Backend/.env` → `Backend/.env.neon-test` (**jamais commité** — `.gitignore` couvre `.env*`).
- Modifier uniquement : `DATABASE_URL=<URL Neon de test>` (+ `PGSSL` selon la config Neon).
- Créer le rôle applicatif de test et restreindre ses privilèges (§3.1, §6).
- Démarrer le backend avec ce fichier (ex. `dotenv_config_path` ou copie temporaire) et vérifier
  `ping()` + `/api/plans` = 200.

**Étape 7 — Tests sans toucher à la production** : matrice §7 complète sur ce backend de test.

pour `cvc_app` — une inscription publique ne pourra créer **qu'un utilisateur standard**, jamais un
admin (le code l'impose déjà via `USER_ROLES.USER`, `AuthRoute.js:87` — vérifié ; le contrôle DB
couvre le cas d'une faille applicative future). Les comptes admin ne sont créés que par
`cvc_admin`/`cvc_migr`. Voir §6 pour le détail.

`users` 1 · `plans` 3 · `subscriptions` 0 · `payments` 0 · `transactions` 0 · `id_map` 11
→ **15 lignes au total** (données de test/QA ; le compte admin réel est préservé tel quel).
La volumétrie sera re-mesurée juste avant le dump réel.
