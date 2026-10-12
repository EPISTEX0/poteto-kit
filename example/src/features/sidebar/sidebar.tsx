import { createNote, selectNote, useNotesState } from '@/client'

export function Sidebar() {
  const { notes, selectedId } = useNotesState()

  return (
    <aside className="sidebar" data-component="notes-sidebar" aria-label="Notes">
      <button
        type="button"
        className="new-note"
        aria-label="New note"
        data-action-id="notes.create"
        onClick={createNote}
      >
        New note
      </button>
      <ul className="note-list">
        {notes.map((note) => (
          <li key={note.id}>
            <button
              type="button"
              className="note-item"
              data-component="note-item"
              data-note-id={note.id}
              aria-current={note.id === selectedId}
              onClick={() => selectNote(note.id)}
            >
              {note.title || 'Untitled note'}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
