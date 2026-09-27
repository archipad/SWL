import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initPwaUpdateBanner } from './pwaUpdate'
import './index.css'
import App from './App.tsx'

initPwaUpdateBanner()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
