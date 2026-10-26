# LOT 3 — SÉCURITÉ, RLS ET TESTS D'INTÉGRATION — RAPPORT D'AUDIT (LECTURE SEULE)

**Date :** 26/10/2026 · Aucun rôle, privilège, politique, compte ou donnée modifié · aucune migration · aucun paiement.

---

## 1. Résumé exécutif
Les contrôles d'autorisation **côté application** sont solides (`protect` = vérification JWT, `adminOnly` sur toutes les routes sensibles, **401/403 distincts**). Le dispositif **RLS de la base** est complet dans les migrations (**26 politiques, 6 `ENABLE RLS`**, rôles à moindres privilèges) mais **non vérifié en exécution** (blocage `SET ROLE cvc_app`, `set_option=false`, N2-E8). Les tests T12/T13/T16/T18 **n'existent pas exécutablement** et exigent une base dédiée absente → **BLOQUÉS**. **Statut : PARTIEL** (3 points bloqués).

## 2. Statut des vérifications

| Vérification | Statut | Résultat |
|---|---|---|
| `protect` | **VALIDÉ** | `AuthMiddleware.js` : `jwt.verify` (HS256), cookie **ou** Bearer (l.47), 401/503 distingués |
| `adminOnly` + routes | **VALIDÉ** | `userRoutes` GET/DELETE · `PlanRoutes` POST/PUT/DELETE · `/dev/simulate` = `adminOnly` · `GET /plans` = public (volontaire) |
| Propriété des ressources | **VALIDÉ** | `/notifications` mock = proprio ou admin · `downloads/authorize` = `protect` |
| Réponses 401/403/réseau | **VALIDÉ** | jamais confondues (corrections des lots précédents revérifiées) |
| Tests de rôles | **PARTIEL** | 36 tests = politique paiement ; aucun unitaire dédié `adminOnly` (couvert par code + smoke API) |
| Procédure non-admin | **BLOQUÉ** | aucun compte disponible ; **création interdite** ici (procédure §6) |
| RLS (migrations) | **VALIDÉ** (statique) | `grants/001_grants_rls.sql` : **26 `CREATE POLICY`**, **6 `ENABLE RLS`** ; `GRANT USAGE → cvc_migr, cvc_app, cvc_admin` ; `cvc_migr`=CREATE · `cvc_app`=SELECT/INSERT + UPDATE partiel (payments.status, quotas users) — **moindres privilèges** |
| **RLS applicative (`SET ROLE cvc_app`)** | **BLOQUÉ** | `set_option=false` sur Neon (N2-E8) → **impossible de valider les policies en conditions d'application** sans modifier l'option (interdit) |
| T12 / T13 / T16 | **BLOQUÉ** | **inexistants** (0 occurrence dans `Backend/tests/`) — définis seulement dans le plan · base dédiée absente |
| T18 | **BLOQUÉ** | 1 occurrence = **commentaire** (lot1b) — aucun test exécutable · nécessite base isolée |

## 3. Fichiers concernés
`Backend/Middleware/AuthMiddleware.js` · `Backend/Routes/{userRoutes,PlanRoutes,paymentMockRoutes,AuthRoute,subscriptionRoutes}.js` · `Backend/db/grants/001_grants_rls.sql` · `Backend/db/schema/*` · `Backend/tests/*` · plan `BACKEND_PAYMENT_MOCK_HARDENING_PLAN.md`.

## 4. Commandes réellement exécutées
| Commande | Sortie | Résultat |
|---|---|---|
| `node /tmp/audit-lots.mjs` | 0 | `RLS_POLICIES=26 ENABLE_RLS=6` · `ROLES_SQL=cvc_migr,cvc_app,cvc_admin,…` · `PROTECT=1 ADMINONLY=1` · `T12=0 T13=0 T16=0 T18=1(commentaire)` |

## 5. Preuves et résultats
- **Faits** : architecture à deux niveaux (app = JWT + rôles ; DB = RLS + grants) — tous deux **présents et documentés** ; seul le niveau 3 (validation du RLS **en exécution**) manque.
- **Faits** : T12/T13/T16/T18 = **spécifications** (matrice du plan §6), pas du code exécutable ; T18 déjà cité en commentaire (lot1b) comme non exécutable ici.
- **Hypothèse** : les politiques se comporteraient correctement sous `cvc_app` — **non prouvé**.

## 6. Procédure sûre pour tester un utilisateur non-admin (planifiée, non exécutée)
1. **Branche Neon dédiée** (jamais la prod) : créer un compte `role='user'`.
2. Avec son cookie : `GET /users` → **403** ; `POST /plans` → **403** ; `/admin` → redirect `/home`.
3. Détruire compte et branche de test.
→ **Non exécuté** (création de compte interdite + base dédiée absente).

## 7. Analyse du problème RLS (N2-E8)
| | Détail |
|---|---|
| **Établi** | 26 policies + grants existent ; l'app se connecte via `DATABASE_URL` (rôle probablement privilégié) → **le RLS peut ne pas s'appliquer** si le rôle applicatif ≠ `cvc_app` |
| **Hypothétique** | Le comportement réel des policies sous `cvc_app` ; l'utilité d'un `SET ROLE`/`set_config` par requête |
| **Tests isolés nécessaires** | Branche dédiée : `SET ROLE cvc_app` (si `set_option` y est permis) ou connexion user `cvc_app` → vérifier SELECT/INSERT/UPDATE selon policies + tentatives interdites |
| **Risques sur la prod** | Tests d'écriture = **dégâts réels** ; `SET ROLE` = exposition possible → **INTERDIT** ; branche isolée **obligatoire** |

## 8. Risques identifiés
- **AN-05 (élevé)** : isolation multi-tenant **non prouvée** en exécution.
- **AN-04 (moyen)** : parcours paiement (montant falsifié, double activation, 404 mock, 503 sans mock) non couverts par des tests exécutables.
- **AN-16 (faible)** : 403 non-admin non vérifié e2e.

## 9. Corrections recommandées (non appliquées)
1. Branche **isolée** + script de test RLS (`SET ROLE cvc_app` ou user dédié).
2. Écrire T12/T13/T16/T18 (base dédiée, compteurs d'écriture vérifiés).
3. Compte de test non-admin (lot autorisé) pour les 403 e2e.

## 10. Critères de validation d'un futur lot
- RLS : sous `cvc_app`, autorisées = OK, interdites = échec (matrice).
- T12/T13/T16/T18 verts sur base dédiée, **0 écriture** hors périmètre.
- 403 observé sur `/users` et `/plans` (compte non-admin).

**STATUT DU LOT 3 : PARTIEL — RLS applicative et tests d'intégration BLOQUÉS (base dédiée + accès `SET ROLE` requis).**
| `grep GRANT` sur `001_grants_rls.sql` | 0 | grants détaillés (moindres privilèges) |
| 5 suites unitaires (effets vérifiés : env injecté, 0 écriture) | 0 | 36/36 — aucun compte/donnée touché |