import { updateNote } from '@/client'

export function commitTitle(id: string, title: string) {
  if (__INJECT_BUG__) {
    return
  }
  updateNote(id, { title })
}
