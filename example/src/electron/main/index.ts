import { handle } from '@/shared/ipc'
import type { Note } from '@/shared/types'

const seedNotes: Note[] = [
  { id: 'note-1', title: 'Welcome to Notes', body: 'Press Ctrl+K or Meta+K to search your notes.' },
  { id: 'note-2', title: 'Meeting agenda', body: 'Review the verification report before merging.' },
  { id: 'note-3', title: 'Grocery list', body: 'Oat milk, coffee beans, lemons.' },
]

export function startMain() {
  handle('notes:load', () => seedNotes.map((note) => ({ ...note })))
}
