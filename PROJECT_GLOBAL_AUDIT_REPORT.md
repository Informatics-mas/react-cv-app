# AUDIT GLOBAL — IT-MAINTENANCE-MANAGER / CV SAAS — RAPPORT

**Date :** 26/10/2026 · **AUDIT UNIQUEMENT — aucun fichier de code/config modifié, aucune donnée, aucun compte, aucun déploiement, aucun commit.**

---

## A. Résumé exécutif

**État global : PROJET SAIN ET FONCTIONNEL EN LOCAL, NON VALIDÉ EN NAVIGATEUR NI EN PRODUCTION.**

- **Points validés (revérifiés cet audit)** : architecture Next.js App Router propre (22 pages, 23 `use client`, 2 faux positifs hooks) · auth cookie HttpOnly cohérente front/back (0 `setItem("token")`, 0 `data.token`) · admin (users/plans) conforme (routes `protect+adminOnly`, contrats alignés) · création CV = PDF navigateur + quota serveur · Neon : pool `min: 0`/TLS strict, migrations 5 fichiers ordonnées · paiements mock = **6 signaux + ACK**, GeniusPay = **exception explicite** · **36/36 tests · lint 0 · build 22/22**.
- **Risques majeurs** : épisodes réseau `ETIMEDOUT`/`ENETUNREACH` (Neon/WSL) **toujours présents** · **aucun test navigateur** jamais exécuté · **aucune CI** · tests d'intégration (T12/13/16/18) et RLS applicative **non exécutés** · **83 fichiers non suivis / 40 modifiés non commités** (acquis fragile).
- **BLOQUÉ** : tests 403 non-admin (compte de test absent) · RLS `SET ROLE cvc_app` (option Neon `set_option=false`) · validation navigateur (aucun navigateur).
- **Non vérifié** : rendu visuel/responsive, PDF réel imprimé, comportement production.

## B. Tableau de statut

| Phase | Statut | Preuves | Fichiers | Risque | Action recommandée |
|---|---|---|---|---|---|
| **A — Next.js/App Router** | **VALIDÉ** | 19 `page.jsx` + 3 layouts · scripts `next dev/build/start` · `react-router-dom` = 0 code (1 commentaire) · fichiers Vite = 0 · `middleware.js` + `next.config.js` + `jsconfig.json` | `app/`, `src/`, `middleware.js` | Faible | Lot 6 (nettoyage commentaires) |
| **B — Auth/Autorisations** | **VALIDÉ** (revérifié) | `setItem("token")`=0 · `data.token`=0 · `credentials: "include"`=9 fichiers · `verifySession` (jose, `jti`) · double canal cookie\|Bearer (`AuthMiddleware:47`) · **8 `getItem('token')`** = headers legacy | `AuthContext`, `Login`, `Sign_in`, `middleware.js`, `AuthMiddleware` | Faible (legacy) | Lot 6 (nettoyage Bearer) |
| **C — Administration** | **VALIDÉ** | Routes `PlanRoutes`/`userRoutes` = `protect+adminOnly` · PUT plans = 200 (fix `keyFilter`), 404 propre, 503 réseau · messages 401/403/réseau différenciés | `AdminPlans`, `usermanager`, `PlanRoutes`, `userRoutes` | Faible | Lot 2 (403 non-admin à tester) |
| **D — CV / PDF** | **PARTIEL** | Parcours serveur validé (`/downloads/authorize` 200 via cookie) · PDF = `react-to-print` **côté navigateur** · quotas (`QUOTA_EXCEEDED`) · **PDF réel non vérifié** | `Create.jsx` | Moyen | **Lot 3 (tests navigateur)** |
| **E — Neon/PostgreSQL** | **VALIDÉ** (statique + historique) | Pool `max:8,min:0,30s,keepAlive,TLS strict` · migrations `001→002→grants→003` (+rollbacks) · schéma 7 tables/31 RLS/26 index (rapports) · résidus : 1 commentaire supabase · `mongo` code = **0** | `pool.js`, `db/schema/`, `db/grants/` | Moyen (réseau) | Lot 1 (résilience) |
| **E-bis — RLS applicative** | **BLOQUÉ** | `SET ROLE cvc_app` = non vérifiable (`set_option=false`, N2-E8) | `grants/001_grants_rls.sql` | Moyen | Lot 4 (tests isolés) |
| **F — Paiements/GeniusPay** | **VALIDÉ** | `PAYMENT_PROVIDER` défaut `none` · mock = 6 signaux + `PAYMENT_MOCK_ACK=MOCK-TEST-ONLY` · prod bloquée (tests T2-01) · GeniusPay = **exception** · guard `SUB-` · **aucun fallback** | `paymentProviders/index.js`, `paymentService.js`, `subscriptionRoutes.js` | Faible | Lot 8 (intégration GeniusPay) |
| **G — Tests/Qualité/CI** | **PARTIEL** | **36/36 verts** (revérifié) · lint **0** · build **22/22** · **CI = 0 workflow** · T12/13/16/18 = **non exécutés** (base dédiée) · tests frontend = **inexistants** | `Backend/tests/` (5 fichiers) | Moyen | Lots 3-5 |
| **H — Réseau/Résilience** | **PARTIEL** | `min: 0` (coupures pooler éliminées) · ETIMEDOUT/ENETUNREACH **observés et transitoires** · `--dns-result-order=ipv4first` = **documenté, non appliqué** | `pool.js`, `Backend/package.json` | Moyen | Lot 1 |
| **I — Nettoyage/Dette** | **PARTIEL** | Inventaire complet (§I) : 2 variables orphelines, 20 scripts phase5j, 71 rapports, 8 headers Bearer legacy | `Backend/.env`, `scripts/`, `*.md` | Faible | Lot 6 |

## C. Inventaire des anomalies

| ID | Gravité | Domaine | Constat | Statut | Reproduction / preuve | Impact | Correction proposée (non appliquée) | Tests post-correction |
|---|---|---|---|---|---|---|---|---|
| **AN-01** | **Élevée** | Réseau/DB | Épisodes `AggregateError [ETIMEDOUT]` + `ENETUNREACH` (IPv6) vers le pooler Neon — 1res requêtes/démarrages échoués par intermittence | **Cause démontrée** (reproduit ×4) : WSL sans route IPv6 + endpoint parfois injoignable dans les timeouts | logs (`Erreur Login…ETIMEDOUT`), tests TCP (IPv4 OK / IPv6 ENETUNREACH) | 503/refus transitoires côté utilisateur | `--dns-result-order=ipv4first` (scripts) + monitoring ; retry applicatif **interdit** (fail-fast conservé) | Session longue, logs sans erreur |
| **AN-02** | Moyenne | Auth legacy | 8 lectures `localStorage.getItem('token')` pour des headers `Bearer` (Create×2, Payment, Plans, Admin×4, `client.js:54`) | **Démontré** (inoffensif : cookie prioritaire `AuthMiddleware:47`) | grep | Confusion potentielle future | Nettoyage P3 (retirer les Bearer, garder le cookie) | 36 tests + smoke auth |
| **AN-03** | Moyenne | Qualité | **Aucune CI** (`/.github/workflows` = absent) — la matrice n'est validée qu'en local | Démontré | `ls .github/workflows` = 0 | Régressions non détectées automatiquement | Workflow `node --test` + lint + build | push → pipeline vert |
| **AN-04** | Moyenne | Tests | T12 (falsification montant), T13 (double activation), T16 (404 mock inactif), T18 (503 subscribe) = **non exécutés** | Démontré (absents) | plan `BACKEND_PAYMENT_MOCK_HARDENING_PLAN.md` §6 | Parcours paiement non couverts e2e | Lot dédié sur **base de test isolée** | suites vertes sur base dédiée |
| **AN-05** | Moyenne | Sécurité DB | RLS applicative (`SET ROLE cvc_app`) **non vérifiée** — résidu N2-E8 (`set_option=false` sur Neon) | **BLOQUÉ** (accès non disponible) | rapports N2-E8 | Isolation multi-tenant non prouvée en conditions réelles | Tests isolés sur branche dédiée (jamais la prod) | policies actives sous rôle applicatif |
| **AN-06** | Faible | Dettes env | `MONGO_URI` et `NEON_MIGR_URL` = **0 consommateur code** dans `Backend/.env` | Démontré | grep | Confusion d'exploitation | Supprimer `MONGO_URI` ; décider pour `NEON_MIGR_URL` (test) | démarrage OK |
| **AN-07** | Faible | Qualité | `Backend/package.json` `test` = placeholder (`exit 1`) alors que 5 suites existent | Démontré | scripts | Découverte des tests entravée | Script `"test": "node --test tests/"` (à ajuster) | `npm test` = 36 verts |
| **AN-08** | Faible | Documentation | `.env.example` incomplets : ni `DATABASE_URL`/`PGSSL`/`PAYMENT_MOCK_ACK`, ni `ADMIN_*` | Démontré | lecture des fichiers | Installations facilitées en erreur | Compléter les deux `.env.example` (noms uniquement) | revue |
| **AN-09** | Faible | Organisation | **71 rapports `.md`** à la racine | Démontré | `ls *.md` | Lisibilité du dépôt | Archiver dans `docs/rapports/` (avec vérif. références croisées) | build OK |
| **AN-10** | Faible | UX | 2 occurrences `100vh`/`h-screen` (scroll mobile potentiel) | **Hypothèse** (non vérifié visuellement) | grep | Débordement sur petits écrans | Matrice de tests manuels (§K) | validation mobile |
| **AN-11** | Informationnelle | Auth legacy | `token`/`setToken` du contexte non alimentés (exportés mais toujours `null`) | Démontré | `AuthContext.jsx` | Confusion de lecture d'API | Retirer au nettoyage P3 | lint/build |
| **AN-12** | Informationnelle | Résidus | 1 commentaire « supabase » (`paymentProviders:49`) + 2 commentaires `/Home` (docs Login/Sign_in) | Démontré | grep | Aucun | Conserver ou reformuler (cosmétique) | — |
| **AN-13** | Faible | Scripts legacy | `scripts/phase5j/*` (20 scripts, cibles DB en dur), `phase5h/env-check.js` | Démontré | ls + grep | Risque d'exécution accidentelle sur une mauvaise base | Archiver/supprimer après confirmation | — |
| **AN-14** | Moyenne | Produit | **GeniusPay non intégré** : paiements réels impossibles (voulu, mais à ne pas oublier) | Démontré | `index.js:31-34` (exception) | Aucune vente réelle possible | Lot 8 (client, signatures, webhooks, sandbox) | sandbox e2e |
| **AN-15** | Faible | Données | Quota admin = `downloadsUsed=1` (consommé par les tests API) | Démontré | test API | Compteur à réinitialiser si besoin | `UPDATE users SET downloads_used=0` (lors d'un lot autorisé) | vérif. affichage |
| **AN-16** | Faible | Tests | Aucun compte **non-admin** de test → 403 e2e non vérifié | **BLOQUÉ** (pas de compte, création interdite en audit) | — | Parcours de refus non couvert | Créer un compte de test (lot autorisé) | 403 observé |
| **AN-17** | **Élevée** | Validation | **Aucun test navigateur** de tout le projet (login, CV, PDF, admin, responsive) | Démontré (aucun navigateur installé) | `which chromium…` = 0 | Comportement réel inconnu | **Lot 3 : campagne manuelle** (matrice §K) | matrice complète |
| **AN-18** | Faible | Git | 7 suppressions **staged** (vite.config, index.html, App.jsx, main.jsx, ProtectedRoute, vercel.json, Adminhome) à valider au commit | Démontré | `git diff --cached` | Confusion au commit | Valider explicitement au commit de consolidation | revue diff |
| **AN-19** | **Élevée** | Git | **83 non suivis / 40 modifiés non commités** — tout l'acquis est fragile (une erreur = perte) | Démontré | `git status` | Perte de travail | **Commit de consolidation** (quand autorisé) | build + tests sur le commit |

## D. Résultats des tests (revérifiés pendant cet audit)

| Commande | Code de sortie | Résultat |
|---|---|---|
| `cd Backend && node --test tests/lot1b-subscribe-guard.test.mjs` | 0 | **5/5** (pass 5, fail 0) |
| `node --test tests/lot2-payment-mock-ack.test.mjs` | 0 | **15/15** |
| `node --test tests/lot3-payment-config-hardening.test.mjs` | 0 | **8/8** |
| `node --test tests/lot4-provider-independence.test.mjs` | 0 | **3/3** |
| `node --test tests/paymentProvider.policy.test.mjs` | 0 | **5/5** |
| **TOTAL backend** | 0 | **36/36** (durée ≈ 150 ms/suite) |
| `npm run lint` (racine) | **0** | 0 erreur |
| `npm run build` (racine) | **0** | `✓ Generating static pages (22/22)` |

**Effets secondaires compris** : `next build` régénère `.next/` (non suivi) — aucun fichier de travail touché.
**Non exécutés** : tout test **navigateur** (aucun installé) · T12/T13/T16/T18 (base dédiée requise — **BLOQUÉ**) · tests 403 non-admin (compte absent — **BLOQUÉ**) · RLS `SET ROLE cvc_app` (**BLOQUÉ**, `set_option=false`) · tests frontend (**inexistants**).

## E. Inventaire Git final

| Repère | Initial (début audit) | Final (cet audit) |
|---|---|---|
| `git status --short` | `5 D / 40 M / 83 ?? / 7 D` | `5 D / 40 M / 84 ?? / 7 D` (+1 = **ce rapport**) |
| Branch | `dev` | `dev` |

**Vérifié** : **aucun fichier de code/config/test modifié, créé (hors ce rapport), déplacé ou supprimé** par cet audit · les 7 suppressions staged et tous les non suivis sont intacts · aucune opération git destructive · aucune écriture en base · aucun compte/plan/quota modifié · aucun paiement · aucune valeur secrète affichée (URLs et identifiants masqués).

## F. Plan de remédiation proposé (par lots, sans exécution)

| # | Lot | Périmètre | Dépendances | Risques | Critères de validation |
|---|---|---|---|---|---|
| **1** | **Sécurité & résilience réseau** | AN-01 : option `ipv4first` (scripts), monitoring ETIMEDOUT | — | Faible (option DNS) | Session longue sans erreur ; logs propres |
| **2** | **Parcours bloquants** | AN-16 : compte de test non-admin → valider 403 e2e | création de données de test | Faible | 403 observé sur routes admin |
| **3** | **Tests de bout en bout** | AN-17/AN-10 : campagne navigateur (matrice §K : login/logout, CV/PDF, admin, responsive) | environnement navigateur | Moyen (temps) | Matrice 100 % cochée |
| **4** | **Intégrité DB / RLS** | AN-05 : tests RLS applicative sur **branche isolée** (jamais la prod) | accès Neon dédié | Moyen | Policies actives sous `cvc_app` |
| **5** | **Qualité & CI** | AN-03/AN-04/AN-07 : workflow CI, script `npm test`, T12/13/16/18 (base dédiée), tests frontend initiaux | base de test | Moyen | Pipeline vert + suites e2e |
| **6** | **Nettoyage legacy** | AN-02/AN-06/AN-09/AN-11/AN-12/AN-13 : Bearer/localStorage, variables orphelines, 71 rapports → `docs/rapports/`, scripts phase5j/h, `Adminhome` (déjà supprimé) | revue | Faible | lint/build/tests verts |
| **7** | **Préparation production** | AN-08/AN-18/AN-19 : `.env.example`, checklist déploiement (variables Vercel, `DATABASE_URL` sans sslmode + `PGSSL`), **commit de consolidation** (valider les 7 staged) | décision | Moyen | Build prod + smoke prod |
| **8** | **GeniusPay** | AN-14 : client/API, signatures, webhooks vérifiés, idempotence, sandbox | clés fournisseur | Élevé (financier) | Sandbox e2e sans fallback mock |

## Matrice de tests manuels (Phase K — pour le Lot 3)

| Page | Scénarios desktop | Scénarios mobile |
|---|---|---|
| Landing `/` | navbar visiteur, liens Footer, CTA | menu burger, débordements |
| Login/Inscription | validation, erreurs, redirections `?from=` | clavier virtuel, champs |
| `/models` → `/create?template=` | 11 modèles, aperçu, édition, sauvegarde locale | scroll colonnes (viewport `lg+`) |
| Téléchargement PDF | bouton → quota → impression (nom/format fichier) | idem |
| `/admin` (dashboard, users, plans) | CRUD plans (validation, 403), users (recherche) | tableaux lisibles |
| Déconnexion | → landing, navbar visiteur, `/admin` bloqué | idem |
| **Spécifique** | 2× `100vh` (AN-10) : vérifier les hauteurs d'écran | débordements et scroll imbriqué |

---

**→ AUDIT TERMINÉ. Aucune anomalie corrigée, aucun résidu supprimé, aucun rapport déplacé, aucun commit, aucun déploiement. ATTENTE DE VOTRE ANALYSE ET AUTORISATION EXPLICITE avant toute remédiation.**
| **J — Prépa production** | **PARTIEL** | Scripts `dev`(watch)/`start` · exigences variables connues · `.env.example` **incomplets** · `test` backend = placeholder | `package.json`, `Backend/package.json`, `.env.example` | Moyen | Lot 7 |
| **K — Responsive/UX** | **NON TESTÉ** | 162 breakpoints · 22 `overflow` · 2× `100vh` (à surveiller) · 13 `aria/alt` — **aucune validation visuelle** | `src/components/` | Moyen | Lot 3 (matrice manuelle §K) |