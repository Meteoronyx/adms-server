import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { logout as apiLogout } from "../lib/api";
import { DropdownMenu } from "./ui/DropdownMenu";
import { Tooltip } from "./ui/Tooltip";
import { ChangePasswordModal } from "./modals/ChangePasswordModal";
import {
  LayoutDashboard,
  HardDrive,
  Users,
  ListOrdered,
  Fingerprint,
  ClipboardList,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  UserCog,
  Building2,
  KeyRound,
  Megaphone,
  Menu,
  X,
} from "lucide-react";

const navGroups = [
  {
    group: "Ringkasan",
    items: [{ path: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Perangkat & Biometrik",
    items: [
      {
        path: "/devices",
        label: "Perangkat",
        icon: HardDrive,
        permission: "devices:read",
      },
      {
        path: "/fingerprint",
        label: "Biometrik",
        icon: Fingerprint,
        permission: "fingerprint:manage",
      },
      {
        path: "/broadcast",
        label: "Pesan Layar",
        icon: Megaphone,
        permission: "devices:command",
      },
    ],
  },
  {
    group: "Data & Akses",
    items: [
      {
        path: "/pegawai",
        label: "Pegawai",
        icon: Users,
        permission: "devices:read",
      },
      {
        path: "/attendance",
        label: "Log Absen",
        icon: ClipboardList,
        permission: "attendance:read",
      },
      {
        path: "/commands",
        label: "Antrean Perintah",
        icon: ListOrdered,
        permission: "devices:command",
      },
      {
        path: "/opds",
        label: "Unit Kerja (OPD)",
        icon: Building2,
        permission: "opds:read",
      },
      {
        path: "/users",
        label: "Kelola Pengguna",
        icon: UserCog,
        permission: ["users:read", "roles:read"],
      },
    ],
  },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const { logout, user, hasPermission } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore logout network errors
    }
    logout();
    addToast("Berhasil keluar dari sesi");
    navigate("/login");
  };

  const userMenuItems = [
    {
      label: "Ubah Password",
      icon: KeyRound,
      onClick: () => setIsChangePasswordOpen(true),
    },
    { type: "separator" },
    {
      label: "Keluar",
      icon: LogOut,
      variant: "danger",
      onClick: handleLogout,
    },
  ];

  const currentNavLabel = (() => {
    for (const grp of navGroups) {
      for (const item of grp.items) {
        if (
          item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path)
        ) {
          return item.label;
        }
      }
    }
    return "DBSpot";
  })();

  const userInitials = (user?.name || "Admin Diskominfo")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const renderNavLinks = (isMobile = false) => (
    <nav className="flex-1 px-2.5 py-2 space-y-5 overflow-y-auto">
      {navGroups.map((group, groupIdx) => {
        const visibleItems = group.items.filter((item) => {
          if (!item.permission) return true;
          if (Array.isArray(item.permission)) {
            return item.permission.some((p) => hasPermission(p));
          }
          return hasPermission(item.permission);
        });

        if (visibleItems.length === 0) return null;

        return (
          <div key={groupIdx} className="space-y-0.5">
            {(!collapsed || isMobile) && (
              <div className="px-2.5 pb-1.5 text-xs text-muted font-normal select-none">
                {group.group}
              </div>
            )}
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`);

              const navLinkContent = (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2.5 h-[34px] px-2.5 rounded-[6px] text-sm transition-colors duration-150 group ${
                    active
                      ? "bg-active text-ink font-medium"
                      : "text-muted hover:text-ink hover:bg-active/60 font-normal"
                  } ${collapsed && !isMobile ? "justify-center px-0" : ""}`}
                >
                  <Icon
                    size={16}
                    strokeWidth={1.6}
                    className={`flex-shrink-0 transition-colors ${
                      active ? "text-ink" : "text-muted group-hover:text-ink"
                    }`}
                  />
                  {(!collapsed || isMobile) && (
                    <span className="truncate">{item.label}</span>
                  )}
                </NavLink>
              );

              if (collapsed && !isMobile) {
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
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-ground text-ink overflow-hidden">
      <ChangePasswordModal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Mobile / Tablet 48px Top Bar (< 1024px) */}
      <header className="flex lg:hidden items-center justify-between h-12 px-4 bg-ground border-b border-border shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-[6px] text-ink hover:bg-active transition-colors"
            aria-label="Buka navigasi"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-[4px] bg-accent text-white text-xs font-semibold inline-flex items-center justify-center">
              D
            </span>
            <span className="text-sm font-semibold text-ink">
              {currentNavLabel}
            </span>
          </div>
        </div>
        <span className="text-xs text-muted truncate max-w-[160px]">
          {user?.name || "Admin Diskominfo"}
        </span>
      </header>

      {/* Mobile Navigation Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-ink/40 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-[240px] max-w-[80vw] bg-ground h-full flex flex-col z-10 border-r border-border">
            <div className="flex items-center justify-between h-12 px-3.5 border-b border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 bg-accent text-white rounded-[5px] flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  D
                </div>
                <div className="leading-tight truncate">
                  <span className="font-semibold text-ink text-sm block truncate">
                    DBSpot
                  </span>
                  <span className="text-xs text-muted block truncate">
                    Kab. Tangerang
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-7 h-7 inline-flex items-center justify-center rounded-[6px] text-muted hover:text-ink hover:bg-active"
                aria-label="Tutup navigasi"
              >
                <X size={16} />
              </button>
            </div>
            {renderNavLinks(true)}
            <div className="p-2.5 border-t border-border">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-2.5 h-[34px] rounded-[6px] text-sm text-negative hover:bg-negative-bg transition-colors"
              >
                <LogOut size={15} />
                <span>Keluar</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar (Tinted L-Frame on --ground) */}
      <aside
        className={`hidden lg:flex flex-col bg-ground select-none shrink-0 z-20 ${
          collapsed ? "w-[56px]" : "w-[228px]"
        }`}
      >
        {/* Product Mark & Workspace Scope */}
        <div className="flex items-center justify-between h-14 px-3.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 bg-accent text-white rounded-[6px] flex items-center justify-center flex-shrink-0 p-1">
              <img
                src="/favicon.svg"
                alt="DBSpot"
                className="w-full h-full object-contain filter invert"
              />
            </div>
            {!collapsed && (
              <div className="leading-tight truncate">
                <span className="font-semibold text-ink text-sm block truncate">
                  DBSpot
                </span>
                <p className="text-xs text-muted truncate">
                  Diskominfo Kabupaten Tangerang
                </p>
              </div>
            )}
          </div>

          <Tooltip
            content={collapsed ? "Perluas sidebar" : "Kecilkan sidebar"}
            side="right"
          >
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted hover:text-ink p-1.5 rounded-[6px] hover:bg-active transition-colors"
              aria-label="Toggle Sidebar"
            >
              {collapsed ? (
                <PanelLeft size={16} />
              ) : (
                <PanelLeftClose size={16} />
              )}
            </button>
          </Tooltip>
        </div>

        {renderNavLinks(false)}

        {/* User Account Switcher / Profile Row */}
        <div className="p-2.5">
          <DropdownMenu
            align="start"
            side={collapsed ? "right" : "top"}
            items={userMenuItems}
            trigger={
              <button
                type="button"
                className={`flex items-center gap-2.5 w-full p-1.5 rounded-[6px] transition-colors hover:bg-active text-left group ${
                  collapsed ? "justify-center" : ""
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center font-medium text-xs flex-shrink-0">
                  {userInitials || "AD"}
                </div>
                {!collapsed && (
                  <div className="flex-1 truncate leading-tight">
                    <p className="text-xs font-medium text-ink truncate">
                      {user?.name || "Admin Diskominfo"}
                    </p>
                    <p className="text-xs text-muted truncate capitalize">
                      {user?.role || "Administrator"}
                    </p>
                  </div>
                )}
              </button>
            }
          />
        </div>
      </aside>

      {/* Framed Sheet Work Area */}
      <main className="flex-1 min-w-0 flex flex-col lg:py-2 lg:pr-2 overflow-hidden">
        <div className="flex-1 bg-sheet lg:rounded-[16px] lg:border lg:border-border overflow-y-auto">
          <div
            key={location.pathname}
            className="w-full px-4 py-5 sm:px-6 sm:py-6 fade-in"
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
