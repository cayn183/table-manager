// Types for room planning
import type { Group } from '../components/Importer'

export type Table = {
  id: string
  x: number
  y: number
  capacity: number
  width: number
  height: number
}

export type ViewFrame = {
  x: number
  y: number
  width: number
  height: number
}

export type Room = {
  tables: Table[]
  viewFrame?: ViewFrame
}

export type AssignedGroup = {
  group: Group
  rotation: number
  locked: boolean
  x: number
  y: number
  color: string
}

export type DraggingMeta = { tableId?: string; agIdx?: number } | null
