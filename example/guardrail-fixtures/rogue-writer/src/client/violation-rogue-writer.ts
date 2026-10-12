import { notesStore } from './commands'

export const wipeNotes = () => notesStore.set((state) => ({ ...state, notes: [] }))
