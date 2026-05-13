/**
 * Shared event module types used by both private events and club events.
 */

import type { Table, ViewFrame, AssignedGroup } from './room'
import type { MenuItem, ToGoOrder } from './togo'
import type { Group } from '../components/room/Importer'

// ── Base module flags (shared between private & club events) ──

export interface EventModules {
  room: boolean
  food: boolean
  reservation: boolean
  seating: boolean
  checklist?: boolean
  budget?: boolean
  timeline?: boolean
  // Private-only modules
  menu?: boolean
  guestInvite?: boolean
  dashboard?: boolean
}

// ── Club extends with invite module ──

export interface ClubEventModules extends EventModules {
  invite: boolean
}

// ── Shared data sub-structures ──

export interface EventRoomData {
  tables: Table[]
  viewFrame?: ViewFrame | null
  gridWidth?: number
  gridHeight?: number
}

export interface EventToGoConfig {
  menuItems: MenuItem[]
  orders: ToGoOrder[]
}

export interface EventSeatingData {
  groups: Group[]
  assignedGroups: Record<string, AssignedGroup[]>
}

// ── Checklist module data ──

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
  dueDate?: string
  priority?: 'low' | 'medium' | 'high'
  category?: string
  assignee?: string
}

export interface EventChecklistData {
  items: ChecklistItem[]
  categories?: string[]
}

// ── Budget module data ──

export interface BudgetItem {
  id: string
  name: string
  category: string
  estimated: number
  actual?: number
  paid?: boolean
  note?: string
  vendor?: string
}

export interface EventBudgetData {
  items: BudgetItem[]
  currency: string
  totalBudget?: number
}

// ── Timeline module data ──

export interface TimelineEntry {
  id: string
  time: string
  endTime?: string
  title: string
  description?: string
  location?: string
  responsible?: string
  icon?: string
}

export interface EventTimelineData {
  entries: TimelineEntry[]
  title?: string
}

// ── Menu planning module data (private events) ──

export interface MenuChoice {
  id: string
  name: string
  description?: string
  tags?: string[]  // e.g. 'vegetarisch', 'vegan', 'glutenfrei'
  price?: number
}

export interface MenuCourse {
  id: string
  name: string       // e.g. "Vorspeise", "Hauptgang", "Dessert"
  sortOrder: number
  choices: MenuChoice[]
}

export interface EventMenuData {
  title?: string       // e.g. "Hochzeitsmenü"
  courses: MenuCourse[]
  notes?: string       // e.g. "Bitte Allergien mitteilen"
}

// ── Guest invitation / RSVP module data (private events) ──

export interface GuestInvitation {
  id: string
  name: string
  email?: string
  phone?: string
  groupSize: number
  children?: number           // number of children in the group
  category?: string           // e.g. 'Familie Braut', 'Freunde', 'Arbeitskollegen'
  personalMessage?: string
  token: string
  status: 'pending' | 'accepted' | 'declined'
  respondedAt?: string
  dietaryNotes?: string
  notes?: string              // general notes about the guest
  menuSelections?: Record<string, string>  // courseId → choiceId
  confirmedCount?: number
  sentVia?: 'link' | 'email' | 'whatsapp' | 'qr' | 'manual'
  accommodation?: 'none' | 'needed' | 'arranged'
  tableAssignment?: string    // reference to table name/id from seating module
  lastReminderSent?: string
}

export interface EventGuestInviteData {
  // General sharing
  shareToken: string          // One token for the general event page
  shareMode: 'open' | 'invite-only'  // open = anyone with link can RSVP, invite-only = only personal links

  // Guest list
  invitations: GuestInvitation[]
  categories?: string[]       // custom guest categories

  // Event page content
  eventDescription?: string
  locationName?: string
  locationAddress?: string
  rsvpDeadline?: string

  // Integration with other modules
  allowMenuSelection?: boolean
  showTimeline?: boolean
  allowPlusOne?: boolean
  maxGuests?: number

  // Email template
  emailSubject?: string
  emailBody?: string
}

// ── Guest dashboard config (private events) ──

export interface EventDashboardConfig {
  welcomeMessage?: string
  showTimeline: boolean
  showMenu: boolean
  showSeating: boolean
  showLocation: boolean
  locationName?: string
  locationAddress?: string
  additionalInfo?: string
  dressCode?: string
  contactPhone?: string
  contactEmail?: string
  giftRegistryUrl?: string
  showCountdown?: boolean
}

// ── Private event data ──

export interface PrivateEventData {
  eventDate: string
  timeFrom: string
  timeTo: string
  modules: EventModules
  roomData?: EventRoomData | null
  togoConfig?: EventToGoConfig | null
  seatingData?: EventSeatingData | null
  checklistData?: EventChecklistData | null
  budgetData?: EventBudgetData | null
  timelineData?: EventTimelineData | null
  menuData?: EventMenuData | null
  guestInviteData?: EventGuestInviteData | null
  dashboardConfig?: EventDashboardConfig | null
  reservationConfig?: any
  syncedReservationIds?: string[]
}

// ── Private event item (as stored in localStorage / synced to backend) ──

export interface PrivateEventItem {
  id: string
  name: string
  eventDate?: string
  from?: string
  to?: string
  roomId?: string
  createdAt?: string
  lastModified?: string
  modules: EventModules
  roomData?: EventRoomData | null
  togoConfig?: EventToGoConfig | null
  seatingData?: EventSeatingData | null
  checklistData?: EventChecklistData | null
  budgetData?: EventBudgetData | null
  timelineData?: EventTimelineData | null
  menuData?: EventMenuData | null
  guestInviteData?: EventGuestInviteData | null
  dashboardConfig?: EventDashboardConfig | null
  reservationConfig?: any
  syncedReservationIds?: string[]
  /** Module keys the user marked as "done" — hidden from tab bar */
  completedModules?: string[]
  // Legacy fields for backward compatibility
  isToGo?: boolean
  noRoom?: boolean
  assignedGroups?: Record<string, AssignedGroup[]>
  groups?: Group[]
}

// ── Module definitions for UI ──

export interface ModuleOption {
  key: keyof EventModules
  label: string
  icon: string
  description: string
}

export const PRIVATE_MODULE_OPTIONS: ModuleOption[] = [
  { key: 'room', label: 'Raumplanung', icon: '🏠', description: 'Raumaufteilung & Tische platzieren' },
  { key: 'seating', label: 'Tischplanung', icon: '🪑', description: 'Gäste den Tischen zuweisen' },
  { key: 'menu', label: 'Menüplanung', icon: '🍽️', description: 'Menü mit Gängen & Auswahl gestalten' },
  { key: 'guestInvite', label: 'Einladungen', icon: '💌', description: 'Persönliche Einladungen per QR-Code versenden' },
  { key: 'dashboard', label: 'Gäste-Info', icon: '📱', description: 'Info-Dashboard für eingeladene Gäste' },
  { key: 'checklist', label: 'Checkliste', icon: '✅', description: 'Aufgaben & To-dos für die Eventplanung' },
  { key: 'budget', label: 'Budgetplanung', icon: '💰', description: 'Kosten planen und nachverfolgen' },
  { key: 'timeline', label: 'Ablaufplan', icon: '⏱️', description: 'Zeitlicher Ablauf des Events' },
]

// ── Private event template presets ──

export type PrivateEventTemplate = 'hochzeit' | 'geburtstag' | 'jubilaeum' | 'firmenfeier'

export const PRIVATE_TEMPLATE_LABELS: Record<PrivateEventTemplate, string> = {
  hochzeit: 'Hochzeit',
  geburtstag: 'Geburtstag',
  jubilaeum: 'Jubiläum',
  firmenfeier: 'Firmenfeier',
}

export const PRIVATE_TEMPLATE_DEFAULTS: Record<PrivateEventTemplate, EventModules> = {
  hochzeit: { room: true, food: false, reservation: false, seating: true, checklist: true, budget: true, timeline: true, menu: true, guestInvite: true, dashboard: true },
  geburtstag: { room: true, food: false, reservation: false, seating: true, checklist: true, budget: false, timeline: false, menu: false, guestInvite: true, dashboard: false },
  jubilaeum: { room: true, food: false, reservation: false, seating: true, checklist: true, budget: true, timeline: true, menu: true, guestInvite: true, dashboard: true },
  firmenfeier: { room: true, food: false, reservation: false, seating: true, checklist: true, budget: true, timeline: true, menu: true, guestInvite: false, dashboard: false },
}

/** Migrate a legacy private event to the new module-based structure */
export function migratePrivateEvent(event: any): PrivateEventItem {
  if (event.modules) {
    // Ensure new module fields have defaults for older module-based events
    const m = event.modules
    if (m.checklist === undefined) m.checklist = false
    if (m.budget === undefined) m.budget = false
    if (m.timeline === undefined) m.timeline = false
    if (m.menu === undefined) m.menu = false
    if (m.guestInvite === undefined) m.guestInvite = false
    if (m.dashboard === undefined) m.dashboard = false
    return event as PrivateEventItem
  }

  const modules: EventModules = {
    room: !!event.roomId || (!event.noRoom && !event.isToGo),
    food: !!event.isToGo || !!event.toGoConfig,
    reservation: false,
    seating: !!event.roomId || (!event.noRoom && !event.isToGo),
    checklist: false,
    budget: false,
    timeline: false,
  }

  return {
    ...event,
    modules,
    // Migrate legacy toGoConfig
    togoConfig: event.toGoConfig || (event.isToGo ? { menuItems: [], orders: [] } : null),
    // Migrate legacy groups/assignedGroups into seatingData
    seatingData: (event.groups || event.assignedGroups)
      ? { groups: event.groups || [], assignedGroups: event.assignedGroups || {} }
      : null,
  } as PrivateEventItem
}
