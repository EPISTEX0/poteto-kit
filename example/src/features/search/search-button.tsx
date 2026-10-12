import { openSearch } from './search-store'

export function SearchButton() {
  return (
    <button
      type="button"
      className="search-button"
      aria-label="Open search"
      data-action-id="search.open"
      onClick={openSearch}
    >
      Search
      <kbd>Ctrl K</kbd>
    </button>
  )
}
