# LOT 6B — CONSOLIDATION GIT CONTRÔLÉE (SANS COMMIT NI PUSH) — RAPPORT

**Date :** 26/10/2026 · **Aucun staging/commit/push/reset/clean/stash** · aucun fichier modifié/supprimé/restauré/déplacé · index et répertoire de travail **inchangés** · aucun secret affiché.

---

## 1. État Git

### Initial
| Élément | Valeur |
|---|---|
| Branche | **`dev`** |
| Divergence (locale, **sans fetch**) | `origin/dev ahead by 0` · **`dev` ahead by 9** → 9 commits locaux déjà écrits par le projet (historique antérieur) + tout le travail non commité ci-dessous |
| Index (`git diff --cached`) | **7 suppressions** = legacy Vite · **435 deletions(-)** |
| Non indexé (`git diff`) | **45 fichiers** = 40 M + 5 suppressions · **6 136 + / 2 658 -** |
| Non suivis | **93 entrées** (dont `app/`, `Backend/db/`, `Backend/tests/` = répertoires) |
| Sauvegarde | `/home/limbo/rendu/react-cv-backups/react-cv-app-20261026-LOT6A` (Lot 6A, vérifiée) |

### Final
**Identique** (aucune opération de staging/modification effectuée) — seul ce rapport a été ajouté (`??`, 94).

## 2. Inventaire par catégorie

### Catégorie 1 — Code applicatif à conserver (à versionner)
**Fichiers modifiés (` M`, 40)** : `.env.example`, `.gitignore`, `Backend/.env.example`, `Backend/Middleware/AuthMiddleware.js`, `Backend/Routes/{AuthRoute,PlanRoutes,Stats,downloadRoutes,subscriptionRoutes,userRoutes}.js`, `Backend/package.json`, `Backend/package-lock.json`, `Backend/server.js`, `Backend/utils/{emailService,entitlements}.js`, `README.md`, `eslint.config.js`, `package.json`, `package-lock.json`, `postcss.config.js`, `tailwind.config.js`, `src/api/client.js`, `src/components/Admin/{AdminPlans,subscriptions,usermanager}.jsx`, `src/components/{Create,Home,Home2,Models,Payment,Plans}.jsx`, `src/components/Pages/{About,FAQ,Footer,Login,Navbar,Privacy,Sign_in,Terms}.jsx`, `src/context/AuthContext.jsx`.
**Non suivis applicatifs** : `app/**` (App Router), `middleware.js`, `next.config.js`, `jsconfig.json`, `.github/workflows/ci.yml`, `Backend/db/**` (pool, index, schema SQL ×6, repositories ×7), `Backend/services/**` (paymentService + providers), `Backend/tests/**` (5 suites = 36 tests), `Backend/Routes/paymentMockRoutes.js`, `Backend/loadEnv.js`, `Backend/.env.payment-mock.example` (**template sans secret**), `src/components/Admin/{AdminDashboard,AdminSidebar}.jsx`.

### Catégorie 2 — Suppressions INDEXÉES à confirmer (7)
`index.html`, `src/App.jsx`, `src/components/Admin/Adminhome.jsx`, `src/main.jsx`, `src/utils/ProtectedRoute.jsx`, `vercel.json`, `vite.config.js` → **à confirmer au commit** (traînent déjà dans l'index).

### Catégorie 3 — Suppressions NON INDEXÉES à confirmer (5)
`Backend/Models/{payements,plans,subscriptions,transaction,user}.js` → **`git rm` explicite** requis (jamais `git add -A`).

### Catégorie 4 — Rapports techniques à versionner éventuellement (~88 `.md`)
`LOT*`, `MIGRATION_*`, `*_REPORT.md`, `*_AUDIT*.md`, `PROJECT_GLOBAL_AUDIT_REPORT.md`, `PROJECT_STABILIZATION.md`, `USERMANAGER_SESSION_FIX_REPORT.md`, etc. → **décision de périmètre** (tout versionner vs sélection vs `.gitignore`).

### Catégorie 5 — Sauvegardes, secrets et fichiers locaux à EXCLURE
`.env`, `Backend/.env`, `Backend/.env.neon-test` (**secrets réels — déjà couverts par `.gitignore`, vérifié `--ignored`**) · `node_modules/`, `Backend/node_modules/`, `.next/` · `scripts/migrate/data/` (données locales) · sauvegarde Lot 6A (hors dépôt). **Jamais à `git add`.**

### Catégorie 6 — Utilité incertaine (à trancher avant commit)
`scripts/**` (outillage ops : `phase5j/`, `test-templates.mjs`, etc. — utiles à l'exploitation, inclut 1 `.md` de revue) → recommandation : **versionner** (traçabilité ops) mais décision explicite attendue.

## 3. Justification des suppressions (12 fichiers)
| Groupe | Preuves (Lot 6A + ce lot) |
|---|---|
| 7 legacy Vite | Migration Next documentée (remplacés par `app/`, `middleware.js`, `next.config.mjs`) · **0 import actif** · **0 référence indirecte** (scripts, package.json, configs, `.github/` = vérifiés ce lot) · `package.json.scripts` = `next dev/build/start` uniquement |
| 5 modèles Mongoose | Cutover Neon/pg (`Backend/db/repositories/*`) · **0 import actif** · 0 référence indirecte · seul résidu = commentaire `subscriptionRoutes.js:71` (SA-01, sans impact) |

**Aucune suppression à ajouter** ; les 12 = intentionnelles et **à conserver telles quelles dans le futur commit**.

## 4. Fichiers à exclure (rappel opérationnel)
| Chemin | Raison |
|---|---|
| `.env`, `Backend/.env`, `Backend/.env.neon-test` | **Secrets** (déjà ignorés par `.gitignore` — vérifié) |
| `node_modules/`, `Backend/node_modules/`, `.next/` | Dépendances/build (ignorés) |
| `scripts/migrate/data/` | Données locales de migration (ignorées) |
| `/home/limbo/rendu/react-cv-backups/**` | Sauvegarde indépendante (hors dépôt) |

## 5. Liste exacte proposée pour un futur commit (SANS staging)
**Ajouts explicites (`git add <chemin>` — jamais `git add .`) :**
1. **Code modifié (40)** : liste §2 cat.1 (ordre alphabétique).
2. **Code non suivi** : `app/`, `middleware.js`, `next.config.js`, `jsconfig.json`, `.github/workflows/ci.yml`, `Backend/db/`, `Backend/services/`, `Backend/tests/`, `Backend/Routes/paymentMockRoutes.js`, `Backend/loadEnv.js`, `Backend/.env.payment-mock.example`, `src/components/Admin/AdminDashboard.jsx`, `src/components/Admin/AdminSidebar.jsx`.
3. **Suppressions** : les 7 déjà indexées (laisser dans l'index) + `git rm Backend/Models/payements.js Backend/Models/plans.js Backend/Models/subscriptions.js Backend/Models/transaction.js Backend/Models/user.js`.
4. **Rapports (cat.4)** : sous décision — périmètre à trancher (ex. : versionner les `LOT*` et `MIGRATION_*` principaux).
5. **Optionnel** : `scripts/` (cat.6) — décision explicite attendue.

**Non évaluables / à trancher** : le contenu des ~88 rapports `.md` n'a pas été relu individuellement (présence et périmètre vérifiés seulement) ; `scripts/phase5j/*` = non relus en détail.

## 6. Risques et vérifications restantes
| ID | Gravité | Risque | Atténuation |
|---|---|---|---|
| GB-01 | Moyenne | `git add .`/`-A` = **interdit** mais trompeur (inclurait `.md` + scripts non arbitrés) | Utiliser la liste §5, chemin par chemin |
| GB-02 | Moyenne | Les 5 suppressions `Models/` non indexées = oubli possible au commit → résidus trackés | `git rm` explicite (§5.3) |
| GB-03 | Faible | Commentaire périmé `subscriptionRoutes.js:71` (SA-01) | Correction optionnelle avant commit |
| GB-04 | Faible | 9 commits locaux non pushés + nouveau travail = gros push initial | Observer Actions après push (Lots 5B/5C) |
| GB-05 | Faible | `.gitignore` modifié = relire avant commit pour garantir l'exclusion des `.env` | Relire `git diff .gitignore` au commit |
| GB-06 | Informationnelle | Périmètre des `.md` à versionner non arbitré | Décision utilisateur |

**Vérifications restantes avant consolidation** : arbitrer cat.4/cat.6 · relire `git diff --cached` · préparer `git rm` des Models · revalider build/lint/tests juste avant commit · **aucune exécution GitHub observée** à ce jour.

---

**→ LOT 6B TERMINÉ — inventaire complet (catégories 1-6), 12 suppressions justifiées et confirmées propres (0 référence directe ni indirecte), liste de commit préparée SANS staging. État Git inchangé. ARRÊT : attente de votre autorisation explicite.**