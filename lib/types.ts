export type Status = 'wishlist' | 'applied' | 'pending' | 'interview' | 'offer' | 'rejected'
export type Kind = 'offer' | 'spontaneous' | 'network'
export type Channel = 'email' | 'phone' | 'form' | 'linkedin' | 'other'

export interface Comment {
  t: number
  txt: string
}

export interface Card {
  id: number
  company: string
  role: string
  status: Status
  kind: Kind
  channel: Channel
  salary: string
  stack: string[]
  location: string
  contract: string
  remote: string
  seniority: string
  companyInfo: string
  url: string
  description: string
  last: number
  comments: Comment[]
}
