import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { LucideProvider } from 'lucide-react'
import './index.css'
import { router } from './router.js'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: (failureCount, error) => ![401, 403, 404].includes((error as any)?.status) && failureCount < 1, staleTime: 30_000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LucideProvider strokeWidth={1.7}>
        <RouterProvider router={router} />
      </LucideProvider>
    </QueryClientProvider>
  </StrictMode>,
)
