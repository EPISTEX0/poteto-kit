import { createRoot } from 'react-dom/client'
import { appConfig } from '@/app-config'
import { hydrateNotes } from '@/client'
import { startMain } from '@/electron/main'
import { discoverFeatures, Shell } from '@/framework'
import './styles.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Missing #root element')
}

startMain()
await hydrateNotes()
createRoot(container).render(<Shell title={appConfig.name} features={discoverFeatures()} />)
