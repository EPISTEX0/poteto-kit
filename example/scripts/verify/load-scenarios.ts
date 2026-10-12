import { readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Scenario } from './scenario'

const scenariosDir = fileURLToPath(new URL('./scenarios/', import.meta.url))

export async function loadScenarios(): Promise<Scenario[]> {
  const files = readdirSync(scenariosDir)
    .filter((name) => name.endsWith('.ts'))
    .sort()
  const loaded = await Promise.all(
    files.map(async (name) => {
      const module = (await import(pathToFileURL(`${scenariosDir}${name}`).href)) as {
        scenarios?: Scenario[]
      }
      if (!module.scenarios) {
        throw new Error(`scripts/verify/scenarios/${name} must export const scenarios: Scenario[]`)
      }
      return module.scenarios
    }),
  )
  return loaded.flat()
}
