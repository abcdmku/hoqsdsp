import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import { Dashboard } from '../pages/Dashboard';
import { SignalFlowPage } from '../pages/SignalFlow';
import { OpusPage } from '../pages/opus/OpusPage';
import { RoutingPage } from '../pages/Routing';
import { SettingsPage } from '../pages/Settings';
import { HelpPage } from '../pages/Help';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'channels', element: <Navigate to="/" replace /> },
      { path: 'signal-flow', element: <SignalFlowPage /> },
      { path: 'opus', element: <OpusPage /> },
      { path: 'routing', element: <RoutingPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'help', element: <HelpPage /> },
    ],
  },
]);
