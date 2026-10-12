import { loadNotes } from '@/electron/renderer'
import { createStore } from '@/shared/create-store'
import type { DeepReadonly, Note } from '@/shared/types'

export type NotesState = DeepReadonly<{
  notes: Note[]
  selectedId: string | null
  nextId: number
}>

const store = createStore<NotesState>({ notes: [], selectedId: null, nextId: 1 })

export const useNotesState = store.use

function nextIdAfter(notes: readonly Note[]) {
  const numbers = notes.map((note) => Number(/^note-(\d+)$/.exec(note.id)?.[1] ?? 0))
  return Math.max(0, ...numbers) + 1
}

export async function hydrateNotes() {
  const notes = await loadNotes()
  store.set(() => ({ notes, selectedId: notes[0]?.id ?? null, nextId: nextIdAfter(notes) }))
}

export function createNote() {
  store.set((state) => {
    const note: Note = { id: `note-${state.nextId}`, title: 'Untitled note', body: '' }
    return { notes: [note, ...state.notes], selectedId: note.id, nextId: state.nextId + 1 }
  })
}

export function selectNote(id: string) {
  store.set((state) => ({ ...state, selectedId: id }))
}

export function updateNote(id: string, patch: Partial<Pick<Note, 'title' | 'body'>>) {
  store.set((state) => ({
    ...state,
    notes: state.notes.map((note) => (note.id === id ? { ...note, ...patch } : note)),
  }))
}

