export type Status = 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected'
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
  url: string
  description: string
  last: number
  comments: Comment[]
}
