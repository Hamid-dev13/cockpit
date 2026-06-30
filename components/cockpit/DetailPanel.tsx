'use client'

import { useState } from 'react'
import {
  X, Banknote, MapPin, Link as LinkIcon, Sparkles, Mail, Target, FileText, Loader2, CornerDownLeft, Trash2,
  Briefcase, Home, Award, Building2,
} from 'lucide-react'
import type { Card, Status } from '@/lib/types'
import { ORDER, STATUS, KIND } from '@/lib/status'
import { rel } from '@/lib/format'
import { ai } from '@/lib/api'
import { RichText } from './RichText'

export function DetailPanel({
  c,
  onClose,
  onPatch,
  onSetStatus,
  onAddNote,
  onDelete,
}: {
  c: Card
  onClose: () => void
  onPatch: (body: Record<string, unknown>, optimistic?: Partial<Card>) => Promise<Card | void>
  onSetStatus: (s: Status) => void
  onAddNote: (txt: string) => void
  onDelete: () => void
}) {
  const [out, setOut] = useState('')
  const [load, setLoad] = useState(false)
  const [note, setNote] = useState('')
  const [desc, setDesc] = useState(c.description)
  const [savingDesc, setSavingDesc] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function draft(kind: string) {
    setLoad(true)
    setOut('')
    try {
      const { text } = await ai('draft', { kind, card: c })
      setOut(text)
    } catch (e: any) {
      setOut('Erreur : ' + e.message)
    } finally {
      setLoad(false)
    }
  }

  function addNote() {
    const v = note.trim()
    if (!v) return
    onAddNote(v)
    setNote('')
  }

  async function saveDesc() {
    setSavingDesc(true)
    await onPatch({ description: desc })
    setSavingDesc(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 animate-fadein" onClick={onClose} />
      <aside className="fixed top-0 right-0 z-40 h-full w-full max-w-md glass border-l animate-slidein flex flex-col">
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-xl font-bold">{c.company}</div>
              {c.kind !== 'offer' && (
                <span
                  className="text-[10px] px-1.5 py-px rounded border"
                  style={{
                    color: 'var(--accent)',
                    borderColor: 'color-mix(in srgb,var(--accent) 35%,transparent)',
                    background: 'color-mix(in srgb,var(--accent) 8%,transparent)',
                  }}
                >
                  {KIND[c.kind].label}
                </span>
              )}
            </div>
            <div className="text-[var(--muted)]">{c.role}</div>
            <div className="flex items-center gap-3 mt-2 text-xs text-[var(--muted)] flex-wrap">
              {c.salary && c.salary !== '—' && (
                <span className="inline-flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5" />
                  {c.salary}
                </span>
              )}
              {c.location && c.location !== '—' && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {c.location}
                </span>
              )}
              {c.remote && c.remote !== '—' && (
                <span className="inline-flex items-center gap-1">
                  <Home className="w-3.5 h-3.5" />
                  {c.remote}
                </span>
              )}
              {c.contract && c.contract !== '—' && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {c.contract}
                </span>
              )}
              {c.seniority && c.seniority !== '—' && (
                <span className="inline-flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {c.seniority}
                </span>
              )}
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  offre
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Statut */}
          <div>
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Statut</div>
            <div className="flex flex-wrap gap-1.5">
              {ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => onSetStatus(s)}
                  className={`text-xs rounded-md px-2.5 py-1.5 border transition ${
                    c.status === s ? '' : 'text-[var(--muted)] hover:text-[var(--fg)]'
                  }`}
                  style={c.status === s ? { background: STATUS[s].tint, color: STATUS[s].dot } : {}}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: STATUS[s].dot }} />
                  {STATUS[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Entreprise */}
          {c.companyInfo && (
            <div>
              <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Entreprise
              </div>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{c.companyInfo}</p>
            </div>
          )}

          {/* Description */}
          <div>
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Description du poste</span>
              {desc !== c.description && (
                <button
                  onClick={saveDesc}
                  disabled={savingDesc}
                  className="text-[11px] font-medium inline-flex items-center gap-1 hover:underline disabled:opacity-60"
                  style={{ color: 'var(--accent)' }}
                >
                  {savingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <CornerDownLeft className="w-3 h-3" />}
                  Enregistrer
                </button>
              )}
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={6}
              placeholder="Aucune description. Colle ici le descriptif du poste…"
              className="w-full bg-[var(--surface)] border rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y leading-relaxed max-h-80"
            />
          </div>

          {/* Actions IA */}
          <div
            className="rounded-xl border p-3"
            style={{
              borderColor: 'color-mix(in srgb,var(--accent) 30%,transparent)',
              background: 'color-mix(in srgb,var(--accent) 5%,transparent)',
            }}
          >
            <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <Sparkles className="w-3.5 h-3.5" />
              Actions IA
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => draft('relance')}
                className="text-xs bg-[var(--surface)] hover:bg-[var(--surface-2)] border rounded-md px-2.5 py-1.5 inline-flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                Rédiger une relance
              </button>
              <button
                onClick={() => draft('prep')}
                className="text-xs bg-[var(--surface)] hover:bg-[var(--surface-2)] border rounded-md px-2.5 py-1.5 inline-flex items-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5" />
                Préparer l&apos;entretien
              </button>
              <button
                onClick={() => draft('resume')}
                className="text-xs bg-[var(--surface)] hover:bg-[var(--surface-2)] border rounded-md px-2.5 py-1.5 inline-flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Résumer l&apos;offre
              </button>
            </div>
            {(load || out) && (
              <div className="mt-3 text-sm leading-relaxed">
                {load ? (
                  <span className="inline-flex items-center gap-2 text-[var(--muted)]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    L&apos;IA réfléchit…
                  </span>
                ) : (
                  <RichText text={out} />
                )}
              </div>
            )}
          </div>

          {/* Journal */}
          <div>
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
              Journal · {c.comments.length}
            </div>
            <div className="space-y-2">
              {c.comments.length ? (
                c.comments
                  .slice()
                  .reverse()
                  .map((cm, i) => (
                    <div key={i} className="text-sm bg-[var(--surface)] border rounded-lg p-2.5">
                      <div>{cm.txt}</div>
                      <div className="text-[10px] text-[var(--muted)] mt-1">{rel(cm.t)}</div>
                    </div>
                  ))
              ) : (
                <div className="text-sm text-[var(--muted)]">Rien pour l&apos;instant.</div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNote()
                }}
                placeholder="Ajouter une note…"
                className="flex-1 bg-[var(--surface)] border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <button
                onClick={addNote}
                className="grid place-items-center w-9 h-9 rounded-lg border bg-[var(--surface-2)] hover:bg-[var(--surface)]"
              >
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Supprimer */}
          <div className="pt-3 border-t">
            {confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--muted)] flex-1">Supprimer définitivement ?</span>
                <button
                  onClick={onDelete}
                  className="text-white bg-red-500 hover:bg-red-600 rounded-md px-3 h-8 text-xs font-medium"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[var(--muted)] hover:text-[var(--fg)] text-xs px-2 h-8"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-500 hover:text-red-600 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer cette candidature
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
