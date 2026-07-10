'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } }));
  return (
    <QueryClientProvider client={qc}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a1628', color: '#f0f6ff',
            border: '1px solid rgba(59,140,255,.25)', borderRadius: '10px', fontSize: '13px',
          },
        }}
      />
    </QueryClientProvider>
  );
}
