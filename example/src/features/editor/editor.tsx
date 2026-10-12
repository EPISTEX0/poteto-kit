import { useState } from 'react'
import { updateNote, useNotesState } from '@/client'
import { commitTitle } from './commit-title'

export function Editor() {
  const { notes, selectedId } = useNotesState()
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({})
  const note = notes.find((candidate) => candidate.id === selectedId)

  if (!note) {
    return (
      <section className="editor" data-component="editor-empty">
        Select or create a note
      </section>
    )
  }

  const title = titleDrafts[note.id] ?? note.title

  return (
    <section className="editor" data-component="note-editor" data-note-id={note.id}>
      <input
        className="editor-title"
        aria-label="Note title"
        value={title}
        onChange={(event) => {
          setTitleDrafts({ ...titleDrafts, [note.id]: event.target.value })
          commitTitle(note.id, event.target.value)
        }}
      />
      <textarea
        className="editor-body"
        aria-label="Note body"
        value={note.body}
        onChange={(event) => updateNote(note.id, { body: event.target.value })}
      />
    </section>
  )
}
