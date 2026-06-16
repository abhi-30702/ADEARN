import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import './index.css';

const sentryDsn = import.meta.env['VITE_SENTRY_DSN'] as string | undefined;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env['MODE'] as string,
    tracesSampleRate: import.meta.env['PROD'] ? 0.2 : 1.0,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

function AppWithErrorBoundary() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {sentryDsn ? (
      <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
        <AppWithErrorBoundary />
      </Sentry.ErrorBoundary>
    ) : (
      <AppWithErrorBoundary />
    )}
  </React.StrictMode>
);
