import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import AuthProvider from './auth/AuthProvider.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: (failureCount, error) => ![401, 403, 404].includes(error?.status) && failureCount < 1, staleTime: 30_000 } },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider><App /></AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
