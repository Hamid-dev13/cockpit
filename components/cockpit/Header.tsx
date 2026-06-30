'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Plus, Bot, Sun, Moon, Sparkles, PenLine, Send, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function Header({
  onCopilot,
  onPaste,
  onManual,
  onSpontaneous,
  onSettings,
}: {
  onCopilot: () => void
  onPaste: () => void
  onManual: () => void
  onSpontaneous: () => void
  onSettings: () => void
}) {
  const [addMenu, setAddMenu] = useState(false)
  const [profileMenu, setProfileMenu] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme, setTheme } = useTheme()
  const { user, logout } = useAuth()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenu(false)
      }
    }
    if (profileMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileMenu])

  const initials = user ? `${(user.firstName?.[0] ?? '').toUpperCase()}${(user.lastName?.[0] ?? '').toUpperCase()}` : ''

  return (
    <header className="flex items-center gap-3 px-4 sm:px-6 h-16 border-b shrink-0">
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg grid place-items-center text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,var(--accent),#5b4bd6)' }}
        >
          C
        </div>
        <div className="font-bold tracking-tight">Cockpit</div>
        <span className="text-[11px] text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--surface-2)] border">perso</span>
      </div>

      <button
        onClick={onCopilot}
        className="ml-2 hidden sm:flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--fg)] bg-[var(--surface)] border rounded-lg px-3 h-9 transition w-72"
      >
        <Bot className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <span className="flex-1 text-left">Demande au copilote…</span>
        <kbd className="text-[10px] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border">⌘K</kbd>
      </button>

      <div className="flex-1" />

      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="grid place-items-center w-9 h-9 rounded-lg border bg-[var(--surface)] hover:bg-[var(--surface-2)] transition"
        title="Changer de thème"
      >
        {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Menu profil */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setProfileMenu((v) => !v)}
          className="flex items-center gap-2 rounded-lg border bg-[var(--surface)] hover:bg-[var(--surface-2)] transition px-2 h-9"
        >
          <div
            className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,var(--accent),#5b4bd6)' }}
          >
            {initials}
          </div>
          <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">{user?.firstName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />
        </button>

        {profileMenu && (
          <div className="absolute right-0 mt-2 w-64 z-40 glass border rounded-xl shadow-2xl overflow-hidden animate-fadein">
            <div className="px-4 py-3 border-b">
              <div className="font-medium text-sm">{user?.firstName} {user?.lastName}</div>
              <div className="text-xs text-[var(--muted)] mt-0.5 truncate">{user?.email}</div>
            </div>
            <div className="p-1">
              <button
                onClick={() => {
                  setProfileMenu(false)
                  onSettings()
                }}
                className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] flex items-center gap-2.5"
              >
                <Settings className="w-4 h-4 text-[var(--muted)]" />
                Paramètres
              </button>
            </div>
            <div className="border-t p-1">
              <button
                onClick={() => {
                  setProfileMenu(false)
                  logout()
                }}
                className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-red-500/10 flex items-center gap-2.5 text-red-500 dark:text-red-400"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setAddMenu((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-white rounded-lg px-3.5 h-9 transition"
          style={{ background: 'var(--accent)' }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </button>
        {addMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setAddMenu(false)} />
            <div className="absolute right-0 mt-2 w-60 z-40 glass border rounded-xl p-1 shadow-2xl">
              <button
                onClick={() => {
                  setAddMenu(false)
                  onPaste()
                }}
                className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] flex items-center gap-2.5"
              >
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                Coller une offre
                <span className="ml-auto text-[10px] text-[var(--muted)]">IA</span>
              </button>
              <button
                onClick={() => {
                  setAddMenu(false)
                  onSpontaneous()
                }}
                className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] flex items-center gap-2.5"
              >
                <Send className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                Candidature spontanée
              </button>
              <button
                onClick={() => {
                  setAddMenu(false)
                  onManual()
                }}
                className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] flex items-center gap-2.5"
              >
                <PenLine className="w-4 h-4 text-[var(--muted)]" />
                Saisie manuelle
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
