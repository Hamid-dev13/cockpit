import type { ZodType } from 'zod'

type Role = 'system' | 'user' | 'assistant'
export interface Msg {
  role: Role
  content: string
}

// ── Function calling ─────────────────────────────────────────────────────────

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

/** Message au format chat de l'API (inclut les variantes tool-calling). */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

/** Definition d'un outil expose au modele + son handler serveur. */
export interface ToolSpec {
  name: string
  description: string
  /** JSON Schema des parametres. */
  parameters: Record<string, unknown>
  /** Execute l'outil et renvoie le contenu textuel rendu au modele. */
  handler: (args: any) => Promise<string>
}

export interface ToolCallTrace {
  name: string
  args: any
  ok: boolean
  error?: string
}

export interface ToolLoopResult {
  answer: string
  calls: ToolCallTrace[]
}

type ChatFn = (messages: ChatMessage[], tools: ToolSpec[]) => Promise<ChatMessage>

/**
 * Boucle de tool-calling, pure et testable : `chat` est le transport (le vrai
 * appel API ou un mock). Le modele peut demander des outils ; on les execute,
 * on reinjecte leurs resultats, et on boucle jusqu'a une reponse textuelle ou
 * la limite d'iterations. Un outil inconnu / une erreur de handler / des args
 * invalides n'interrompent pas la boucle : l'erreur est renvoyee au modele.
 */
export async function runToolLoop(
  chat: ChatFn,
  messages: ChatMessage[],
  tools: ToolSpec[],
  maxSteps = 6,
): Promise<ToolLoopResult> {
  const convo: ChatMessage[] = [...messages]
  const calls: ToolCallTrace[] = []
  const byName = new Map(tools.map((t) => [t.name, t]))

  for (let step = 0; step < maxSteps; step++) {
    const msg = await chat(convo, tools)
    convo.push(msg)
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { answer: msg.content ?? '', calls }
    }
    for (const tc of msg.tool_calls) {
      let args: any = {}
      try {
        args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
      } catch {
        args = {}
      }
      const tool = byName.get(tc.function.name)
      let content: string
      let ok = true
      let error: string | undefined
      if (!tool) {
        ok = false
        error = `Outil inconnu: ${tc.function.name}`
        content = error
      } else {
        try {
          content = await tool.handler(args)
        } catch (e: any) {
          ok = false
          error = e?.message || 'Erreur outil'
          content = `Erreur lors de l'execution: ${error}`
        }
      }
      calls.push({ name: tc.function.name, args, ok, error })
      convo.push({ role: 'tool', name: tc.function.name, tool_call_id: tc.id, content })
    }
  }

  // Limite atteinte : un dernier tour sans outil pour forcer une reponse texte.
  const final = await chat(convo, [])
  return { answer: final.content ?? '', calls }
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

/** Transport bas niveau : renvoie le message complet (avec tool_calls eventuels). */
async function chatRaw(messages: ChatMessage[], tools: ToolSpec[], model?: string): Promise<ChatMessage> {
  const key = process.env.MISTRAL_API_KEY
  if (!key) throw new Error('MISTRAL_API_KEY manquante dans .env.local')

  const body: Record<string, unknown> = {
    model: model || process.env.MISTRAL_MODEL || 'mistral-small-latest',
    messages,
    temperature: 0.3,
  }
  if (tools.length) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }))
    body.tool_choice = 'auto'
    body.parallel_tool_calls = false
  }

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const msg = data?.choices?.[0]?.message
  return { role: 'assistant', content: msg?.content ?? '', tool_calls: msg?.tool_calls }
}

/** Conversation agentique : le modele peut appeler les `tools` fournis. */
export async function mistralWithTools(
  messages: ChatMessage[],
  tools: ToolSpec[],
  opts: { model?: string; maxSteps?: number } = {},
): Promise<ToolLoopResult> {
  return runToolLoop((m, t) => chatRaw(m, t, opts.model), messages, tools, opts.maxSteps)
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
