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
import AttendanceLogs from './pages/AttendanceLogs';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="p-6 text-sm text-slate-500">Loading...</div>;
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
            <Devices />
          </PrivateRoute>
        }
      />
      <Route
        path="/devices/:sn"
        element={
          <PrivateRoute>
            <DeviceDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/pegawai"
        element={
          <PrivateRoute>
            <Pegawai />
          </PrivateRoute>
        }
      />
      <Route
        path="/commands"
        element={
          <PrivateRoute>
            <Commands />
          </PrivateRoute>
        }
      />
      <Route
        path="/fingerprint"
        element={
          <PrivateRoute>
            <Fingerprint />
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <PrivateRoute>
            <AttendanceLogs />
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
