import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App'
import VaultProvider from './components/VaultProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <VaultProvider>
      <App />
    </VaultProvider>
  </StrictMode>,
)
