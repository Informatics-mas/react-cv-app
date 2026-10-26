# 🚀 Plan de refonte CV.CRAFT — Vite/React-Router → Next.js (App Router)

> **Statut** : PLAN VALIDÉ À RELIRE avant toute exécution.
> **Objectif** : migrer le frontend (Vite + React Router 7) vers Next.js 15 (App Router),
> **sans toucher au backend Express** (`/Backend`), qui continue de tourner séparément.

---

## 0. Contexte & principes directeurs

**Architecture actuelle**
- Frontend : Vite 7 + React 19 + React Router 7 + Tailwind CSS 4 + `react-to-print` + `sweetalert2`
- Backend : Express/Mongoose séparé (`/Backend`), JWT, cron, multer, Gemini AI
- Auth : token JWT dans `localStorage` (`token`, `adminToken`, `userRole`) + `AuthContext` (appel `/auth/me`)
- Déploiement : Vercel (`vercel.json` avec rewrite SPA)

**Architecture cible**
- Next.js 15 App Router (JavaScript, pas de TS pour l'instant — cohérent avec le codebase actuel)
- Même backend Express (inchangé), appelé via `NEXT_PUBLIC_API_URL`
- Même design, mêmes templates, mêmes composants (90 % du JSX réutilisable)

**Principes**
1. Ne jamais casser le comportement utilisateur existant (routes, auth, impression PDF)
2. Migrer d'abord en **client components** (`"use client"`) pour minimiser le risque,
   puis optimiser en Server Components plus tard (SEO pages publiques)
3. Le backend reste la source de vérité (comme aujourd'hui)
4. Redirections temporaires pour les anciennes URLs (compatibilité liens existants)

---

## 1. Étape 0 — Préparation (sans risque)

- [ ] Créer une branche git dédiée : `git checkout -b refonte/nextjs` depuis `dev`
- [ ] Vérifier que le backend tourne (`cd Backend && npm run dev` → port 5000)
- [ ] Backend : **aucune modification**, sauf si le domaine front change →
      mettre à jour `FRONTEND_URL` dans `Backend/.env` (CORS) et `origin` CORS
      (localhost:5173 → localhost:3000)
- [ ] Sauvegarder une référence de l'état actuel (tag git `pre-nextjs`)

---

## 2. Étape 1 — Scaffolding Next.js

### 2.1 Dépendances
- [ ] Ajouter : `next` (dernière stable), garder `react`, `react-dom`
- [ ] Supprimer : `vite`, `@vitejs/plugin-react`, `react-router-dom`, `eslint-plugin-react-refresh`
- [ ] Garder : `lucide-react`, `react-icons`, `react-to-print`, `sweetalert2`,
      `tailwindcss@4`, `@tailwindcss/postcss`, `autoprefixer`, `postcss`

### 2.2 Scripts `package.json`
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### 2.3 Fichiers de config
- [ ] Supprimer : `vite.config.js`, `index.html`, `vercel.json` (le routage SPA n'est plus nécessaire)
- [ ] Créer `next.config.js` (vide au départ + redirections de l'étape 5)
- [ ] Adapter `postcss.config.js` : `@tailwindcss/postcss` (inchangé, déjà compatible)
- [ ] ESLint : passer à la config Next (`next/core-web-vitals`) — remplacer `eslint.config.js`
- [ ] `.env` : `VITE_API_URL=http://localhost:5000/api` → `NEXT_PUBLIC_API_URL=http://localhost:5000/api`
      (+ `.env.example` en conséquence)
- [ ] Mettre à jour `src/api/client.js` : `import.meta.env.VITE_API_URL` → `process.env.NEXT_PUBLIC_API_URL`

### 2.4 Structure de base
```
app/
├── layout.jsx      ← layout racine (Navbar + <main> scroll + Footer + AuthProvider)
├── page.jsx        ← page d'accueil (Home)
├── globals.css     ← import des styles globaux (App.css, index.css...)
└── favicon.svg     ← déplacé depuis public/ (ou metadata icons)
```

---

## 3. Étape 2 — Mapping des routes (React Router → App Router)

| Route actuelle | Composant | Accès | Fichier Next.js cible |
|---|---|---|---|
| `/` | `Home` | public | `app/page.jsx` |
| `/login` | `Login` | public | `app/login/page.jsx` |
| `/sign-in` | `Signin` | public | `app/sign-in/page.jsx` |
| `/Create` | `Create` | public | `app/create/page.jsx` |
| `/Models` | `Models` | public | `app/models/page.jsx` |
| `/Plan` | `PlanCards` | public | `app/plan/page.jsx` |
| `/FAQ` | `FAQ` | public | `app/faq/page.jsx` |
| `/privacy` | `Privacy` | public | `app/privacy/page.jsx` |
| `/Terms` | `Terms` | public | `app/terms/page.jsx` |
| `/about` | `About` | public | `app/about/page.jsx` |
| `/Home` | `Home2` | user+admin | `app/(protected)/home/page.jsx` |
| `/Plans` | `PlanCards` | user+admin | `app/(protected)/plans/page.jsx` |
| `/payment` | `Payment` | user+admin | `app/(protected)/payment/page.jsx` |
| `/Admin` | `Adminhome` (dashboard) | admin | `app/admin/page.jsx` |
| `/Admin/users` | `UserManager` | admin | `app/admin/users/page.jsx` |
| `/Admin/subscriptions` | `SubscriptionManager` | admin | `app/admin/subscriptions/page.jsx` |
| `/Admin/plans` | `AdminPlans` | admin | `app/admin/plans/page.jsx` |
| `/Admin/mailer` | `Placeholder` | admin | `app/admin/mailer/page.jsx` |
| `/AdminPlans` | redirect `/Admin/plans` | admin | redirection `next.config.js` |
| `*` (404) | redirect `/` | public | `app/not-found.jsx` |

**Notes importantes**
- `Adminhome.jsx` contient un routeur imbriqué (`Routes` interne avec sidebar) →
  le découper : la sidebar devient `app/admin/layout.jsx`, chaque sous-route une page
- Tous les composants migrés démarrent en **Client Components** (`"use client"` en tête)
- Remplacer :
  - `Link` (react-router) → `Link` (`next/link`)
  - `useNavigate()` → `useRouter()` (`next/navigation`)
  - `useLocation()` → `usePathname()` / `useSearchParams()`
  - `window.location.href = "/login"` → `router.replace("/login")`

---

## 4. Étape 3 — Authentification (le chantier le plus délicat)

### 4.1 Problème
`AuthContext`, `ProtectedRoute`, `Create`, `Models`… lisent `localStorage` **pendant le rendu**.
En Next.js, le premier rendu se fait côté serveur → `localStorage is not defined` / hydration mismatch.

### 4.2 Solution phase 3a (obligatoire — sans changer la sémantique)
- [ ] `AuthContext` : initialiser `token`/`role` à `null` côté serveur,
      lire `localStorage` dans un `useEffect` après montage (+ state `mounted`)
- [ ] Pattern hydratation-safe partout où `localStorage` est lu au rendu :
  ```jsx
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // ou un loader
  ```
- [ ] Remplacer `ProtectedRoute` par des **layouts gardés** :
  - `app/(protected)/layout.jsx` : vérifie token + rôle (équivalent `allowedRoles=['user','admin']`)
    → sinon `router.replace('/login')` / `/home`
  - `app/admin/layout.jsx` : vérifie rôle admin → sinon redirection
- [ ] `app/layout.jsx` : englober dans `<AuthProvider>` (avec Navbar/Footer comme aujourd'hui)

### 4.3 Solution phase 3b (durcissement recommandé — à faire après la 3a)
- [ ] Déplacer le token du `localStorage` vers un **cookie** (`httpOnly` idéalement, sinon cookie simple)
- [ ] Créer `middleware.ts` à la racine : vérifie la présence/validité du cookie JWT
      pour `/home`, `/plans`, `/payment`, `/admin/*` → vraie protection côté edge
- [ ] Vérification de signature JWT avec `jose` (compatible Edge Runtime)
- [ ] Adapter : `Login.jsx`, `Sign_in.jsx`, `api/client.js`, `utils/authStorage.js`, `clearAuthStorage()`

---

## 5. Étape 4 — Points techniques spécifiques

### 5.1 Impression PDF (`react-to-print`)
- [ ] `Create.jsx` utilise `useReactToPrint` → incompatible SSR
- [ ] Charger la page Create en **dynamic import avec `ssr: false`** :
  ```jsx
  // app/create/page.jsx
  const Create = dynamic(() => import('@/components/Create'), { ssr: false });
  ```
- [ ] Vérifier que le titre du document (`CV_...`) et le flow quota (`/downloads/authorize` → `handlePrint()`)
      fonctionnent à l'identique

### 5.2 Passage d'état entre pages (`Payment`)
- [ ] `Payment.jsx` lit `location.state.plan` → le remplacer par **searchParams** :
      `/payment?plan=Basic`
- [ ] `Plans.jsx` : le lien vers payment devient `router.push('/payment?plan=' + plan.name)`
- [ ] Garder la sécurité existante (redirection si pas de plan) avec `useSearchParams`

### 5.3 Styles
- [ ] Importer les CSS globaux (`App.css`, `index.css`, etc.) dans `app/globals.css` ou `app/layout.jsx`
- [ ] Layout racine : reproduire la structure scroll existante
      (`h-dvh flex flex-col overflow-hidden` + `<main class="flex-1 min-h-0 overflow-y-auto">`),
      Navbar en slot fixe, Footer en bas de `<main>` comme aujourd'hui
- [ ] Vérifier `tailwind.config.js` (content paths → `./app/**/*.{js,jsx}`, `./src/**/*.{js,jsx}`)

### 5.4 Divers
- [ ] `public/` reste le dossier d'assets publics (favicon.svg, etc.)
- [ ] Le dossier `Backend/` reste à la racine : Next.js l'ignore totalement (aucun conflit, aucun déplacement)
- [ ] `sweetalert2` : client only (OK — toutes les pages qui l'utilisent sont client)
- [ ] Rechercher tous les liens codés en dur (`/Admin`, `/Create`, etc.) et les adapter en minuscules

---

## 6. Étape 5 — Redirections de compatibilité (middleware.js)

> **⚠️ Piège découvert en validation** : les `redirects()` de `next.config.js`
> matchent **insensible à la casse** — `/Home → /home` redirigeait donc `/home`
> vers lui-même en **boucle infinie** (308 permanent). Les redirections des
> anciennes URLs (avec majuscules) doivent vivre dans **`middleware.js`**, avec
> une correspondance **strictement sensible à la casse**.

```js
// middleware.js (à la racine)
import { NextResponse } from "next/server";

const LEGACY_ROUTES = {
  "/Create": "/create",
  "/Models": "/models",
  "/Plan": "/plan",
  "/FAQ": "/faq",
  "/Terms": "/terms",
  "/Home": "/home",
  "/Plans": "/plans",
  "/Privacy": "/privacy",
  "/About": "/about",
  "/AdminPlans": "/admin/plans",
};

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // /Admin et /Admin/* → /admin et /admin/* (la suite du chemin est conservée)
  if (pathname === "/Admin" || pathname.startsWith("/Admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/Admin/, "/admin");
    return NextResponse.redirect(url, 308);
  }

  const destination = Object.hasOwn(LEGACY_ROUTES, pathname)
    ? LEGACY_ROUTES[pathname]
    : null;
  if (destination) {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.svg|.*\\..*).*)"],
};
```

---

## 7. Étape 6 — Validation (check-list avant merge)

- [ ] `npm run build` passe sans erreur (hydratation incluse)
- [ ] `npm run lint` passe
- [ ] `npm run dev` (port 3000) + backend (port 5000) :
  - [ ] Toutes les routes publiques s'affichent (Home, Login, Sign-in, Create, Models, Plan, FAQ, Privacy, Terms, About)
  - [ ] Login → redirection `/home`, Sign-in → redirection `/home`
  - [ ] Accès protégés : non connecté sur `/home` → redirigé vers `/login`
  - [ ] Un `user` qui tente `/admin` → redirigé vers `/home`
  - [ ] Admin : dashboard, users, subscriptions, plans, mailer fonctionnels
  - [ ] Flow complet : choix template → Create → impression PDF (`react-to-print`) → quota décrémenté
  - [ ] Flow paiement : `/plans` → `/payment?plan=X` → abonnement → rôle mis à jour dans Navbar
  - [ ] Déconnexion propre (purge localStorage, redirection)
  - [ ] 404 inconnue → redirection accueil (ou not-found)
  - [ ] Anciennes URLs (avec majuscules) → redirigées correctement
- [ ] Test responsive mobile (le layout h-dvh + scroll doit rester identique)

---

## 8. Étape 7 — Déploiement Vercel

- [ ] Supprimer `vercel.json` (plus de rewrite SPA nécessaire)
- [ ] Dans Vercel → Settings → Environment Variables : `NEXT_PUBLIC_API_URL` (URL du backend déployé)
- [ ] Backend : vérifier `FRONTEND_URL` (CORS) avec le nouveau domaine si changement
- [ ] `git push` branche → preview Vercel → tests complets sur la preview
- [ ] Merge dans `dev` après validation

---

## 9. Risques & points de vigilance

| Risque | Mitigation |
|---|---|
| `localStorage` au rendu (erreurs SSR / hydration) | Pattern `mounted` + `"use client"` systématique (étape 3a) |
| `react-to-print` incompatibilité SSR | `dynamic(..., { ssr: false })` pour la page Create |
| Liens codés en dur avec majuscules | Recherche globale + redirections `next.config.js` |
| `location.state` perdu entre pages | `searchParams` pour Payment (étape 5.2) |
| Sécurité des routes admin côté serveur | Phase 3b : cookies + `middleware.ts` (le backend reste l'autorité finale) |
| Perte de comportement du scroll layout | Reproduire exactement la structure `h-dvh` dans `layout.jsx` |

## 10. Optimisations futures (post-migration, optionnel)

- [ ] Pages publiques statiques (Home, About, FAQ, Privacy, Terms) en **Server Components** (SEO)
- [ ] Fusion du backend Express en **Route Handlers / API Routes** Next.js (cron → Vercel Cron)
- [ ] Passage en TypeScript progressif
- [ ] Migration des 11 templates de CV en Server Components (ils sont purement présentatifs)

---

### Estimation d'effort (ordre de grandeur)

| Phase | Effort estimé |
|---|---|
| Étape 0-1 (scaffolding) | 1-2 h |
| Étape 2 (routes) | 2-4 h |
| Étape 3a (auth hydratation) | 2-3 h |
| Étape 4 (print, payment, styles) | 2-3 h |
| Étape 5-6 (redirections + validation) | 1-2 h |
| Étape 3b (cookies + middleware) | 2-3 h (optionnel mais recommandé) |
| **Total** | **~1 à 2 jours de travail** |


