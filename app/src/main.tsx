import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from '@/utils/analytics'
import { startWebVitalsTracking } from '@/utils/performance'

void initAnalytics();
void startWebVitalsTracking();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
