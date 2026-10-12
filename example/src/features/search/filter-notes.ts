import type { Note } from '@/shared/types'

export function filterNotes(notes: readonly Note[], query: string): Note[] {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return [...notes]
  }
  return notes.filter(
    (note) => note.title.toLowerCase().includes(needle) || note.body.toLowerCase().includes(needle),
  )
}
