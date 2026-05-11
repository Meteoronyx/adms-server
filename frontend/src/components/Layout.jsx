import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../hooks/useTheme';
import {
  LayoutDashboard,
  HardDrive,
  Users,
  ListOrdered,
  Fingerprint,
  ClipboardList,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Moon,
  Sun,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/devices', label: 'Devices', icon: HardDrive },
  { path: '/pegawai', label: 'Pegawai', icon: Users },
  { path: '/fingerprint', label: 'Fingerprint', icon: Fingerprint },
  { path: '/attendance', label: 'Log Absen', icon: ClipboardList },
  { path: '/commands', label: 'Commands', icon: ListOrdered },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const { addToast } = useToast();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    addToast('Logged out');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#f8f9fb]">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-col bg-white border-r border-slate-200/60 transition-all duration-300 ease-in-out z-20 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand section */}
        <div className="flex items-center h-16 px-5 mt-2 mb-4">
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <HardDrive size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <span className="font-semibold text-slate-900 tracking-tight text-lg">DBSpot</span>
              <p className="text-[10px] text-slate-400 tracking-wide font-medium">Diskominfo Kab. Tangerang</p>
            </div>
          </div>
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`absolute -right-3 top-5 bg-white border border-slate-200 text-slate-400 rounded-full p-1 hover:text-slate-900 hover:border-slate-300 transition-colors z-30 shadow-sm`}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  active
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={collapsed ? item.label : ''}
              >
                {/* Active indicator bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-slate-900 rounded-full" />
                )}
                <Icon 
                  size={18} 
                  strokeWidth={active ? 2.2 : 1.8} 
                  className={`flex-shrink-0 transition-colors ${active ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`} 
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Theme Toggle + Logout */}
        <div className="p-3 space-y-1 border-t border-slate-100">
          <button
            onClick={toggle}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors group"
            title={collapsed ? (dark ? 'Light Mode' : 'Dark Mode') : ''}
          >
            {dark ? (
              <Sun size={18} strokeWidth={1.8} className="text-slate-400 group-hover:text-amber-500 flex-shrink-0" />
            ) : (
              <Moon size={18} strokeWidth={1.8} className="text-slate-400 group-hover:text-indigo-500 flex-shrink-0" />
            )}
            {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
            title={collapsed ? 'Logout' : ''}
          >
            <LogOut size={18} strokeWidth={1.8} className="text-slate-400 group-hover:text-red-500 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative">
        <div className="max-w-6xl mx-auto px-8 py-10 fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
