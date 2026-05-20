// ============================================================================
// ClubRoomPage � Props-driven seating assignment component for club events.
// Embeds Room.tsx with club-event mode (no localStorage, saves via API).
// Used as the "seating" tab inside ClubEventDetail.
// ============================================================================
import React, { forwardRef } from 'react'
import Room from '../room/Room'
import type { ClubEventSeatingProps } from '../room/Room'

export type { ClubEventSeatingProps }

const ClubRoomPage = forwardRef(function ClubRoomPage(props: ClubEventSeatingProps, ref) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <Room ref={ref as any} clubEventProps={props} />
    </div>
  )
})

export default ClubRoomPage