import { defineFeature } from '@/framework'
import { Sidebar } from './sidebar'

export default defineFeature({ id: 'sidebar', title: 'Sidebar', order: 10, slots: { left: Sidebar } })
