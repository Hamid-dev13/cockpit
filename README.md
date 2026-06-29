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

## Stack technique

- Next.js 14 (App Router) et React 18
- TypeScript
- Tailwind CSS
- Prisma ORM avec SQLite
- API Mistral pour les fonctionnalites IA
- lucide-react (icones), next-themes (theme clair/sombre)
- Docker et Docker Compose (dev et prod)

## Architecture

Le code est separe par responsabilite.

```
app/
  layout.tsx, page.tsx, providers.tsx   Entree Next.js et theme
  globals.css                           Variables de theme et styles de base
  api/
    ai/route.ts                         IA : extraction, copilote, redaction
    candidatures/route.ts               Liste et creation
    candidatures/[id]/route.ts          Mise a jour et suppression

lib/
  types.ts                              Types partages
  status.ts                             Constantes statut / nature / canal
  momentum.ts                           Calcul du radar de momentum
  format.ts                             Helpers d'affichage
  api.ts                                Appels HTTP cote client
  db.ts                                 Client Prisma et serialisation
  mistral.ts                            Appel a l'API Mistral
  seed.ts                               Donnees de demarrage

hooks/
  useCandidatures.ts                    Etat et logique metier (CRUD, toasts)

components/cockpit/
  Cockpit.tsx                           Orchestrateur
  Header.tsx, TodaySection.tsx,
  Filters.tsx, CandidatureRow.tsx,
  DetailPanel.tsx, Copilot.tsx,
  PasteModal.tsx, ManualModal.tsx,
  RichText.tsx, icons.ts, index.ts      Composants de presentation

prisma/
  schema.prisma                         Schema de la base
```

Principe : `lib/` est pur (sans React), `hooks/useCandidatures` porte la logique d'etat, et les composants ne font que du rendu.

## Prerequis

- Node.js 20 ou superieur
- Une cle API Mistral (https://console.mistral.ai)
- Docker et Docker Compose (optionnel, pour les environnements conteneurises)

## Demarrage en local

```bash
npm install
cp .env.example .env.local        # renseigner MISTRAL_API_KEY
npx prisma db push                # cree la base SQLite locale
npm run dev                       # http://localhost:3000
```

## Variables d'environnement

| Variable           | Fichier      | Description                                              |
| ------------------ | ------------ | ------------------------------------------------------- |
| `MISTRAL_API_KEY`  | `.env.local` | Cle API Mistral. Lue uniquement cote serveur.           |
| `MISTRAL_MODEL`    | `.env.local` | Optionnel. Defaut : `mistral-small-latest`.             |
| `DATABASE_URL`     | `.env`       | Chemin de la base SQLite. Defaut : `file:./dev.db`.     |

La cle Mistral n'est jamais exposee au navigateur : elle est lue cote serveur dans `app/api/ai/route.ts`.

## Base de donnees

Prisma avec SQLite. Les donnees sont seedees automatiquement au premier appel si la base est vide.

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

Le fichier `.env.local` (cle Mistral) doit exister : il est injecte dans les conteneurs.

## Routes API

| Methode | Route                     | Role                                              |
| ------- | ------------------------- | ------------------------------------------------- |
| GET     | `/api/candidatures`       | Liste des candidatures (seed si base vide)        |
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

## Limitations connues

- L'extraction depuis une URL fonctionne sur les pages publiques accessibles. Les sites qui bloquent les robots (Indeed, LinkedIn, Workday) ne sont pas lisibles : il faut alors coller le texte de l'annonce.
- Le stockage est local (SQLite). Pas d'authentification ni de multi-utilisateur a ce stade.
