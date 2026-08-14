import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../hooks/useTheme';
import { logout as apiLogout } from '../lib/api';
import { DropdownMenu } from './ui/DropdownMenu';
import { Tooltip } from './ui/Tooltip';
import {
  LayoutDashboard,
  HardDrive,
  Users,
  ListOrdered,
  Fingerprint,
  ClipboardList,
  LogOut,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  User,
  UserCog,
  Building2,
} from 'lucide-react';

const navGroups = [
  {
    group: 'Ringkasan',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Hardware & Biometrik',
    items: [
      { path: '/devices', label: 'Devices', icon: HardDrive, permission: 'devices:read' },
      { path: '/fingerprint', label: 'Fingerprint', icon: Fingerprint, permission: 'fingerprint:manage' },
    ],
  },
  {
    group: 'Data & Akses',
    items: [
      { path: '/pegawai', label: 'Pegawai', icon: Users, permission: 'devices:read' },
      { path: '/attendance', label: 'Log Absen', icon: ClipboardList, permission: 'attendance:read' },
      { path: '/commands', label: 'Commands', icon: ListOrdered, permission: 'devices:command' },
      { path: '/opds', label: 'Unit Kerja (OPD)', icon: Building2, permission: 'opds:read' },
      { path: '/users', label: 'Kelola Pengguna', icon: UserCog, permission: ['users:read', 'roles:read'] },
    ],
  },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user, hasPermission } = useAuth();
  const { addToast } = useToast();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
    }
    logout();
    addToast('Logged out');
    navigate('/login');
  };

  const userMenuItems = [
    {
      label: dark ? 'Light' : 'Dark',
      icon: dark ? Sun : Moon,
      onClick: toggle,
    },
    { type: 'separator' },
    {
      label: 'Logout',
      icon: LogOut,
      variant: 'danger',
      onClick: handleLogout,
    },
  ];

  return (
    <div className="flex h-screen bg-[#f8f9fb] dark:bg-[#121324] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-col bg-white dark:bg-[#18192d] border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out z-20 select-none ${collapsed ? 'w-16' : 'w-64'
          }`}
      >
        {/* Brand Section */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm p-1.5 transition-transform duration-200 hover:scale-105">
              <img src="/favicon.svg" alt="DBSpot" className="w-full h-full object-contain filter invert dark:invert-0" />
            </div>
            {!collapsed && (
              <div className="leading-tight truncate">
                <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base">DBSpot</span>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 tracking-wide font-medium truncate">Diskominfo Kab. Tangerang</p>
              </div>
            )}
          </div>

          <Tooltip content={collapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'} side="right">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Sidebar"
            >
              {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </Tooltip>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          {navGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter(item => {
              if (!item.permission) return true;
              if (Array.isArray(item.permission)) {
                return item.permission.some(p => hasPermission(p));
              }
              return hasPermission(item.permission);
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1">
                {!collapsed && (
                  <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {group.group}
                  </h3>
                )}
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;

                  const navLinkContent = (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 group ${active
                          ? 'text-white bg-slate-900 dark:bg-indigo-600 shadow-sm font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                        } ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon
                        size={18}
                        strokeWidth={active ? 2.2 : 1.8}
                        className={`flex-shrink-0 transition-colors ${active
                            ? 'text-white'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                          }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.path} content={item.label} side="right">
                        <div>{navLinkContent}</div>
                      </Tooltip>
                    );
                  }

                  return navLinkContent;
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer Section: User Profile */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800/60">
          {/* User Profile Card with Base UI DropdownMenu */}
          <DropdownMenu
            align="start"
            side={collapsed ? 'right' : 'top'}
            items={userMenuItems}
            trigger={
              <button
                className={`flex items-center gap-3 w-full p-2 rounded-xl transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-left group ${collapsed ? 'justify-center p-1.5' : ''
                  }`}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-indigo-200/50 dark:border-indigo-800/50">
                  <User size={16} />
                </div>
                {!collapsed && (
                  <div className="flex-1 truncate leading-tight">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'Admin Diskominfo'}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user?.role ? user.role.toUpperCase() : 'Administrator'}</p>
                  </div>
                )}
              </button>
            }
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="max-w-6xl mx-auto px-8 py-10 fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
