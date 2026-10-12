import { createStore } from '@/shared/create-store'

const store = createStore({ expanded: false })

export const useExpanded = store.use

export const expand = () => store.set(() => ({ expanded: true }))
