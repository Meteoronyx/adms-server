import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { SocketProvider } from './hooks/useSocket';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import Pegawai from './pages/Pegawai';
import Commands from './pages/Commands';
import Fingerprint from './pages/Fingerprint';
import BroadcastMessages from './pages/BroadcastMessages';
import AttendanceLogs from './pages/AttendanceLogs';
import Users from './pages/Users';
import Opds from './pages/Opds';
import PublicDeviceStatus from './pages/PublicDeviceStatus';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ground text-ink">
        <div className="flex items-center gap-2.5 text-muted">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-control border-t-ink" />
          <span className="text-sm">Memeriksa sesi…</span>
        </div>
      </div>
    );
  }
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

function PermissionRoute({ permission, children }) {
  const { hasPermission } = useAuth();
  if (!permission) return children;

  const allowed = Array.isArray(permission)
    ? permission.some(p => hasPermission(p))
    : hasPermission(permission);

  if (!allowed) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/public/device-status" element={<PublicDeviceStatus />} />
      <Route path="/status" element={<Navigate to="/public/device-status" replace />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/devices"
        element={
          <PrivateRoute>
            <PermissionRoute permission="devices:read">
              <Devices />
            </PermissionRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/devices/:sn"
        element={
          <PrivateRoute>
            <PermissionRoute permission="devices:read">
              <DeviceDetail />
            </PermissionRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/pegawai"
        element={
          <PrivateRoute>
            <PermissionRoute permission="devices:read">
              <Pegawai />
            </PermissionRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/commands"
        element={
          <PrivateRoute>
            <PermissionRoute permission="devices:command">
              <Commands />
            </PermissionRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/fingerprint"
        element={
          <PrivateRoute>
            <PermissionRoute permission="fingerprint:manage">
              <Fingerprint />
            </PermissionRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/broadcast"
        element={
          <PrivateRoute>
            <PermissionRoute permission="devices:command">
              <BroadcastMessages />
            </PermissionRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <PrivateRoute>
            <PermissionRoute permission="attendance:read">
              <AttendanceLogs />
            </PermissionRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <PermissionRoute permission={['users:read', 'roles:read']}>
              <Users />
            </PermissionRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/opds"
        element={
          <PrivateRoute>
            <PermissionRoute permission="opds:read">
              <Opds />
            </PermissionRoute>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
