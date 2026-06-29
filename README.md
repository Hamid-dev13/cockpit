# Cockpit

Application personnelle de suivi de candidatures, avec un copilote IA (Mistral) et un radar de relance.

Le principe : ce n'est pas un tableur de plus. L'application met en avant ce qu'il faut faire maintenant (entretien a preparer, relance a envoyer) et laisse l'IA resumer les offres, rediger les relances et repondre a des questions sur le pipeline.

## Fonctionnalites

- Suivi des candidatures par statut : Wishlist, Postule, Entretien, Offre, Refuse.
- Radar de momentum : chaque candidature refroidit avec l'inactivite (vert vers rouge), pour reperer le risque de ghosting.
- Zone "Aujourd'hui" : actions prioritaires mises en avant (entretien a preparer, relance recommandee).
- Copilote IA (raccourci Cmd/Ctrl+K) : questions en langage naturel sur le pipeline.
- Coller une offre : extraction automatique des informations (entreprise, poste, stack, remuneration, localisation) depuis un texte ou une URL publique.
- Saisie manuelle : pour les candidatures spontanees, avec nature (offre / spontanee / reseau) et canal (email / telephone / formulaire / LinkedIn / autre).
- Actions IA par candidature : rediger une relance, preparer un entretien, resumer l'offre.
- Description du poste editable et journal de notes par candidature.
- Theme clair par defaut, bascule en theme sombre.
- Authentification multi-utilisateur : inscription / connexion, sessions par tokens (access + refresh rotatif), candidatures privees par compte, accueil personnalise au prenom.

## Stack technique

- Next.js 14 (App Router) et React 18
- TypeScript
- Tailwind CSS
- Prisma ORM avec SQLite
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
- Une cle API Mistral (https://console.mistral.ai)
- Docker et Docker Compose (optionnel, pour les environnements conteneurises)

## Demarrage en local

```bash
npm install
cp .env.example .env.local        # renseigner MISTRAL_API_KEY et AUTH_SECRET
npx prisma db push                # cree la base SQLite locale
npm run dev                       # http://localhost:3000
```

## Variables d'environnement

| Variable           | Fichier      | Description                                              |
| ------------------ | ------------ | ------------------------------------------------------- |
| `MISTRAL_API_KEY`  | `.env.local` | Cle API Mistral. Lue uniquement cote serveur.           |
| `MISTRAL_MODEL`    | `.env.local` | Optionnel. Defaut : `mistral-small-latest`.             |
| `DATABASE_URL`     | `.env`       | Chemin de la base SQLite. Defaut : `file:./dev.db`.     |
| `AUTH_SECRET`      | `.env.local` | Secret de signature des JWT. Generer : `openssl rand -hex 32`. |
| `ALLOW_REGISTRATION` | runtime    | `true` pour autoriser la creation de comptes. Absent = inscriptions fermees. |

La cle Mistral n'est jamais exposee au navigateur : elle est lue cote serveur dans `app/api/ai/route.ts`. En production, `AUTH_SECRET` doit etre fort et stable (le changer invalide toutes les sessions).

## Base de donnees

Prisma avec SQLite. La base demarre vide : chaque utilisateur cree ses propres candidatures.

```bash
npx prisma db push        # synchronise le schema avec la base
npx prisma studio         # interface d'exploration de la base
```

## Docker

Deux environnements sont fournis, pilotes par un Makefile. La base SQLite est montee via un bind-mount dans `./data`, elle persiste donc hors du conteneur.

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

## Routes API

Toutes les routes ci-dessous, hormis `register` et `login`, exigent une session valide.

| Methode | Route                     | Role                                              |
| ------- | ------------------------- | ------------------------------------------------- |
| POST    | `/api/auth/register`      | Inscription (cree le compte et ouvre la session)  |
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
- En production, definir un `AUTH_SECRET` fort et stable, et servir le site en HTTPS (cookies securises).

## Limitations connues

- L'extraction depuis une URL fonctionne sur les pages publiques accessibles. Les sites qui bloquent les robots (Indeed, LinkedIn, Workday) ne sont pas lisibles : il faut alors coller le texte de l'annonce.
- Le stockage est local (SQLite), adapte a un deploiement mono-instance.
