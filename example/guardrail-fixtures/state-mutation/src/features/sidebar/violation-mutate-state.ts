import { useNotesState } from '@/client'

export function blankTitles() {
  for (const note of useNotesState().notes) {
    note.title = ''
  }
}

export function clearSelection() {
  const state = useNotesState()
  state.selectedId = null
}

export function blankFirstBody() {
  useNotesState().notes[0]!.body = ''
}

export function appendNote() {
  useNotesState().notes.push({ id: 'x', title: '', body: '' })
}
