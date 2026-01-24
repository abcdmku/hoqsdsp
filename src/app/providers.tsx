import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '../components/ui/Tooltip';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export { queryClient };
