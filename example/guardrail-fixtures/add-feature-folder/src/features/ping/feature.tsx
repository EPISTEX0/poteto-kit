import { defineFeature } from '@/framework'
import { Ping } from './ping'

export default defineFeature({ id: 'ping', title: 'Ping', order: 40, slots: { topbar: Ping } })
