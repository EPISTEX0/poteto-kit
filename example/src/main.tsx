import { createRoot } from 'react-dom/client'
import { appConfig } from '@/app-config'
import { resetNotes } from '@/client'
import { startMain } from '@/electron/main'
import { loadNotes } from '@/electron/renderer'
import { discoverFeatures, Shell } from '@/framework'
import './styles.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Missing #root element')
}

startMain()
resetNotes(await loadNotes())
createRoot(container).render(<Shell title={appConfig.name} features={discoverFeatures()} />)
