import type { ZodType } from 'zod'

type Role = 'system' | 'user' | 'assistant'
export interface Msg {
  role: Role
  content: string
}

/**
 * Appel serveur à l'API Mistral. La clé est lue depuis l'environnement
 * (MISTRAL_API_KEY) et n'est JAMAIS envoyée au navigateur.
 */
export async function mistral(messages: Msg[], opts: { json?: boolean; model?: string } = {}): Promise<string> {
  const key = process.env.MISTRAL_API_KEY
  if (!key) throw new Error('MISTRAL_API_KEY manquante dans .env.local')

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.model || process.env.MISTRAL_MODEL || 'mistral-small-latest',
      messages,
      temperature: 0.4,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300)
    throw new Error(`Mistral ${res.status}: ${detail}`)
  }

  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? ''
}

/**
 * Appel Mistral en mode JSON, valide contre un schema zod. En cas de JSON
 * malforme ou de schema non respecte, relance une fois en signalant l'erreur
 * au modele. Leve une erreur si la sortie reste invalide.
 */
export async function mistralJson<T>(
  messages: Msg[],
  schema: ZodType<T>,
  opts: { model?: string } = {},
): Promise<T> {
  let convo = messages
  for (let attempt = 0; attempt < 2; attempt++) {
    const content = await mistral(convo, { json: true, model: opts.model })
    try {
      return schema.parse(JSON.parse(content))
    } catch {
      convo = [
        ...convo,
        { role: 'assistant', content },
        {
          role: 'user',
          content:
            "Ta reponse precedente etait invalide (JSON malforme ou champs manquants). " +
            'Renvoie STRICTEMENT le JSON demande, sans texte autour.',
        },
      ]
    }
  }
  throw new Error('Reponse IA invalide apres plusieurs tentatives.')
}
