import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { selectNote, useNotesState } from '@/client'
import { filterNotes } from './filter-notes'
import { closeSearch, moveActive, openSearch, setQuery, useSearchState } from './search-store'

function bindShortcut() {
  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      openSearch()
    }
  }
  document.addEventListener('keydown', onKeyDown)
  return () => document.removeEventListener('keydown', onKeyDown)
}

export function SearchPalette() {
  const { notes } = useNotesState()
  const { open, query, activeIndex } = useSearchState()
  const results = filterNotes(notes, query)

  const choose = (id: string) => {
    selectNote(id)
    closeSearch()
  }

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      closeSearch()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(1, results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(-1, results.length)
    } else if (event.key === 'Enter') {
      const active = results[activeIndex]
      if (active) {
        choose(active.id)
      }
    }
  }

  return (
    <div ref={bindShortcut} data-component="search-host">
      {open && (
        <div
          className="search-overlay"
          role="dialog"
          aria-label="Search notes"
          data-component="search-palette"
        >
          <input
            className="search-input"
            aria-label="Search query"
            placeholder="Search notes"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
          />
          <ul className="search-results" role="listbox" aria-label="Search results">
            {results.map((note, index) => (
              <li key={note.id} role="presentation">
                <button
                  type="button"
                  className="search-result"
                  role="option"
                  aria-selected={index === activeIndex}
                  data-component="search-result"
                  data-note-id={note.id}
                  onClick={() => choose(note.id)}
                >
                  {note.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
