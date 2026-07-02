import type { Status, Kind, Channel } from './types'

export const ORDER: Status[] = ['wishlist', 'applied', 'pending', 'interview', 'offer', 'rejected']

export const STATUS: Record<Status, { label: string; dot: string; tint: string }> = {
  wishlist: { label: 'Wishlist', dot: '#8b8b9e', tint: 'rgba(139,139,158,.14)' },
  applied: { label: 'Postulé', dot: '#3b82f6', tint: 'rgba(59,130,246,.14)' },
  pending: { label: 'En attente', dot: '#a855f7', tint: 'rgba(168,85,247,.14)' },
  interview: { label: 'Entretien', dot: '#10b981', tint: 'rgba(16,185,129,.14)' },
  offer: { label: 'Offre', dot: '#f59e0b', tint: 'rgba(245,158,11,.16)' },
  rejected: { label: 'Refusé', dot: '#ef4444', tint: 'rgba(239,68,68,.13)' },
}

export const KIND: Record<Kind, { label: string }> = {
  offer: { label: 'Offre' },
  spontaneous: { label: 'Spontanée' },
  network: { label: 'Réseau' },
}

export const CHANNEL: Record<Channel, { label: string }> = {
  email: { label: 'Email' },
  phone: { label: 'Téléphone' },
  form: { label: 'Formulaire' },
  linkedin: { label: 'LinkedIn' },
  other: { label: 'Autre' },
}
