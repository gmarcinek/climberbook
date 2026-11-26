'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';

export default function QueryClientContext({ children }: PropsWithChildren) {
  // One client per mount; creating it on every render dropped the cache and
  // made invalidations miss the mounted queries.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
