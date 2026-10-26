# CV.CRAFT — Générateur de CV

Application web de création et d'impression de CV (PDF) : **frontend Next.js 15 (App Router)** + **backend Express** autonome, avec authentification JWT, IA (Google Gemini), abonnements/paiements et envoi d'e-mails.

| Couche | Stack | Dossier | Port dev |
|---|---|---|---|
| Frontend | Next.js 15 + React 19 + Tailwind CSS 4 | `/` (racine) | **3000** |
| Backend | Express 5 + Mongoose/PostgreSQL + JWT | `/Backend` | **5000** |

> 📖 Historique de la migration Vite → Next.js : voir [`MIGRATION_NEXTJS.md`](./MIGRATION_NEXTJS.md).
> 📖 Cutover base de données (MongoDB ↔ PostgreSQL) : voir [`Backend/db/CUTOVER-ROLLBACK.md`](./Backend/db/CUTOVER-ROLLBACK.md).

---

## Prérequis

- **Node.js ≥ 18.18** (recommandé : 20 LTS ou plus)
- **npm ≥ 9**
- Une base de données :
  - **MongoDB** (local ou Atlas) — driver par défaut (`DATABASE_DRIVER=mongo`), ou
  - **PostgreSQL / Supabase** (`DATABASE_DRIVER=postgres`) + `DATABASE_URL`
- (Optionnel) une clé API **Google Gemini** pour les fonctionnalités IA
- (Optionnel) un compte **SMTP** (ex. Gmail) pour les e-mails

---

## Installation

```bash
# 1. Cloner le dépôt
git clone git@github.com:Informatics-mas/react-cv-app.git
cd react-cv-app

# 2. Installer les dépendances du FRONTEND (racine)
npm install

# 3. Installer les dépendances du BACKEND
cd Backend
npm install
cd ..
```

---

## Configuration (variables d'environnement)

### Frontend — `.env` à la racine

Copier le modèle puis adapter :

```bash
cp .env.example .env
```

| Variable | Description | Exemple |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL de base de l'API backend (exposée au navigateur) | `http://localhost:5000/api` |
| `JWT_SECRET` | Vérification JWT côté middleware Edge — **strictement identique** à celui du Backend (jamais exposé au navigateur) | `change_me` |

### Backend — `Backend/.env`

Copier le modèle puis adapter :

```bash
cp Backend/.env.example Backend/.env
```

| Variable | Description | Exemple |
|---|---|---|
| `PORT` | Port du serveur Express | `5000` |
| `MONGO_URI` | URI MongoDB | `mongodb://localhost:27017/cv-craft` |
| `JWT_SECRET` | Secret JWT (**à renouveler** : `openssl rand -hex 64`) — doit être identique au front | `change_me` |
| `GEMINI_API_KEY` | Clé API Google Gemini (IA) | `change_me` |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_SECURE` / `EMAIL_USER` / `EMAIL_PASS` | SMTP pour Nodemailer | `smtp.gmail.com` / `587` / `false` / … |
| `CLIENT_URL` / `FRONTEND_URL` | URL du frontend (liens dans les e-mails / CORS) | `http://localhost:3000` |
| `DATABASE_DRIVER` | `mongo` (défaut, référence) ou `postgres` | `mongo` |
| `DATABASE_URL` | Chaîne PostgreSQL (obligatoire si `DATABASE_DRIVER=postgres`) | `postgresql://…` |
| `PGSSL` | `require` en prod Supabase, vide en local | `require` |
| `COOKIE_DOMAIN` | Domaine du cookie httpOnly (vide en dev ; ex. `.exemple.com` en prod) | `.exemple.com` |
| `TRUST_PROXY` | Sauts de reverse proxy à faire confiance (ex. `1` derrière nginx) | `1` |

---

## Lancer l'application

**Deux terminaux sont nécessaires** (backend + frontend) :

### Terminal 1 — Backend (port 5000)

```bash
cd Backend
npm run dev      # mode développement avec rechargement automatique (node --watch)
# ou : npm start # mode production
```

### Terminal 2 — Frontend (port 3000)

```bash
npm run dev      # développement → http://localhost:3000
```

Puis ouvrir **http://localhost:3000** dans le navigateur.

### Commandes disponibles

| Commande | Dossier | Rôle |
|---|---|---|
| `npm run dev` | racine | Serveur de dev Next.js (`next dev`) → http://localhost:3000 |
| `npm run build` | racine | Build de production Next.js |
| `npm start` | racine | Sert le build de production (`next start`) |
| `npm run lint` | racine | Vérification ESLint du code |
| `npm run dev` | `Backend/` | Serveur Express avec rechargement auto (`node --watch`) |
| `npm start` | `Backend/` | Serveur Express en production (`node server.js`) |

---

## Structure du projet

```
react-cv-app/
├── app/                  # Pages Next.js (App Router)
│   ├── (protected)/      #   Routes authentifiées (create, admin…)
│   ├── login/ sign-in/   #   Authentification
│   ├── about/ faq/ …     #   Pages publiques
│   └── layout.jsx        #   Layout global
├── src/                  # Composants, contexte, API client, utilitaires
├── middleware.js         # Redirections legacy + vérification JWT (Edge)
├── public/               # Assets statiques
├── Backend/              # API Express autonome (voir Backend/.env.example)
│   ├── server.js         #   Point d'entrée (charge loadEnv.js en premier)
│   ├── Routes/           #   Auth, users, plans, subscriptions, stats, downloads
│   ├── Models/           #   Schémas Mongoose
│   ├── db/               #   Double driver : MongoDB / PostgreSQL (+ repositories)
│   └── utils/            #   Services (e-mails…)
├── scripts/              # Migration de données (Mongo → Postgres) et scripts d'ops
├── MIGRATION_NEXTJS.md   # Historique de la migration Vite → Next.js
└── .env.example          # Modèle de config frontend
```

---

## Déploiement (notes)

- **Frontend** : déployable sur Vercel. Définir dans les settings les variables
  `NEXT_PUBLIC_API_URL` (URL publique du backend) et `JWT_SECRET` (inlinée au build
  du middleware — identique au backend).
- **Backend** : n'importe quel hébergeur Node. Renseigner `FRONTEND_URL` /
  `CLIENT_URL` avec l'URL finale du front (CORS + liens e-mails) et
  `COOKIE_DOMAIN` si front et back partagent un même domaine.

## Scripts d'administration / migration

- `scripts/migrate/` : extraction, transformation et validation pour la migration
  MongoDB → PostgreSQL (voir `scripts/migrate/README.md`).
- `scripts/phase5h|phase5i|phase5j/` : audit utilisateurs, purge, tests API,
  vérification d'env, etc.
