import type { Note } from './types'

export type IpcContract = {
  'notes:load': { response: Note[] }
}

type Channel = keyof IpcContract

const handlers = new Map<Channel, () => unknown>()

export function handle<C extends Channel>(channel: C, handler: () => IpcContract[C]['response']) {
  handlers.set(channel, handler)
}

export async function invoke<C extends Channel>(channel: C): Promise<IpcContract[C]['response']> {
  const handler = handlers.get(channel)
  if (!handler) {
    throw new Error(`No handler registered for ${channel}`)
  }
  return handler() as IpcContract[C]['response']
}
