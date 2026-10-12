import type { ComponentType } from 'react'

export type Slot = 'topbar' | 'left' | 'main' | 'overlay'

export type Feature = {
  id: string
  title: string
  order: number
  slots: Partial<Record<Slot, ComponentType>>
}

export function defineFeature(feature: Feature): Feature {
  return feature
}
