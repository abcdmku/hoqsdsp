import { Outlet } from 'react-router-dom';
import { Providers } from './providers';
import { TopNav, Sidebar, StatusBar } from '../components/layout';
import { useGlobalShortcuts, AriaLiveRegion, useConnectionAnnouncements, useConnectionManager } from '../hooks';
import { ErrorBoundary, Toaster } from '../components/feedback';

function AppLayout() {
  // Register global keyboard shortcuts
  useGlobalShortcuts();

  // Announce connection status changes to screen readers
  useConnectionAnnouncements();

  // Manage WebSocket connections at app level (persists across route changes)
  useConnectionManager();

  return (
    <div className="h-screen flex flex-col bg-dsp-bg">
      {/* Skip to main content link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <TopNav />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main
          id="main-content"
          className="flex-1 overflow-auto"
          role="main"
          aria-label="Main content"
        >
          <Outlet />
        </main>
      </div>
      <StatusBar />

      {/* ARIA live regions for screen reader announcements */}
      <AriaLiveRegion />
    </div>
  );
}

export default function App() {
  return (
    <Providers>
      <ErrorBoundary>
        <AppLayout />
      </ErrorBoundary>
      <Toaster />
    </Providers>
  );
}
