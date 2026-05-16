import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { SocketProvider } from './hooks/useSocket';
import { ThemeProvider } from './hooks/useTheme';
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
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-slate-900" />
          <span className="text-sm">Checking session…</span>
        </div>
      </div>
    );
  }
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
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
