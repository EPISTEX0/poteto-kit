import { defineFeature } from '@/framework'
import { SearchButton } from './search-button'
import { SearchPalette } from './search-palette'

export default defineFeature({
  id: 'search',
  title: 'Search',
  order: 30,
  slots: { topbar: SearchButton, overlay: SearchPalette },
})
