import { invoke } from '@/shared/ipc'
import type { Note } from '@/shared/types'

export function loadNotes(): Promise<Note[]> {
  return invoke('notes:load')
}
