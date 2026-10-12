import { defineFeature } from '@/framework'
import { Editor } from './editor'

export default defineFeature({ id: 'editor', title: 'Editor', order: 20, slots: { main: Editor } })
