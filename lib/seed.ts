export interface SeedComment {
  txt: string
  daysAgo: number
}

export interface SeedEntry {
  company: string
  role: string
  status: string
  kind: string
  channel: string
  salary: string
  stack: string[]
  location: string
  url: string
  description: string
  lastDaysAgo: number
  comments: SeedComment[]
}

/** Données de démarrage, insérées en BDD au premier lancement si elle est vide. */
export const SEED: SeedEntry[] = [
  {
    company: 'Stripe',
    role: 'Senior Frontend Engineer',
    status: 'interview',
    kind: 'offer',
    channel: 'form',
    salary: '75–90k€',
    stack: ['React', 'TypeScript', 'GraphQL'],
    location: 'Remote',
    url: 'https://stripe.com/jobs',
    description:
      "En tant que Senior Frontend Engineer, vous concevez des interfaces de paiement performantes et accessibles. Vous collaborez avec les équipes produit et design pour livrer des fonctionnalités à grande échelle. Maîtrise de React et TypeScript requise, expérience GraphQL appréciée.",
    lastDaysAgo: 1,
    comments: [{ txt: 'Call RH ok, ils enchaînent sur un entretien technique.', daysAgo: 1 }],
  },
  {
    company: 'Datadog',
    role: 'Fullstack Engineer',
    status: 'applied',
    kind: 'offer',
    channel: 'form',
    salary: '65–80k€',
    stack: ['Go', 'React', 'K8s'],
    location: 'Paris',
    url: '',
    description: '',
    lastDaysAgo: 8,
    comments: [{ txt: 'Candidature envoyée via leur site.', daysAgo: 8 }],
  },
  {
    company: 'Figma',
    role: 'Product Engineer',
    status: 'wishlist',
    kind: 'offer',
    channel: 'email',
    salary: '—',
    stack: ['TypeScript', 'WebGL'],
    location: 'Remote',
    url: '',
    description: '',
    lastDaysAgo: 3,
    comments: [],
  },
  {
    company: 'Alan',
    role: 'Candidature spontanée — Dev Fullstack',
    status: 'applied',
    kind: 'spontaneous',
    channel: 'email',
    salary: '—',
    stack: ['React', 'Node'],
    location: 'Paris',
    url: '',
    description:
      "Candidature spontanée adressée au CTO. Profil développeur fullstack intéressé par la santé numérique, à l'aise sur React et Node, en quête d'un environnement à impact.",
    lastDaysAgo: 4,
    comments: [{ txt: 'Mail envoyé au CTO via LinkedIn.', daysAgo: 4 }],
  },
  {
    company: 'Notion',
    role: 'Frontend Engineer',
    status: 'rejected',
    kind: 'offer',
    channel: 'form',
    salary: '60–75k€',
    stack: ['React', 'Rust'],
    location: 'Paris',
    url: '',
    description: '',
    lastDaysAgo: 12,
    comments: [{ txt: "Refus après le screening. Pas assez d'expérience Rust." , daysAgo: 12 }],
  },
  {
    company: 'Vercel',
    role: 'DX Engineer',
    status: 'applied',
    kind: 'offer',
    channel: 'email',
    salary: '70–85k€',
    stack: ['Next.js', 'Node'],
    location: 'Remote',
    url: '',
    description: '',
    lastDaysAgo: 6,
    comments: [],
  },
]
