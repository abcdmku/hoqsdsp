import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { Dashboard } from '../pages/Dashboard';
import { ChannelStripPage } from '../pages/ChannelStrip';
import { EQEditorPage } from '../pages/EQEditor';
import { RoutingPage } from '../pages/Routing';
import { SettingsPage } from '../pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'channels', element: <ChannelStripPage /> },
      { path: 'eq', element: <EQEditorPage /> },
      { path: 'routing', element: <RoutingPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
