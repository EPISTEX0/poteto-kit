import { defineFeature } from '@/framework'
import { Ghost } from './ghost'

export default defineFeature({ id: 'ghost', title: 'Ghost', order: 90, slots: { main: Ghost } })
