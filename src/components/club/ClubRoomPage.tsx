// ============================================================================
// ClubRoomPage – Props-driven seating assignment component for club events.
// Embeds Room.tsx with club-event mode (no localStorage, saves via API).
// Used as the "seating" tab inside ClubEventDetail.
// ============================================================================
import React from 'react'
import Room from '../room/Room'
import type { ClubEventSeatingProps } from '../room/Room'

export type { ClubEventSeatingProps }

export default function ClubRoomPage(props: ClubEventSeatingProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <Room clubEventProps={props} />
    </div>
  )
}