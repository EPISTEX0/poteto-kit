import { createStore } from '@/shared/create-store'

type SearchState = {
  open: boolean
  query: string
  activeIndex: number
}

const closed: SearchState = { open: false, query: '', activeIndex: 0 }

const store = createStore<SearchState>(closed)

export const useSearchState = store.use

export function openSearch() {
  store.set(() => ({ ...closed, open: true }))
}

export function closeSearch() {
  store.set(() => closed)
}

export function setQuery(query: string) {
  store.set((state) => ({ ...state, query, activeIndex: 0 }))
}

export function moveActive(delta: number, resultCount: number) {
  store.set((state) => {
    if (resultCount === 0) {
      return state
    }
    const next = (state.activeIndex + delta + resultCount) % resultCount
    return { ...state, activeIndex: next }
  })
}
