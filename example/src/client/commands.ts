import { createStore } from '@/shared/create-store'
import type { Note } from '@/shared/types'

export type NotesState = {
  notes: readonly Note[]
  selectedId: string | null
  nextId: number
}

const store = createStore<NotesState>({ notes: [], selectedId: null, nextId: 1 })

export const useNotesState = store.use

export function resetNotes(notes: readonly Note[]) {
  store.set(() => ({ notes, selectedId: notes[0]?.id ?? null, nextId: notes.length + 1 }))
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
