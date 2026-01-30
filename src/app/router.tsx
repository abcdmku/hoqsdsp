import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { Dashboard } from '../pages/Dashboard';
import { ChannelStripPage } from '../pages/ChannelStrip';
import { EQEditorPage } from '../pages/EQEditor';
import { SignalFlowPage } from '../pages/SignalFlow';
import { RoutingPage } from '../pages/Routing';
import { SettingsPage } from '../pages/Settings';
import { HelpPage } from '../pages/Help';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'channels', element: <ChannelStripPage /> },
      { path: 'eq', element: <EQEditorPage /> },
      { path: 'signal-flow', element: <SignalFlowPage /> },
      { path: 'routing', element: <RoutingPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'help', element: <HelpPage /> },
    ],
  },
]);
