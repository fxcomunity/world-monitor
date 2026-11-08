import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/Map';
import Environment from './pages/Environment';
import EconomicMonitor from './pages/EconomicMonitor';
import GeopoliticalMonitor from './pages/GeopoliticalMonitor';
import DisasterMonitor from './pages/DisasterMonitor';
import EnergyMonitor from './pages/EnergyMonitor';
import TechMonitor from './pages/TechMonitor';
import TransportMonitor from './pages/TransportMonitor';
import DataExplorer from './pages/DataExplorer';
import NotificationCenter from './pages/NotificationCenter';
import SettingsPage from './pages/Settings';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import MaintenancePage from './pages/MaintenancePage';
import NotFoundPage from './pages/NotFoundPage';
import 'maplibre-gl/dist/maplibre-gl.css';
import './index.css';

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/',              element: <Landing /> },
      { path: '/intelligence',  element: <Home /> },
      { path: '/dashboard',     element: <Dashboard /> },
      { path: '/map',           element: <MapPage /> },
      { path: '/lingkungan',    element: <Environment /> },
      { path: '/ekonomi',       element: <EconomicMonitor /> },
      { path: '/geopolitik',    element: <GeopoliticalMonitor /> },
      { path: '/bencana',       element: <DisasterMonitor /> },
      { path: '/energi',        element: <EnergyMonitor /> },
      { path: '/teknologi',     element: <TechMonitor /> },
      { path: '/transportasi',  element: <TransportMonitor /> },
      { path: '/data',          element: <DataExplorer /> },
      { path: '/notifikasi',    element: <NotificationCenter /> },
      { path: '/pengaturan',    element: <SettingsPage /> },
    ],
  },
  // Dedicated Fullscreen Admin Control Panel (Tanpa Sidebar Monitoring)
  { path: '/admin/dashboard', element: <AdminDashboard /> },
  // Dedicated Maintenance Page (Fullscreen)
  { path: '/maintenance', element: <MaintenancePage /> },
  // Admin login — standalone (no sidebar/layout)
  { path: '/auth/admin', element: <AdminLogin /> },
  // 404 Not Found Page (Catch-all)
  { path: '*', element: <NotFoundPage /> },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<RouterProvider router={router} />);
