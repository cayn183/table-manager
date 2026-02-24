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
  user_id: string
  role: ClubRole
  description?: string | null
  joined_at: string
  name: string
  email: string
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

export type ClubEventTemplate = 'vereinsfest' | 'mitgliederversammlung' | 'vorstandsitzung' | 'arbeitseinsatz'

export interface ClubEventModules {
  room: boolean
  food: boolean
  reservation: boolean
}

export interface ClubRoomData {
  tables: import('../types/room').Table[]
  viewFrame?: import('../types/room').ViewFrame | null
}

export interface ClubToGoConfig {
  menuItems: import('../types/togo').MenuItem[]
  orders: import('../types/togo').ToGoOrder[]
}

export interface ClubEventData {
  eventDate: string         // ISO date string (YYYY-MM-DD)
  timeFrom: string          // "HH:MM"
  timeTo: string            // "HH:MM"
  template?: ClubEventTemplate | null
  modules: ClubEventModules
  // Room/table data stored by the room editor
  roomData?: ClubRoomData | null
  // ToGo/food config
  togoConfig?: ClubToGoConfig | null
  // Reservation config
  reservationConfig?: any
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

export const TEMPLATE_DEFAULTS: Record<ClubEventTemplate, ClubEventModules> = {
  vereinsfest: { room: true, food: true, reservation: true },
  mitgliederversammlung: { room: true, food: false, reservation: false },
  vorstandsitzung: { room: true, food: false, reservation: false },
  arbeitseinsatz: { room: false, food: false, reservation: false },
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
