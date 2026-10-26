# LOT 6C — PLAN DE STAGING CONTRÔLÉ — RAPPORT

**Date :** 26/10/2026 · **Aucun `git add`/`git rm`/staging/commit/push/reset/clean/stash** · index et répertoire de travail inchangés · aucun code/`.env`/secret/migration/base modifié · aucun secret affiché (valeurs masquées).

---

## 1. État Git

| | Initial | Final |
|---|---|---|
| `git status --short` | `5  D / 40  M / 94 ?? / 7 D` | `5  D / 40  M / 95 ?? / 7 D` (+1 = ce rapport) |
| Index (`git diff --cached`) | 7 suppressions (legacy Vite) | **identique (7)** |
| Branche | `dev` | `dev` |
| Divergence (locale, sans fetch) | `origin/dev` = 0 commit · `dev` = **9 commits d'avance** | identique |

### Les 9 commits non poussés (sujets)
| Commit | Sujet |
|---|---|
| `774ae7f` | security: stop tracking .env, add environment templates |
| `6a15a87` | chore: remove legacy routing files and unused assets |
| `70b90c5` | security: premium-gate parse-cv, require JWT_SECRET at boot, purge… |
| `9704645` | chore: remove unused socket.io dependency |
| `b21bad3` | fix(api): centralize API base URL with fallback |
| `6820d00` | fix(auth): preserve local CV data on logout |
| `f84e76e` | chore(admin): unify admin routes, require plan maxDownloads |
| `debafb9` | refactor: server-side entitlements, quota and auth context |
| `998aac2` | security: untrack .env from repository (follow-up) |

**Attention particulière** : la distante `origin/dev` **ne contient aucun changement absent de la branche locale** (0 commit côté distant) → aucun rebase/conflit à anticiper · le futur push = 9 commits + le commit de consolidation (gros push → observer Actions, Lots 5B/5C).

## 2. Liste exacte des candidats au staging

### A. Code applicatif MODIFIÉ (` M`, 40 — tous INCLUS)
**Catégorie code** : `Backend/Middleware/AuthMiddleware.js`, `Backend/Routes/{AuthRoute,PlanRoutes,Stats,downloadRoutes,subscriptionRoutes,userRoutes}.js`, `Backend/server.js`, `Backend/utils/{emailService,entitlements}.js`, `src/api/client.js`, `src/components/Admin/{AdminPlans,subscriptions,usermanager}.jsx`, `src/components/{Create,Home,Home2,Models,Payment,Plans}.jsx`, `src/components/Pages/{About,FAQ,Footer,Login,Navbar,Privacy,Sign_in,Terms}.jsx`, `src/context/AuthContext.jsx` — *justification : travail applicatif de la migration (Next + Neon + auth + payments mock), cœur du projet.*
**Catégorie configuration** : `.env.example`, `Backend/.env.example`, `.gitignore`, `README.md`, `eslint.config.js`, `package.json`, `package-lock.json`, `postcss.config.js`, `tailwind.config.js`, `Backend/package.json`, `Backend/package-lock.json` — *justification : config Next/ESLint/projet + templates sans secret.*

### B. Code applicatif NON SUIVI (INCLUS)
| Chemin | Catégorie | Justification |
|---|---|---|
| `app/**` (25 fichiers : `(protected)/{home,payment,plans}`, `admin/{mailer,plans,subscriptions,users}`, `{about,create,faq,login,models,privacy,sign-in,terms}`, `layout.jsx`, `globals.css`, `not-found.jsx`, `page.jsx`, `payment-sim`, `plan`) | code | App Router Next (remplace Vite) |
| `middleware.js`, `next.config.js`, `jsconfig.json` | configuration | Routing/sécurité Next |
| `.github/workflows/ci.yml` | configuration | CI (Lots 5A/5C, durcie) |
| `Backend/db/**` : `pool.js`, `index.js`, `mappers.js`, `schema/{001,002,002_rollback,003,003_rollback}.sql`, `grants/001_grants_rls.sql`, `repositories/{payments,plans,sessions,subscriptions,transactions,users}.js`, `CUTOVER-ROLLBACK.md` | code + migrations | Couche Neon/pg (le cœur du cutover) |
| `Backend/services/{paymentService.js, paymentProviders/{index,mockProvider}.js}` | code | Paiements mock (guard) |
| `Backend/tests/*.test.mjs` (5) | test | 36 tests = CI |
| `Backend/Routes/paymentMockRoutes.js`, `Backend/loadEnv.js` | code | Routes mock + chargement env |
| `Backend/.env.payment-mock.example` | configuration | Template sans secret |
| `src/components/Admin/{AdminDashboard,AdminSidebar}.jsx` | code | Module admin migré |

### C. Suppressions proposées (12 — justifications)
| Groupe | Chemins | État | Justification |
|---|---|---|---|
| **7 Vite** | `index.html`, `src/App.jsx`, `src/components/Admin/Adminhome.jsx`, `src/main.jsx`, `src/utils/ProtectedRoute.jsx`, `vercel.json`, `vite.config.js` | **déjà indexées** | Migration Next documentée · 0 import · 0 référence indirecte (scripts/package.json/configs/CI vérifiés) → **confirmer l'index existant** |
| **5 Mongoose** | `Backend/Models/{payements,plans,subscriptions,transaction,user}.js` | non indexées | Cutover Neon/pg · 0 import · 0 référence indirecte → **`git rm` explicite** lors du staging (jamais `git add -A`) |

### D. Rapports Markdown (81 racine + 2 dans les répertoires)
**RETENUS — rapports de référence (21)** : `PROJECT_GLOBAL_AUDIT_REPORT.md` (audit global AN-01→19), `LOTS_1_3_4_CONSOLIDATED_REPORT.md`, `LOT1_NEON_NETWORK_AUDIT_REPORT.md`, `LOT3_SECURITY_RLS_INTEGRATION_AUDIT_REPORT.md`, `LOT4_CI_LEGACY_AUDIT_REPORT.md`, `LOT5A_CI_IPV4FIRST_REPORT.md`, `LOT5B_CI_AUDIT_REPORT.md`, `LOT5C_CI_HARDENING_REPORT.md`, `LOT6A_PRE_PUSH_SAFETY_REPORT.md`, `LOT6B_GIT_CONSOLIDATION_AUDIT.md`, `NEON_MIGRATION_FINAL_REPORT.md`, `MIGRATION_NEXTJS.md`, `MIGRATION_NEON.md`, `BACKEND_PAYMENT_MOCK_GUARD_LOT1B_REPORT.md`, `…LOT2_REPORT.md`, `…LOT3_REPORT.md`, `…LOT5_REPORT.md`, `BACKEND_PAYMENT_MOCK_GUARD_LOT4_AUDIT_REPORT.md`, `BACKEND_PAYMENT_MOCK_HARDENING_PLAN.md`, `PROJECT_STABILIZATION.md`, `SUPABASE_TO_NEON_MIGRATION_AUDIT.md` — *justification : état de référence du projet, utiles à l'équipe et à l'exploitation.*
**À ARBITRER — rapports de session (≈60)** : `MIGRATION_NEXTJS_PHASE-B-*` (16), `MIGRATION_NEON-PHASE-*`/`MIGRATION_NEON_*` (16), diagnostics ponctuels (`*_DIAGNOSTIC_REPORT.md`, `*_FIX_REPORT.md`, `AUTH_*`, `NEON_*`, `PLANS_*`, `USERMANAGER_*`, `CV_*`, `IPV4_*`, `LOGIN_*`, `LOGOUT_*`…) — *traçabilité complète mais volumineux ; décision : tout versionner / sélectionner / ignorer.* `Backend/db/CUTOVER-ROLLBACK.md` et `scripts/migrate/README.md` = **retenus** (documentation technique embarquée).

### E. `scripts/**`
| Chemin | Décision | Justification |
|---|---|---|
| `scripts/neon/init-admin.mjs` | **INCLUS** | Création d'admin (exploitation Neon) |
| `scripts/lib/safe-target.js` | **INCLUS** | Helper partagé |
| `scripts/migrate/README.md` + `scripts/migrate/*.js` (hors data) | **INCLUS** | Outillage de migration documenté |
| `scripts/test-templates.mjs` | **INCLUS** | Test de templates e-mail |
| `scripts/phase5h/**`, `phase5i/**`, `phase5j/**` (≈35 fichiers : audits, batteries `test-*`, `rotate-jwt-secret.js`, `purge-temp-users.js`) | **À ARBITRER** (recommandation : inclure) | Audits/validation d'exploitation (phases de migration) — utiles à la reprise |
| `scripts/migrate/data/**` | **EXCLUS** | Données locales (**déjà ignorées — vérifié `git check-ignore` = IGNORED_OK**) |
| `scripts/phase5j/lot2-review-2026-10-22.md` | **À ARBITRER** | Note de revue dans scripts |

### F. CI et lots 5A/5B/5C
`.github/workflows/ci.yml` = **INCLUS** (configuration — durcie : permissions lecture seule, timeout 15, concurrence par ref) · `LOT5A/5B/5C_REPORT.md` = **retenus** dans la sélection D.

## 3. Fichiers exclus (sécurité)
`.env`, `Backend/.env`, `Backend/.env.neon-test` (**secrets réels**) · `node_modules/`, `Backend/node_modules/`, `.next/` · `scripts/migrate/data/**` · sauvegarde Lot 6A (hors dépôt) — *déjà couverts par `.gitignore` (vérifié), jamais à `git add`.*

## 4. Contrôles de sécurité effectués
| Contrôle | Méthode | Résultat |
|---|---|---|
| Patterns de secrets (clés privées, `sk_live_`, `postgres://user:pass@`, `password="…"`) | grep sur candidats (noms seulement) | 12 fichiers = **tests/scripts** uniquement |
| Nature des valeurs (**masquées**) | extraction `***MASKED***` | **fixtures de test factices** (`pwd-…`, `Phase5*!pass…`, `mauvais…`) — aucun secret réel, aucune chaîne de connexion |
| `.env` exclus | `git status --ignored` | `.env`, `Backend/.env`, `Backend/.env.neon-test` = ignorés ✅ |
| Templates `.example` | revue antérieure | placeholders uniquement ✅ |
| Non suivis ≠ publiquables | principe appliqué | chaque inclusion justifiée individuellement (§2) |

**Incidence** : `Phase5*!pass…` = **comptes de test** (bases de test) — sans risque production.

## 5. Incertitudes à résoudre AVANT staging
1. **Périmètre des rapports `.md`** : tous (~81) / sélection de référence (21) / ignorer les sessions (~60) — **arbitrage requis**.
2. **`scripts/phase5h|i|j`** : inclure (recommandé) ou exclure — **arbitrage requis**.
3. `scripts/phase5j/lot2-review-2026-10-22.md` : rapports vs scripts.
4. Commentaire périmé `subscriptionRoutes.js:71` (SA-01) : corriger avant commit ou laisser.
5. Non évalués individuellement : contenu des ≈60 rapports de session et scripts phase5 (périmètre vérifié seulement).

## 6. Opérations de staging prévues (lot ultérieur — AUCUNE exécutée ici)
1. `git add` **chemin par chemin** (§2A/§2B) — **jamais `git add .`/`-A`**.
2. `git rm Backend/Models/{payements,plans,subscriptions,transaction,user}.js`.
3. Laisser les 7 suppressions Vite indexées (relire `git diff --cached`).
4. Revalider `lint`/`build`/`36 tests` juste avant le commit.

---

**→ LOT 6C TERMINÉ — plan de staging complet (chemins exacts, états, catégories, justifications), 12 suppressions justifiées, sécurité vérifiée (fixtures uniquement), index et WD inchangés. ARRÊT : attente de votre arbitrage (§5) et autorisation explicite.**