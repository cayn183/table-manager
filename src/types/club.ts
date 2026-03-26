export type ClubRole = 'owner' | 'vorstand' | 'mitglied'

export interface Club {
  id: string
  name: string
  description?: string | null
  logo_url?: string | null
  created_at: string
  created_by: string
  my_role: ClubRole
  my_description?: string | null
  member_count: number
}

export interface ClubMember {
  id: string
  user_id: string | null
  role: ClubRole
  description?: string | null
  joined_at: string
  // Registered user fields (null for manual members)
  name: string | null
  email: string | null
  // Manual member fields
  is_manual: boolean
  first_name?: string | null
  last_name?: string | null
  member_since?: string | null
  display_name: string
  // Extended profile
  salutation?: string | null
  phone?: string | null
  address?: string | null
  iban?: string | null
  bic?: string | null
  notes?: string | null
  contact_email?: string | null
  birth_date?: string | null
  custom_role?: string | null
}

export interface ClubMemberProfileInput {
  first_name?: string
  last_name?: string
  salutation?: string
  role?: ClubRole
  member_since?: string
  phone?: string
  address?: string
  iban?: string
  bic?: string
  notes?: string
  contact_email?: string
  birth_date?: string
}

export interface MergeSuggestion {
  manual_member_id: string
  manual_name: string
  user_id: string
  user_name: string
  user_email: string
  real_member_id: string
}

export interface ClubInvite {
  id: string
  club_id: string
  code: string
  created_by: string
  created_by_name?: string
  created_at: string
  expires_at?: string | null
  max_uses?: number | null
  used_count: number
}

export interface ClubActivity {
  id: string
  club_id: string
  user_id?: string | null
  user_name?: string | null
  action: string
  details: Record<string, any>
  created_at: string
}

// Re-export shared module types from event.ts
export type { ClubEventModules, EventRoomData, EventToGoConfig, EventSeatingData } from './event'
// Keep local aliases for backward compatibility
export type ClubRoomData = import('./event').EventRoomData
export type ClubToGoConfig = import('./event').EventToGoConfig
export type ClubSeatingData = import('./event').EventSeatingData

export type ClubEventTemplate = 'vereinsfest' | 'mitgliederversammlung' | 'vorstandsitzung' | 'arbeitseinsatz'

export interface ClubEventData {
  eventDate: string
  timeFrom: string
  timeTo: string
  template?: ClubEventTemplate | null
  modules: import('./event').ClubEventModules
  roomData?: import('./event').EventRoomData | null
  togoConfig?: import('./event').EventToGoConfig | null
  seatingData?: import('./event').EventSeatingData | null
  reservationConfig?: any
  syncedReservationIds?: string[]
  invitedMemberIds?: string[]
}

export interface ClubEvent {
  id: string
  title: string
  data: ClubEventData
  created_at: string
  updated_at: string
  is_public?: boolean
  share_token?: string | null
}

export const TEMPLATE_LABELS: Record<ClubEventTemplate, string> = {
  vereinsfest: 'Vereinsfest',
  mitgliederversammlung: 'Mitgliederversammlung',
  vorstandsitzung: 'Vorstandssitzung',
  arbeitseinsatz: 'Arbeitseinsatz',
}

export const TEMPLATE_DEFAULTS: Record<ClubEventTemplate, import('./event').ClubEventModules> = {
  vereinsfest: { room: true, food: true, reservation: true, seating: true, invite: false },
  mitgliederversammlung: { room: true, food: false, reservation: false, seating: false, invite: false },
  vorstandsitzung: { room: true, food: false, reservation: false, seating: false, invite: false },
  arbeitseinsatz: { room: false, food: false, reservation: false, seating: false, invite: false },
}

/** Maps activity action keys to human-readable German labels */
export const ACTIVITY_LABELS: Record<string, string> = {
  club_created: 'Verein erstellt',
  club_updated: 'Verein bearbeitet',
  member_joined: 'Mitglied beigetreten',
  member_left: 'Mitglied ausgetreten',
  member_removed: 'Mitglied entfernt',
  member_updated: 'Mitglied bearbeitet',
  invite_created: 'Einladung erstellt',
  invite_revoked: 'Einladung widerrufen',
  event_created: 'Event erstellt',
  event_updated: 'Event bearbeitet',
  event_deleted: 'Event gelöscht',
  ownership_transferred: 'Eigentümer gewechselt',
}

export const ROLE_LABELS: Record<ClubRole, string> = {
  owner: 'Eigentümer',
  vorstand: 'Vorstand',
  mitglied: 'Mitglied',
}