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
