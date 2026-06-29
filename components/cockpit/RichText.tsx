import type { ReactNode } from 'react'

/** Gras **texte** rendu en <strong>, le reste en texte. */
function inlineMd(text: string, kp: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <strong key={`${kp}-b${i++}`} className="font-semibold text-[var(--fg)]">
        {m[1]}
      </strong>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Rendu léger du texte IA (gras, puces, titres) cohérent avec le design. */
export function RichText({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const t = line.trim()
        if (!t) return <div key={i} className="h-1.5" />
        if (/^#{1,6}\s+/.test(t)) {
          return (
            <p key={i} className="font-semibold text-[var(--fg)]">
              {inlineMd(t.replace(/^#{1,6}\s+/, ''), `h${i}`)}
            </p>
          )
        }
        if (/^[-*•]\s+/.test(t)) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-[7px] w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
              <span className="flex-1">{inlineMd(t.replace(/^[-*•]\s+/, ''), `li${i}`)}</span>
            </div>
          )
        }
        return <p key={i}>{inlineMd(t, `p${i}`)}</p>
      })}
    </div>
  )
}
