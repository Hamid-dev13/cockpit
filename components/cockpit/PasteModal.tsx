'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Plus, ArrowLeft, AlertTriangle } from 'lucide-react'
import { ai } from '@/lib/api'

type Phase = 'paste' | 'review'

const field =
  'w-full bg-[var(--surface)] border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'

export function PasteModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (body: Record<string, unknown>) => Promise<void>
}) {
  const [phase, setPhase] = useState<Phase>('paste')
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [unreadableUrl, setUnreadableUrl] = useState(false)

  // Champs editables, pre-remplis par l'extraction.
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [salary, setSalary] = useState('')
  const [location, setLocation] = useState('')
  const [contract, setContract] = useState('')
  const [remote, setRemote] = useState('')
  const [seniority, setSeniority] = useState('')
  const [stack, setStack] = useState('')
  const [companyInfo, setCompanyInfo] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')

  const norm = (v: string) => (v && v !== '—' ? v : '')

  async function extract() {
    if (!raw.trim()) return
    setLoading(true)
    setErr('')
    try {
      const g = await ai('extract', { raw })
      setCompany(norm(g.company))
      setRole(norm(g.role))
      setSalary(norm(g.salary))
      setLocation(norm(g.location))
      setContract(norm(g.contract))
      setRemote(norm(g.remote))
      setSeniority(norm(g.seniority))
      setStack(Array.isArray(g.stack) ? g.stack.join(', ') : '')
      setCompanyInfo(g.companyInfo || '')
      setDescription(g.description || '')
      const wasUrl = raw.trim().startsWith('http')
      setUrl(wasUrl ? raw.trim().split(/\s/)[0] : '')
      setUnreadableUrl(wasUrl && g._fetched === false)
      setPhase('review')
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function create() {
    if (!company.trim()) {
      setErr("Le nom de l'entreprise est requis.")
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onCreate({
        kind: 'offer',
        channel: 'form',
        company: company.trim(),
        role: role.trim(),
        salary: salary.trim() || '—',
        location: location.trim() || '—',
        contract: contract.trim() || '—',
        remote: remote.trim() || '—',
        seniority: seniority.trim() || '—',
        stack: stack
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        companyInfo: companyInfo.trim(),
        url: url.trim(),
        description: description.trim(),
      })
    } catch (e: any) {
      setErr(e.message || 'Erreur')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 grid place-items-start justify-center pt-20 animate-fadein overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl mx-4 mb-10 glass border rounded-2xl ring-glow p-5 animate-fadein">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="font-semibold">Coller une offre</span>
          <span className="text-xs text-[var(--muted)]">
            {phase === 'paste' ? "— l'IA extrait les infos" : '— vérifie et corrige avant de créer'}
          </span>
        </div>

        {phase === 'paste' ? (
          <>
            <textarea
              autoFocus
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={6}
              placeholder="Colle l'URL ou tout le texte de l'offre ici…"
              className="w-full bg-[var(--surface)] border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
            />
            <div className="mt-2 text-[11px] text-[var(--muted)]">
              Astuce : l&apos;URL d&apos;une offre précise (pas une recherche). Les pages derrière connexion
              (LinkedIn) restent illisibles — colle alors le texte de l&apos;annonce.
            </div>
            {err && <div className="mt-2 text-sm text-red-500">Erreur : {err}</div>}
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--fg)] px-3 h-9">
                Annuler
              </button>
              <button
                onClick={extract}
                disabled={loading || !raw.trim()}
                className="text-sm font-medium text-white rounded-lg px-4 h-9 inline-flex items-center gap-2 disabled:opacity-60"
                style={{ background: 'var(--accent)' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Extraction…' : 'Extraire'}
              </button>
            </div>
          </>
        ) : (
          <>
            {unreadableUrl && (
              <div className="mb-3 flex items-start gap-2 text-[12px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Page non lisible : les champs sont vides, complète-les à la main.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-[var(--muted)] col-span-2">
                Entreprise *
                <input value={company} onChange={(e) => setCompany(e.target.value)} className={field + ' mt-1'} />
              </label>
              <label className="text-xs text-[var(--muted)] col-span-2">
                Poste / intitulé
                <input value={role} onChange={(e) => setRole(e.target.value)} className={field + ' mt-1'} />
              </label>
              <label className="text-xs text-[var(--muted)]">
                Localisation
                <input value={location} onChange={(e) => setLocation(e.target.value)} className={field + ' mt-1'} />
              </label>
              <label className="text-xs text-[var(--muted)]">
                Rémunération
                <input value={salary} onChange={(e) => setSalary(e.target.value)} className={field + ' mt-1'} />
              </label>
              <label className="text-xs text-[var(--muted)]">
                Contrat
                <input value={contract} onChange={(e) => setContract(e.target.value)} placeholder="CDI, Freelance…" className={field + ' mt-1'} />
              </label>
              <label className="text-xs text-[var(--muted)]">
                Télétravail
                <input value={remote} onChange={(e) => setRemote(e.target.value)} placeholder="Remote, Hybride…" className={field + ' mt-1'} />
              </label>
              <label className="text-xs text-[var(--muted)]">
                Séniorité
                <input value={seniority} onChange={(e) => setSeniority(e.target.value)} placeholder="Junior, Senior…" className={field + ' mt-1'} />
              </label>
              <label className="text-xs text-[var(--muted)]">
                Stack (séparée par virgules)
                <input value={stack} onChange={(e) => setStack(e.target.value)} placeholder="React, Node…" className={field + ' mt-1'} />
              </label>
              <label className="text-xs text-[var(--muted)] col-span-2">
                Infos entreprise
                <input value={companyInfo} onChange={(e) => setCompanyInfo(e.target.value)} className={field + ' mt-1'} />
              </label>
              <label className="text-xs text-[var(--muted)] col-span-2">
                Lien (optionnel)
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={field + ' mt-1'} />
              </label>
              <label className="text-xs text-[var(--muted)] col-span-2">
                Description du poste
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-[var(--surface)] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y mt-1"
                />
              </label>
            </div>
            {err && <div className="mt-3 text-sm text-red-500">{err}</div>}
            <div className="flex justify-between gap-2 mt-4">
              <button
                onClick={() => {
                  setPhase('paste')
                  setErr('')
                }}
                className="text-sm text-[var(--muted)] hover:text-[var(--fg)] px-3 h-9 inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
              <button
                onClick={create}
                disabled={saving}
                className="text-sm font-medium text-white rounded-lg px-4 h-9 inline-flex items-center gap-2 disabled:opacity-60"
                style={{ background: 'var(--accent)' }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Créer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
