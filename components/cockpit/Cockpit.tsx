'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { Kind } from '@/lib/types'
import { ORDER } from '@/lib/status'
import { momentum } from '@/lib/momentum'
import { useCandidatures } from '@/hooks/useCandidatures'
import { Header } from './Header'
import { TodaySection } from './TodaySection'
import { Filters } from './Filters'
import { CandidatureRow } from './CandidatureRow'
import { DetailPanel } from './DetailPanel'
import { Copilot } from './Copilot'
import { PasteModal } from './PasteModal'
import { ManualModal } from './ManualModal'

export function Cockpit() {
  const { cards, loading, toast, flash, reload, setStatus, addNote, patch, createFromExtract, createManual, remove } =
    useCandidatures()

  const [mounted, setMounted] = useState(false)
  const [fStatus, setFStatus] = useState('all')
  const [q, setQ] = useState('')
  const [panelId, setPanelId] = useState<number | null>(null)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [manualKind, setManualKind] = useState<Kind | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen(true)
      }
      if (e.key === 'Escape') {
        setCmdOpen(false)
        setPanelId(null)
        setPasteOpen(false)
        setManualKind(null)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (!mounted) return null

  const card = cards.find((c) => c.id === panelId) || null
  const list = cards
    .filter((c) => fStatus === 'all' || c.status === fStatus)
    .filter((c) => !q || (c.company + ' ' + c.role).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.last - b.last)
  const staleCount = cards.filter((c) => {
    const m = momentum(c)
    return m && (m.risk === 'cool' || m.risk === 'cold')
  }).length

  return (
    <div className="h-screen flex flex-col">
      <Header
        onCopilot={() => setCmdOpen(true)}
        onPaste={() => setPasteOpen(true)}
        onManual={() => setManualKind('offer')}
        onSpontaneous={() => setManualKind('spontaneous')}
      />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <TodaySection cards={cards} onOpen={setPanelId} onCopilot={() => setCmdOpen(true)} />
          <Filters cards={cards} fStatus={fStatus} onStatus={setFStatus} q={q} onQ={setQ} />

          <div className="rounded-xl border overflow-hidden bg-[var(--surface)]">
            {loading ? (
              <div className="p-10 text-center text-[var(--muted)] text-sm flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement…
              </div>
            ) : list.length ? (
              list.map((c) => <CandidatureRow key={c.id} c={c} onOpen={() => setPanelId(c.id)} />)
            ) : (
              <div className="p-10 text-center text-[var(--muted)] text-sm">Aucune candidature ici.</div>
            )}
          </div>

          <div className="mt-4 text-[11px] text-[var(--muted)] text-center">
            {cards.length} candidatures · {staleCount} en perte de momentum
          </div>
        </div>
      </main>

      {card && (
        <DetailPanel
          key={card.id}
          c={card}
          onClose={() => setPanelId(null)}
          onPatch={(body, optimistic) => patch(card.id, body, optimistic)}
          onSetStatus={(s) => setStatus(card.id, s)}
          onAddNote={(txt) => addNote(card.id, txt)}
          onDelete={() => {
            remove(card.id)
            setPanelId(null)
          }}
        />
      )}

      {cmdOpen && (
        <Copilot
          cards={cards}
          onClose={() => setCmdOpen(false)}
          onOpen={(id) => {
            setCmdOpen(false)
            setPanelId(id)
          }}
          onMutated={reload}
          onToast={flash}
        />
      )}

      {pasteOpen && (
        <PasteModal
          onClose={() => setPasteOpen(false)}
          onCreate={async (g, raw) => {
            const created = await createFromExtract(g, raw)
            setPasteOpen(false)
            setPanelId(created.id)
          }}
        />
      )}

      {manualKind && (
        <ManualModal
          initialKind={manualKind}
          onClose={() => setManualKind(null)}
          onCreate={async (body) => {
            const created = await createManual(body)
            setManualKind(null)
            setPanelId(created.id)
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="glass border rounded-xl px-4 py-2.5 text-sm shadow-2xl animate-fadein">{toast}</div>
        </div>
      )}
    </div>
  )
}
