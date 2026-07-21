import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './index.css';

// ─── React Query Client ────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 5, // 5 phút – data được coi là fresh
      gcTime:               1000 * 60 * 10, // 10 phút – cache giữ lại sau khi unmount
      retry:                1,              // Retry 1 lần khi query fail
      refetchOnWindowFocus: false,          // Không refetch khi switch tab
    },
    mutations: {
      retry: 0, // Mutation không retry tự động
    },
  },
});

// ─── Root Mount ───────────────────────────────────────────────────────────────
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    {/* SEO: React Helmet Async */}
    <HelmetProvider>
      {/* Data fetching: TanStack Query */}
      <QueryClientProvider client={queryClient}>
        {/* Routing: React Router v6 */}
        <BrowserRouter>
          <App />
        </BrowserRouter>

        {/* DevTools: chỉ hiển thị trong development */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        )}
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);
