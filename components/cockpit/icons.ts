import { Mail, Phone, FileText, Linkedin, Globe } from 'lucide-react'
import type { Channel } from '@/lib/types'

/** Icône Lucide associée à un canal de candidature. */
export function channelIcon(ch: Channel) {
  return ch === 'phone' ? Phone : ch === 'form' ? FileText : ch === 'linkedin' ? Linkedin : ch === 'other' ? Globe : Mail
}
