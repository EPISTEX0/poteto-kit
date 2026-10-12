import { store } from './commands'

export const wipeNotes = () => store.set((state) => ({ ...state, notes: [], selectedId: null }))
