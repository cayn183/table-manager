// Types for the public reservation system

export type ReservationConfig = {
  logoUrl?: string | null
  description?: string | null
  maxCapacity?: number | null
  autoConfirm: boolean
  optionalFields: { phone?: boolean; notes?: boolean }
  menuItems: ReservationMenuItem[]
}

export type ReservationMenuItem = {
  id: string
  label: string
  description?: string
}

export type PublicEventData = {
  title: string
  organizerName: string
  eventDate: string | null
  from: string | null
  to: string | null
  isToGo: boolean
  description: string | null
  logoUrl: string | null
  maxCapacity: number | null
  totalReserved: number
  autoConfirm: boolean
  optionalFields: { phone?: boolean; notes?: boolean }
  menuItems: ReservationMenuItem[]
}

export type FoodSelection = {
  menuItemId: string
  quantity: number
}

export type ReservationSubmission = {
  name: string
  email: string
  phone?: string
  notes?: string
  group_size: number
  food_selections?: FoodSelection[]
}

export type Reservation = {
  id: string
  name: string
  email: string
  phone?: string
  notes?: string
  group_size: number
  food_selections?: FoodSelection[]
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected'
  created_at: string
}

export type ReservationInfo = {
  isPublic: boolean
  shareToken: string | null
  reservationConfig: ReservationConfig | null
}
