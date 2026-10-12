import type { Feature } from './feature'

const modules = import.meta.glob<{ default: Feature }>('/src/features/*/feature.tsx', { eager: true })

export function discoverFeatures(): Feature[] {
  const features = Object.entries(modules).map(([path, module]) => {
    const folder = path.split('/').at(-2)
    if (module.default.id !== folder) {
      throw new Error(`${path} defines feature "${module.default.id}" but lives in folder "${folder}"`)
    }
    return module.default
  })
  return features.sort((a, b) => a.order - b.order)
}
