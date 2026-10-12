import { useSyncExternalStore } from 'react'

export function createStore<T>(initial: T) {
  let state = initial
  const listeners = new Set<() => void>()

  const get = () => state

  const set = (update: (previous: T) => T) => {
    state = update(state)
    listeners.forEach((listener) => listener())
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  const use = () => useSyncExternalStore(subscribe, get)

  return { get, set, use }
}
