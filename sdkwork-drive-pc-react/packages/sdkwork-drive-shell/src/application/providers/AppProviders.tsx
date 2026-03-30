import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAppStore } from '@sdkwork/drive-core';
import { LanguageManager } from './LanguageManager.tsx';
import { ThemeManager } from './ThemeManager.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const themeMode = useAppStore((state) => state.themeMode);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeManager />
      <LanguageManager />
      <BrowserRouter>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          theme={themeMode === 'system' ? 'system' : themeMode}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
