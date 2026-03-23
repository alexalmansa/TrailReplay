import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from '@/components/app/AppErrorBoundary'
import { startAnalytics } from '@/utils/analytics'
import { startWebVitalsTracking } from '@/utils/performance'

void startAnalytics();
void startWebVitalsTracking();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
