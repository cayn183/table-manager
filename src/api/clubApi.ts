import api from './apiClient'
import type { Club, ClubMember, ClubInvite, ClubActivity, ClubEvent } from '../types/club'

// ═══ Club CRUD ═════════════════════════════════════════════════════
export async function createClub(name: string): Promise<Club> {
  return api.post('/clubs', { name })
}

export async function getMyClubs(): Promise<Club[]> {
  return api.get('/clubs')
}

export async function getClub(clubId: string): Promise<Club> {
  return api.get(`/clubs/${clubId}`)
}

export async function updateClub(clubId: string, data: { name?: string; description?: string }): Promise<Club> {
  return api.patch(`/clubs/${clubId}`, data)
}

export async function deleteClub(clubId: string): Promise<void> {
  return api.del(`/clubs/${clubId}`)
}

// ═══ Members ═══════════════════════════════════════════════════════
export async function getClubMembers(clubId: string): Promise<ClubMember[]> {
  return api.get(`/clubs/${clubId}/members`)
}

export async function updateClubMember(clubId: string, userId: string, data: { role?: string; description?: string }): Promise<void> {
  return api.patch(`/clubs/${clubId}/members/${userId}`, data)
}

export async function removeClubMember(clubId: string, userId: string): Promise<void> {
  return api.del(`/clubs/${clubId}/members/${userId}`)
}

// ═══ Invites ═══════════════════════════════════════════════════════
export async function createInvite(clubId: string, opts?: { expires_in_hours?: number; max_uses?: number }): Promise<{ code: string; expires_at?: string; max_uses?: number }> {
  return api.post(`/clubs/${clubId}/invites`, opts || {})
}

export async function getInvites(clubId: string): Promise<ClubInvite[]> {
  return api.get(`/clubs/${clubId}/invites`)
}

export async function revokeInvite(clubId: string, inviteId: string): Promise<void> {
  return api.del(`/clubs/${clubId}/invites/${inviteId}`)
}

export async function joinClub(code: string): Promise<Club> {
  return api.post(`/clubs/join/${code}`)
}

// ═══ Club Events ═══════════════════════════════════════════════════
export async function getClubEvents(clubId: string): Promise<ClubEvent[]> {
  return api.get(`/clubs/${clubId}/events`)
}

export async function createClubEvent(clubId: string, data: { id?: string; title: string; data: any }): Promise<ClubEvent> {
  return api.post(`/clubs/${clubId}/events`, data)
}

export async function updateClubEvent(clubId: string, eventId: string, data: { title?: string; data?: any }): Promise<ClubEvent> {
  return api.patch(`/clubs/${clubId}/events/${eventId}`, data)
}

export async function deleteClubEvent(clubId: string, eventId: string): Promise<void> {
  return api.del(`/clubs/${clubId}/events/${eventId}`)
}

// ═══ Activity ══════════════════════════════════════════════════════
export async function getClubActivity(clubId: string, limit = 20): Promise<ClubActivity[]> {
  return api.get(`/clubs/${clubId}/activity?limit=${limit}`)
}

// ═══ Transfer Ownership ════════════════════════════════════════════
export async function transferOwnership(clubId: string, newOwnerId: string): Promise<void> {
  return api.post(`/clubs/${clubId}/transfer`, { newOwnerId })
}
