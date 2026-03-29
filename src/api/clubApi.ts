import api from './apiClient'
import type { Club, ClubMember, ClubInvite, ClubActivity, ClubEvent, ClubMemberProfileInput, MergeSuggestion } from '../types/club'
import type { ReservationInfo, Reservation } from '../types/reservation'

// ═══ Club CRUD ═════════════════════════════════════════════════════
export async function createClub(name: string, token?: string): Promise<Club> {
  return api.post('/clubs', { name }, token)
}

export async function getMyClubs(token?: string): Promise<Club[]> {
  return api.get('/clubs', token)
}

export async function getClub(clubId: string, token?: string): Promise<Club> {
  return api.get(`/clubs/${clubId}`, token)
}

export async function updateClub(clubId: string, data: { name?: string; description?: string }, token?: string): Promise<Club> {
  return api.patch(`/clubs/${clubId}`, data, token)
}

export async function deleteClub(clubId: string, token?: string): Promise<void> {
  return api.del(`/clubs/${clubId}`, token)
}

// ═══ Members ═══════════════════════════════════════════════════════
export async function getClubMembers(clubId: string, token?: string): Promise<ClubMember[]> {
  return api.get(`/clubs/${clubId}/members`, token)
}

export async function updateClubMember(clubId: string, userId: string, data: { role?: string; description?: string }, token?: string): Promise<void> {
  return api.patch(`/clubs/${clubId}/members/${userId}`, data, token)
}

export async function removeClubMember(clubId: string, userId: string, token?: string): Promise<void> {
  return api.del(`/clubs/${clubId}/members/${userId}`, token)
}

export async function removeClubMemberById(clubId: string, memberId: string, token?: string): Promise<void> {
  return api.del(`/clubs/${clubId}/members/${memberId}?byMemberId=1`, token)
}

export async function createManualMember(clubId: string, data: ClubMemberProfileInput & { first_name: string; last_name: string }, token?: string): Promise<ClubMember> {
  return api.post(`/clubs/${clubId}/members`, data, token)
}

export async function updateMemberProfile(clubId: string, memberId: string, data: ClubMemberProfileInput, token?: string): Promise<ClubMember> {
  return api.patch(`/clubs/${clubId}/members/${memberId}/profile`, data, token)
}

export async function getMergeSuggestions(clubId: string, token?: string): Promise<MergeSuggestion[]> {
  return api.get(`/clubs/${clubId}/members/merge-suggestions`, token)
}

export async function mergeMembers(clubId: string, manualMemberId: string, realMemberId: string, token?: string): Promise<void> {
  return api.post(`/clubs/${clubId}/members/${manualMemberId}/merge/${realMemberId}`, {}, token)
}

// ═══ Invites ═══════════════════════════════════════════════════════
export async function createInvite(clubId: string, opts?: { expires_in_hours?: number; max_uses?: number }, token?: string): Promise<{ code: string; expires_at?: string; max_uses?: number }> {
  return api.post(`/clubs/${clubId}/invites`, opts || {}, token)
}

export async function getInvites(clubId: string, token?: string): Promise<ClubInvite[]> {
  return api.get(`/clubs/${clubId}/invites`, token)
}

export async function revokeInvite(clubId: string, inviteId: string, token?: string): Promise<void> {
  return api.del(`/clubs/${clubId}/invites/${inviteId}`, token)
}

export async function joinClub(code: string, token?: string): Promise<Club> {
  return api.post(`/clubs/join/${code}`, {}, token)
}

// ═══ Club Events ═══════════════════════════════════════════════════
export async function getClubEvents(clubId: string, token?: string): Promise<ClubEvent[]> {
  return api.get(`/clubs/${clubId}/events`, token)
}

export async function createClubEvent(clubId: string, data: { id?: string; title: string; data: any }, token?: string): Promise<ClubEvent> {
  return api.post(`/clubs/${clubId}/events`, data, token)
}

export async function updateClubEvent(clubId: string, eventId: string, data: { title?: string; data?: any }, token?: string): Promise<ClubEvent> {
  return api.patch(`/clubs/${clubId}/events/${eventId}`, data, token)
}

export async function deleteClubEvent(clubId: string, eventId: string, token?: string): Promise<void> {
  return api.del(`/clubs/${clubId}/events/${eventId}`, token)
}

export async function getClubEvent(clubId: string, eventId: string, token?: string): Promise<ClubEvent> {
  return api.get(`/clubs/${clubId}/events/${eventId}`, token)
}

export async function publishClubEvent(clubId: string, eventId: string, reservationConfig?: any, token?: string): Promise<{ ok: boolean; shareToken: string; reservationConfig: any }> {
  return api.post(`/clubs/${clubId}/events/${eventId}/publish`, { reservationConfig }, token)
}

export async function unpublishClubEvent(clubId: string, eventId: string, token?: string): Promise<void> {
  return api.post(`/clubs/${clubId}/events/${eventId}/unpublish`, {}, token)
}

export async function getClubEventReservationInfo(clubId: string, eventId: string, token?: string): Promise<ReservationInfo> {
  return api.get(`/clubs/${clubId}/events/${eventId}/reservation-info`, token)
}

export async function sendEventInvitations(clubId: string, eventId: string, payload: { memberIds: string[]; subject?: string; header?: string; logoUrl?: string; body: string }, token?: string): Promise<any> {
  return api.post(`/clubs/${clubId}/events/${eventId}/send-invitations`, payload, token)
}

export async function downloadEventSerienPdf(clubId: string, eventId: string, payload: { memberIds: string[]; header?: string; logoUrl?: string; body: string }, token?: string) {
  // Use direct fetch to obtain binary PDF without api.request text parsing
  const RUNTIME_BASE = typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.VITE_API_URL
  const BUILD_BASE = (import.meta as any).env?.VITE_API_URL
  let BASE = RUNTIME_BASE || BUILD_BASE
  if (!BASE) {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const proto = window.location.protocol
        const host = window.location.hostname
        BASE = `${proto}//${host}:4000`
      }
    } catch (e) {
      BASE = 'http://localhost:4000'
    }
  }

  const res = await fetch(`${BASE}/clubs/${clubId}/events/${eventId}/serienpdf`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload),
  })
  return res
}

export async function getClubEventReservations(clubId: string, eventId: string, token?: string): Promise<Reservation[]> {
  return api.get(`/clubs/${clubId}/events/${eventId}/reservations`, token)
}

export async function updateClubReservationStatus(
  clubId: string, eventId: string, reservationId: string,
  status: 'confirmed' | 'rejected', token?: string
): Promise<{ id: string; status: string }> {
  return api.patch(`/clubs/${clubId}/events/${eventId}/reservations/${reservationId}`, { status }, token)
}

// ═══ Activity ══════════════════════════════════════════════════════
export interface ActivityQuery {
  limit?: number
  before?: string
  action?: string
  user_id?: string
  from?: string
  to?: string
}

export interface ActivityPage {
  items: ClubActivity[]
  hasMore: boolean
  nextCursor: string | null
}

export async function getClubActivity(clubId: string, query: ActivityQuery = {}, token?: string): Promise<ActivityPage> {
  const params = new URLSearchParams()
  if (query.limit) params.set('limit', String(query.limit))
  if (query.before) params.set('before', query.before)
  if (query.action) params.set('action', query.action)
  if (query.user_id) params.set('user_id', query.user_id)
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  const qs = params.toString()
  return api.get(`/clubs/${clubId}/activity${qs ? '?' + qs : ''}`, token)
}

export function getClubActivityCsvUrl(clubId: string, query: ActivityQuery = {}): string {
  const base = (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.VITE_API_URL) ||
    (import.meta as any).env?.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000`
  const params = new URLSearchParams({ format: 'csv' })
  if (query.action) params.set('action', query.action)
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  if (query.limit) params.set('limit', String(query.limit))
  return `${base}/clubs/${clubId}/activity?${params.toString()}`
}

// ═══ Templates ═══════════════════════════════════════════════════
export async function getClubTemplates(clubId: string, token?: string) {
  return api.get(`/clubs/${clubId}/templates`, token)
}

export async function createClubTemplate(clubId: string, data: { name: string; type?: string; content: string }, token?: string) {
  return api.post(`/clubs/${clubId}/templates`, data, token)
}

export async function updateClubTemplate(clubId: string, templateId: string, data: { name?: string; content?: string }, token?: string) {
  return api.patch(`/clubs/${clubId}/templates/${templateId}`, data, token)
}

export async function deleteClubTemplate(clubId: string, templateId: string, token?: string) {
  return api.del(`/clubs/${clubId}/templates/${templateId}`, token)
}

// ═══ Clone system template into a club ═══════════════════════════
export async function cloneSystemTemplate(clubId: string, systemTemplateId: string, token?: string) {
  return api.post(`/clubs/${clubId}/templates/clone/${systemTemplateId}`, {}, token)
}

// ═══ System Templates (read, any authenticated user) ══════════════
export async function getSystemTemplates(token?: string) {
  return api.get('/clubs/system-templates', token)
}

// ═══ Admin: System Templates CRUD ════════════════════════════════
export async function adminGetSystemTemplates(token?: string) {
  return api.get('/admin/system-templates', token)
}

export async function adminCreateSystemTemplate(data: { name: string; type?: string; content: string }, token?: string) {
  return api.post('/admin/system-templates', data, token)
}

export async function adminUpdateSystemTemplate(id: string, data: { name?: string; content?: string }, token?: string) {
  return api.patch(`/admin/system-templates/${id}`, data, token)
}

export async function adminDeleteSystemTemplate(id: string, token?: string) {
  return api.del(`/admin/system-templates/${id}`, token)
}

// ═══ Transfer Ownership ════════════════════════════════════════════
export async function transferOwnership(clubId: string, newOwnerId: string, token?: string): Promise<void> {
  return api.post(`/clubs/${clubId}/transfer`, { newOwnerId }, token)
}

// ═══ Club Rooms ════════════════════════════════════════════════════
export async function getClubRooms(clubId: string, token?: string): Promise<any[]> {
  return api.get(`/clubs/${clubId}/rooms`, token)
}

export async function createClubRoom(clubId: string, data: { name: string; data: object }, token?: string): Promise<any> {
  return api.post(`/clubs/${clubId}/rooms`, data, token)
}

export async function updateClubRoom(clubId: string, roomId: string, data: { name?: string; data?: object }, token?: string): Promise<any> {
  return api.put(`/clubs/${clubId}/rooms/${roomId}`, data, token)
}

export async function deleteClubRoom(clubId: string, roomId: string, token?: string): Promise<void> {
  return api.del(`/clubs/${clubId}/rooms/${roomId}`, token)
}
