import { createStore } from '@/shared/create-store'
import type { Note } from '@/shared/types'

const shadowNotes = createStore<{ notes: readonly Note[] }>({ notes: [] })

export const wipeShadowNotes = () => shadowNotes.set(() => ({ notes: [] }))
