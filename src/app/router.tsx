import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { Dashboard } from '../pages/Dashboard';
import { ChannelStripPage } from '../pages/ChannelStrip';

function EQView() {
  return <div className="p-6"><h2 className="text-xl font-semibold">EQ Editor</h2></div>;
}

function RoutingView() {
  return <div className="p-6"><h2 className="text-xl font-semibold">Routing</h2></div>;
}

function SettingsView() {
  return <div className="p-6"><h2 className="text-xl font-semibold">Settings</h2></div>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'channels', element: <ChannelStripPage /> },
      { path: 'eq', element: <EQView /> },
      { path: 'routing', element: <RoutingView /> },
      { path: 'settings', element: <SettingsView /> },
    ],
  },
]);
