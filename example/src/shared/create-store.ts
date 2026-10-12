import { useSyncExternalStore } from 'react'
import { deepFreeze } from './deep-freeze'

export function createStore<T>(initial: T) {
  let state = deepFreeze(initial)
  const listeners = new Set<() => void>()

  const get = () => state

  const set = (update: (previous: T) => T) => {
    state = deepFreeze(update(state))
    listeners.forEach((listener) => listener())
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  const use = () => useSyncExternalStore(subscribe, get, get)

  return { get, set, use }
}
