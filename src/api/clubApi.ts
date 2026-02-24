import api from './apiClient'
import type { Club, ClubMember, ClubInvite, ClubActivity, ClubEvent } from '../types/club'

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

// ═══ Activity ══════════════════════════════════════════════════════
export async function getClubActivity(clubId: string, limit = 20, token?: string): Promise<ClubActivity[]> {
  return api.get(`/clubs/${clubId}/activity?limit=${limit}`, token)
}

// ═══ Transfer Ownership ════════════════════════════════════════════
export async function transferOwnership(clubId: string, newOwnerId: string, token?: string): Promise<void> {
  return api.post(`/clubs/${clubId}/transfer`, { newOwnerId }, token)
}
