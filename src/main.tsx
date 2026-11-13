import '@fontsource-variable/literata/opsz.css'
import '@fontsource-variable/inter/index.css'
import './styles.css'
import './theme/settings'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
