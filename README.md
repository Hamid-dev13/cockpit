# Cockpit

Application personnelle de suivi de candidatures, avec un copilote IA (Mistral) et un radar de relance.

Le principe : ce n'est pas un tableur de plus. L'application met en avant ce qu'il faut faire maintenant (entretien a preparer, relance a envoyer) et laisse l'IA resumer les offres, rediger les relances et repondre a des questions sur le pipeline.

## Fonctionnalites

- Suivi des candidatures par statut : Wishlist, Postule, Entretien, Offre, Refuse.
- Radar de momentum : chaque candidature refroidit avec l'inactivite (vert vers rouge), pour reperer le risque de ghosting.
- Zone "Aujourd'hui" : actions prioritaires mises en avant (entretien a preparer, relance recommandee).
- Copilote IA (raccourci Cmd/Ctrl+K) : questions en langage naturel sur le pipeline.
- Coller une offre : extraction automatique des informations (entreprise, poste, stack, remuneration, localisation, type de contrat, teletravail, seniorite, infos entreprise) depuis un texte ou une URL publique.
- Saisie manuelle : pour les candidatures spontanees, avec nature (offre / spontanee / reseau) et canal (email / telephone / formulaire / LinkedIn / autre).
- Actions IA par candidature : rediger une relance, preparer un entretien, resumer l'offre.
- Description du poste editable et journal de notes par candidature.
- Theme clair par defaut, bascule en theme sombre.
- Authentification multi-utilisateur : inscription / connexion, sessions par tokens (access + refresh rotatif), candidatures privees par compte, accueil personnalise au prenom.

## Stack technique

- Next.js 14 (App Router) et React 18
- TypeScript
- Tailwind CSS
- Prisma ORM avec PostgreSQL
- API Mistral pour les fonctionnalites IA
- lucide-react (icones), next-themes (theme clair/sombre)
- Authentification maison : jose (JWT) et bcryptjs (hash des mots de passe)
- Docker et Docker Compose (dev et prod)

## Architecture

Le code est separe par responsabilite.

```
app/
  layout.tsx, page.tsx, providers.tsx   Entree Next.js et theme
  globals.css                           Variables de theme et styles de base
  api/
    auth/                               Inscription, connexion, refresh, me, logout
    ai/route.ts                         IA : extraction, copilote, redaction
    candidatures/route.ts               Liste et creation
    candidatures/[id]/route.ts          Mise a jour et suppression

lib/
  types.ts                              Types partages
  status.ts                             Constantes statut / nature / canal
  momentum.ts                           Calcul du radar de momentum
  format.ts                             Helpers d'affichage
  api.ts                                Appels HTTP cote client (refresh auto sur 401)
  db.ts                                 Client Prisma et serialisation
  mistral.ts                            Appel a l'API Mistral
  auth.ts                               Tokens (JWT + refresh rotatif), hash, cookies

hooks/
  useCandidatures.ts                    Etat et logique metier (CRUD, toasts)
  useAuth.tsx                           Contexte d'authentification (session)

components/
  cockpit/                              Orchestrateur et composants de presentation
  auth/                                 AuthGate, AuthScreen (connexion / inscription)

prisma/
  schema.prisma                         Schema de la base (User, RefreshToken, Candidature)
```

Principe : `lib/` est pur (sans React), les hooks portent la logique d'etat, et les composants ne font que du rendu.

## Prerequis

- Node.js 20 ou superieur
- Une base PostgreSQL (ou Docker pour en lancer une, voir la section Docker)
- Une cle API Mistral (https://console.mistral.ai)
- Docker et Docker Compose (pour les environnements conteneurises)

## Demarrage en local

```bash
npm install
cp .env.example .env.local        # secrets : MISTRAL_API_KEY, AUTH_SECRET
# Postgres requis. Le plus simple : "make up" lance l'app + Postgres ensemble.
# Sinon, fournis un Postgres, mets sa DATABASE_URL dans .env, puis :
npx prisma db push                # cree les tables dans Postgres
npm run dev                       # http://localhost:3000
```

## Variables d'environnement

| Variable           | Fichier      | Description                                              |
| ------------------ | ------------ | ------------------------------------------------------- |
| `MISTRAL_API_KEY`  | `.env.local` | Cle API Mistral. Lue uniquement cote serveur.           |
| `MISTRAL_MODEL`    | `.env.local` | Optionnel. Defaut : `mistral-small-latest`.             |
| `READER_URL`       | `.env.local` | Optionnel. Reader externe pour scraper les URL d'offres (rend le JS, anti-bot). Defaut : `https://r.jina.ai/`. `""` pour desactiver. |
| `JINA_API_KEY`     | `.env.local` | Optionnel. Cle Jina pour de meilleures limites de taux du reader. |
| `AI_RATELIMIT_PER_MIN` | runtime  | Optionnel. Requetes IA max par utilisateur et par minute (defaut 30). |
| `AI_MAX_PIPELINE`  | runtime      | Optionnel. Candidatures max envoyees au copilote (defaut 100). |
| `DATABASE_URL`     | `.env`       | Connexion PostgreSQL : `postgresql://user:pass@host:5432/db`. |
| `AUTH_SECRET`      | `.env.local` | Secret de signature des JWT. Generer : `openssl rand -hex 32`. |
| `ALLOW_REGISTRATION` | runtime    | `true` pour autoriser la creation de comptes. Absent = inscriptions fermees. |

La cle Mistral n'est jamais exposee au navigateur : elle est lue cote serveur dans `app/api/ai/route.ts`. En production, `AUTH_SECRET` doit etre fort et stable (le changer invalide toutes les sessions).

## Base de donnees

Prisma avec PostgreSQL. La base demarre vide : chaque utilisateur cree ses propres candidatures.

```bash
npx prisma db push        # synchronise le schema avec la base
npx prisma studio         # interface d'exploration de la base
```

## Docker

Deux environnements sont fournis, pilotes par un Makefile. Chacun inclut un service PostgreSQL (donnees persistees dans le volume Docker `cockpit-pgdata`).

```bash
make help          # liste des commandes
make up            # developpement (hot-reload) sur http://localhost:3000
make down          # arret du developpement
make logs          # suivi des logs
make db-push       # synchronise le schema dans le conteneur
make prod-up       # production (build optimise) en arriere-plan
make prod-down     # arret de la production
make config        # validation des fichiers compose
```

Le fichier `.env.local` (cle Mistral et `AUTH_SECRET`) doit exister : il est injecte dans les conteneurs.

## Deploiement (production)

L'application se deploie avec le build pack **Dockerfile** (le dernier stage `runner`). Exemple teste sur Coolify :

- Build pack : `Dockerfile` ; port expose : `3000`.
- Base de donnees : creer une base **PostgreSQL managee** dans Coolify (+ New -> Database -> PostgreSQL). Aucun volume a gerer cote application.
- Variables d'environnement (runtime, definies dans le panneau, pas dans un fichier) :

  ```
  MISTRAL_API_KEY=...
  AUTH_SECRET=...                # openssl rand -hex 32, valeur stable
  DATABASE_URL=postgresql://...  # connection string de la base Postgres Coolify
  ```

- Ne pas definir `ALLOW_REGISTRATION` : les inscriptions restent fermees.
- Servir le site en HTTPS (les cookies de session sont "secure"). Avec un nom de domaine, le certificat Let's Encrypt est automatique ; les domaines partages (nip.io, sslip.io) sont souvent rate-limites par Let's Encrypt.

Au demarrage, le conteneur applique le schema (`prisma db push`) puis lance le serveur. Un push sur `main` declenche un nouveau build (auto-deploy si active).

## Routes API

Toutes les routes ci-dessous, hormis `register` et `login`, exigent une session valide.

| Methode | Route                     | Role                                              |
| ------- | ------------------------- | ------------------------------------------------- |
| POST    | `/api/auth/register`      | Inscription (uniquement si `ALLOW_REGISTRATION=true`, sinon 403) |
| GET     | `/api/auth/config`        | Indique si les inscriptions sont ouvertes         |
| POST    | `/api/auth/login`         | Connexion                                         |
| POST    | `/api/auth/logout`        | Deconnexion (revoque le refresh token)            |
| POST    | `/api/auth/refresh`       | Rotation du refresh token, nouvel access token    |
| GET     | `/api/auth/me`            | Utilisateur courant                               |
| GET     | `/api/candidatures`       | Liste des candidatures de l'utilisateur           |
| POST    | `/api/candidatures`       | Creation d'une candidature                        |
| PATCH   | `/api/candidatures/[id]`  | Mise a jour (statut, champs, ajout de note)       |
| DELETE  | `/api/candidatures/[id]`  | Suppression                                       |
| POST    | `/api/ai`                 | IA : `extract`, `copilot`, `draft`                |

## Scripts npm

| Script           | Description                          |
| ---------------- | ------------------------------------ |
| `npm run dev`    | Serveur de developpement             |
| `npm run build`  | Build de production                  |
| `npm run start`  | Serveur de production                |
| `npm run lint`   | Lint                                 |
| `npm run db:push`| Synchronise le schema Prisma         |
| `npm run db:studio`| Ouvre Prisma Studio                |

## Authentification et securite

- Inscription / connexion par email et mot de passe (hashe avec bcryptjs).
- Access token JWT de courte duree (15 minutes) et refresh token rotatif (30 jours), stocke hashe en base et revocable a la deconnexion.
- Tokens transmis en cookies httpOnly ; le client rafraichit automatiquement la session a l'expiration.
- Les routes de donnees exigent une session : chaque utilisateur n'accede qu'a ses propres candidatures.
- Inscriptions fermees par defaut : sans `ALLOW_REGISTRATION=true`, l'onglet d'inscription est masque et la route `/api/auth/register` renvoie 403. Les comptes existants se connectent normalement.
- En production, definir un `AUTH_SECRET` fort et stable, et servir le site en HTTPS (cookies securises).

## Limitations connues

- L'extraction depuis une URL passe par un reader externe (Jina) qui rend le JS et contourne une partie des protections anti-bot. Les pages derriere authentification (LinkedIn connecte) ou les anti-bot agressifs restent illisibles : il faut alors coller le texte de l'annonce.
- La base PostgreSQL doit etre accessible par l'application (instance managee Coolify, ou conteneurisee via le compose).
