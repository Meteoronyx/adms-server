import { useState, useEffect, useCallback } from 'react';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
  deleteAdminUser,
  getAdminRoles,
  getAdminPermissions,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
} from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/ui/Modal';
import {
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  KeyRound,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Users as UsersIcon,
  CheckCircle2,
  Plus,
  Lock,
  Sparkles,
  SlidersHorizontal,
  FolderKey,
} from 'lucide-react';

export default function Users() {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles'

  // Users State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Roles & Permissions State
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [permissionCategories, setPermissionCategories] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(true);

  // User Modals State
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);

  // Role Modals State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteRoleOpen, setIsDeleteRoleOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states - User
  const [userFormData, setUserFormData] = useState({
    username: '',
    name: '',
    password: '',
    role_id: '',
  });

  const [editUserFormData, setEditUserFormData] = useState({
    name: '',
    role_id: '',
    is_active: true,
  });

  const [newPassword, setNewPassword] = useState('');

  // Form states - Role
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permission_ids: [],
  });

  const { addToast } = useToast();
  const { user: currentUser, hasPermission } = useAuth();

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await getAdminUsers();
      if (res && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Gagal memuat daftar pengguna', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [addToast]);

  // Fetch roles & permissions
  const fetchRolesAndPermissions = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        getAdminRoles(),
        getAdminPermissions(),
      ]);
      if (rolesRes && rolesRes.data) {
        setRoles(rolesRes.data);
      }
      if (permsRes && permsRes.data) {
        setPermissions(permsRes.data);
        setPermissionCategories(permsRes.categories || {});
      }
    } catch (err) {
      addToast(err.message || 'Gagal memuat data peran & hak akses', 'error');
    } finally {
      setLoadingRoles(false);
    }
  }, [addToast]);

  const refreshAll = useCallback(() => {
    fetchUsers();
    fetchRolesAndPermissions();
  }, [fetchUsers, fetchRolesAndPermissions]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Handlers - User Creation
  const openCreateUserModal = () => {
    const defaultRoleId = roles.find((r) => r.slug === 'operator')?.id || roles[0]?.id || '';
    setUserFormData({
      username: '',
      name: '',
      password: '',
      role_id: defaultRoleId,
    });
    setIsCreateUserOpen(true);
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAdminUser(userFormData);
      addToast(`Pengguna '${userFormData.username}' berhasil didaftarkan`);
      setIsCreateUserOpen(false);
      setUserFormData({ username: '', name: '', password: '', role_id: '' });
      fetchUsers();
    } catch (err) {
      addToast(err.message || 'Gagal mendaftarkan pengguna', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers - User Edit
  const openEditUserModal = (u) => {
    setSelectedUser(u);
    const userRoleId = u.role_id || roles.find((r) => r.slug === u.role)?.id || '';
    setEditUserFormData({
      name: u.name,
      role_id: userRoleId,
      is_active: u.is_active,
    });
    setIsEditUserOpen(true);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await updateAdminUser(selectedUser.id, editUserFormData);
      addToast(`Data pengguna '${selectedUser.username}' berhasil diperbarui`);
      setIsEditUserOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      addToast(err.message || 'Gagal memperbarui data pengguna', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers - Reset Password
  const openResetPassModal = (u) => {
    setSelectedUser(u);
    setNewPassword('');
    setIsResetPassOpen(true);
  };

  const handleResetPassSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await resetAdminUserPassword(selectedUser.id, newPassword);
      addToast(`Password untuk '${selectedUser.username}' berhasil diperbarui`);
      setIsResetPassOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (err) {
      addToast(err.message || 'Gagal meriset password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers - User Deactivation
  const openDeleteUserModal = (u) => {
    setSelectedUser(u);
    setIsDeleteUserOpen(true);
  };

  const handleDeleteUserConfirm = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await deleteAdminUser(selectedUser.id);
      addToast(`Pengguna '${selectedUser.username}' berhasil dinonaktifkan`);
      setIsDeleteUserOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      addToast(err.message || 'Gagal menonaktifkan pengguna', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers - Role Creation & Edit
  const openCreateRoleModal = () => {
    setSelectedRole(null);
    setRoleFormData({
      name: '',
      description: '',
      permission_ids: permissions.map((p) => p.id), // select all permissions by default
    });
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (role) => {
    setSelectedRole(role);
    const assignedIds = Array.isArray(role.permissions)
      ? role.permissions.map((p) => p.id)
      : [];
    setRoleFormData({
      name: role.name,
      description: role.description || '',
      permission_ids: assignedIds,
    });
    setIsRoleModalOpen(true);
  };

  const handleSaveRoleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedRole) {
        await updateAdminRole(selectedRole.id, roleFormData);
        addToast(`Peran '${roleFormData.name}' berhasil diperbarui`);
      } else {
        await createAdminRole(roleFormData);
        addToast(`Peran '${roleFormData.name}' berhasil dibuat`);
      }
      setIsRoleModalOpen(false);
      setSelectedRole(null);
      setRoleFormData({ name: '', description: '', permission_ids: [] });
      fetchRolesAndPermissions();
    } catch (err) {
      addToast(err.message || 'Gagal menyimpan data peran', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers - Delete Role
  const openDeleteRoleModal = (role) => {
    setSelectedRole(role);
    setIsDeleteRoleOpen(true);
  };

  const handleDeleteRoleConfirm = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    try {
      await deleteAdminRole(selectedRole.id);
      addToast(`Peran '${selectedRole.name}' berhasil dihapus`);
      setIsDeleteRoleOpen(false);
      setSelectedRole(null);
      fetchRolesAndPermissions();
    } catch (err) {
      addToast(err.message || 'Gagal menghapus peran', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Permission Matrix Toggles
  const togglePermission = (permId) => {
    setRoleFormData((prev) => {
      const exists = prev.permission_ids.includes(permId);
      return {
        ...prev,
        permission_ids: exists
          ? prev.permission_ids.filter((id) => id !== permId)
          : [...prev.permission_ids, permId],
      };
    });
  };

  const toggleCategoryPermissions = (categoryPerms) => {
    const permIds = categoryPerms.map((p) => p.id);
    const allChecked = permIds.every((id) => roleFormData.permission_ids.includes(id));

    setRoleFormData((prev) => ({
      ...prev,
      permission_ids: allChecked
        ? prev.permission_ids.filter((id) => !permIds.includes(id))
        : Array.from(new Set([...prev.permission_ids, ...permIds])),
    }));
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const renderRoleBadge = (roleSlug, roleName) => {
    const displayName = roleName || roleSlug;
    switch (roleSlug) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
            <ShieldCheck size={13} />
            {displayName}
          </span>
        );
      case 'operator':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
            <Shield size={13} />
            {displayName}
          </span>
        );
      case 'viewer':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            <UserCheck size={13} />
            {displayName}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
            <Sparkles size={13} />
            {displayName}
          </span>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Stats calculation
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const operatorCount = users.filter((u) => u.role === 'operator').length;

  return (
    <div className="space-y-6">
      {/* Page Header - Tampilan Asli Sesuai Permintaan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Manajemen Pengguna & Hak Akses
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Segment Control / Toggle View */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'users'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <UsersIcon size={14} />
              <span>Daftar Pengguna</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'roles'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <FolderKey size={14} />
              <span>Hak Akses</span>
            </button>
          </div>

          {/* <button
            onClick={refreshAll}
            disabled={loadingUsers || loadingRoles}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18192d] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loadingUsers || loadingRoles ? 'animate-spin' : ''} />
          </button> */}

          {activeTab === 'users' ? (
            hasPermission('users:write') && (
              <button
                onClick={openCreateUserModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-semibold text-sm hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all shadow-sm active:scale-[0.98]"
              >
                <UserPlus size={18} />
                <span>Tambah Pengguna</span>
              </button>
            )
          ) : (
            hasPermission('roles:write') && (
              <button
                onClick={openCreateRoleModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-all shadow-sm active:scale-[0.98]"
              >
                <Plus size={18} />
                <span>Tambah Peran Baru</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* VIEW 1: DAFTAR PENGGUNA (Tampilan Asli & Bersih) */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Stats Cards Original Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#18192d] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                <UsersIcon size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Total Pengguna</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalCount}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-[#18192d] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Pengguna Aktif</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{activeCount}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-[#18192d] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Administrator</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{adminCount}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-[#18192d] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <Shield size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Operator</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{operatorCount}</h3>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-[#18192d] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-[#121324] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">Filter Role:</span>
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap ${roleFilter === 'all'
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                Semua
              </button>
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRoleFilter(r.slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap ${roleFilter === r.slug
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {/* Main Users Table */}
          <div className="bg-white dark:bg-[#18192d] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
            {loadingUsers ? (
              <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600 mx-auto" />
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-3">Memuat data pengguna...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center">
                <UserX size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Tidak ada pengguna ditemukan</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter role.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#15162a]/50 text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-6">Pengguna</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Login Terakhir</th>
                      <th className="py-3.5 px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredUsers.map((u) => {
                      const isSelf = currentUser?.id === u.id;
                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm border border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                    {u.name}
                                  </span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                      Anda
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 dark:text-slate-500 block font-mono mt-0.5">
                                  @{u.username}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">{renderRoleBadge(u.role, u.role_name)}</td>

                          <td className="py-4 px-4">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                Nonaktif
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(u.last_login_at)}
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {hasPermission('users:write') && (
                                <button
                                  onClick={() => openEditUserModal(u)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Edit Pengguna & Peran"
                                >
                                  <Pencil size={16} />
                                </button>
                              )}

                              {hasPermission('users:write') && (
                                <button
                                  onClick={() => openResetPassModal(u)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                                  title="Reset Password"
                                >
                                  <KeyRound size={16} />
                                </button>
                              )}

                              {!isSelf && hasPermission('users:delete') && (
                                <button
                                  onClick={() => openDeleteUserModal(u)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                  title="Nonaktifkan Pengguna"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: MANAJEMEN PERAN & HAK AKSES (RBAC) */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* <div className="bg-white dark:bg-[#18192d] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal size={20} className="text-indigo-600 dark:text-indigo-400" />
                <span>Pengaturan Matriks Hak Akses Peran</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Atur granularitas izin per modul (*Perangkat*, *Pengguna*, *Log Presensi*, dll.) untuk masing-masing peran secara dinamis.
              </p>
            </div>

            <button
              onClick={openCreateRoleModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-all shadow-sm flex-shrink-0"
            >
              <Plus size={16} />
              <span>Tambah Peran Baru</span>
            </button>
          </div> */}

          {loadingRoles ? (
            <div className="py-20 text-center bg-white dark:bg-[#18192d] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600 mx-auto" />
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-3">Memuat data peran & izin...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map((r) => {
                const isSystem = r.is_system;
                const rolePermissions = Array.isArray(r.permissions) ? r.permissions : [];

                return (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-[#18192d] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {r.name}
                          </h3>
                          {isSystem ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                              <Lock size={10} />
                              Sistem
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                              Kustom
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          {r.user_count || 0} Pengguna
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 min-h-[36px] line-clamp-2">
                        {r.description || 'Tidak ada deskripsi.'}
                      </p>

                      <div className="space-y-2 mb-6">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                          Hak Akses Terpasang ({rolePermissions.length}):
                        </span>

                        {r.slug === 'admin' ? (
                          <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2">
                            <ShieldCheck size={16} />
                            <span>Superadmin: Akses penuh ke seluruh fitur sistem</span>
                          </div>
                        ) : rolePermissions.length === 0 ? (
                          <p className="text-xs italic text-slate-400">Belum ada izin yang dikonfigurasi</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                            {rolePermissions.map((p) => (
                              <span
                                key={p.id || p.code}
                                className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                              >
                                {p.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">slug: {r.slug}</span>

                      <div className="flex items-center gap-2">
                        {hasPermission('roles:write') && (
                          <button
                            onClick={() => openEditRoleModal(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            <Pencil size={13} />
                            <span>Edit Hak Akses</span>
                          </button>
                        )}

                        {!isSystem && hasPermission('roles:delete') && (
                          <button
                            onClick={() => openDeleteRoleModal(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Hapus Peran"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: TAMBAH PENGGUNA */}
      <Modal
        open={isCreateUserOpen}
        onOpenChange={setIsCreateUserOpen}
        title="Pendaftaran Pengguna Baru"
        description="Daftarkan akun pengguna baru ke dalam sistem web admin."
        size="md"
      >
        <form id="create-user-form" onSubmit={handleCreateUserSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Username <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="contoh: operator_cabang"
              value={userFormData.username}
              onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#121324] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="contoh: Budi Santoso"
              value={userFormData.name}
              onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#121324] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password <span className="text-rose-500">*</span> (min 6 karakter)
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={userFormData.password}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#121324] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Peran (Role) <span className="text-rose-500">*</span>
            </label>
            <select
              value={userFormData.role_id}
              onChange={(e) => setUserFormData({ ...userFormData, role_id: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#121324] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.description || r.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateUserOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? 'Mendaftarkan...' : 'Daftarkan Pengguna'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT PENGGUNA */}
      <Modal
        open={isEditUserOpen}
        onOpenChange={setIsEditUserOpen}
        title={`Edit Pengguna: @${selectedUser?.username}`}
        description="Perbarui informasi profil, penugasan peran, dan status akun."
        size="md"
      >
        <form onSubmit={handleEditUserSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={editUserFormData.name}
              onChange={(e) => setEditUserFormData({ ...editUserFormData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#121324] text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Peran (Role)
            </label>
            <select
              value={editUserFormData.role_id}
              onChange={(e) => setEditUserFormData({ ...editUserFormData, role_id: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#121324] text-sm text-slate-900 dark:text-slate-100"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="is_active_check"
              checked={editUserFormData.is_active}
              onChange={(e) => setEditUserFormData({ ...editUserFormData, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
            />
            <label htmlFor="is_active_check" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Akun Aktif
            </label>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditUserOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RESET PASSWORD */}
      <Modal
        open={isResetPassOpen}
        onOpenChange={setIsResetPassOpen}
        title={`Reset Password: @${selectedUser?.username}`}
        description="Tetapkan kata sandi baru untuk pengguna."
        size="sm"
      >
        <form onSubmit={handleResetPassSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password Baru <span className="text-rose-500">*</span> (min 6 karakter)
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Masukkan password baru..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#121324] text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsResetPassOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {submitting ? 'Memproses...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: NONAKTIFKAN PENGGUNA */}
      <Modal
        open={isDeleteUserOpen}
        onOpenChange={setIsDeleteUserOpen}
        title="Konfirmasi Nonaktifkan Pengguna"
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 flex items-start gap-3">
            <ShieldAlert className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-rose-800 dark:text-rose-300">
              Apakah Anda yakin ingin menonaktifkan pengguna{' '}
              <strong className="font-bold">@{selectedUser?.username}</strong> ({selectedUser?.name})? Pengguna tidak akan dapat login lagi ke dalam sistem.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsDeleteUserOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteUserConfirm}
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {submitting ? 'Menonaktifkan...' : 'Ya, Nonaktifkan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: TAMBAH / EDIT PERAN & MATRIX HAK AKSES */}
      <Modal
        open={isRoleModalOpen}
        onOpenChange={setIsRoleModalOpen}
        title={selectedRole ? `Edit Hak Akses Peran: ${selectedRole.name}` : 'Tambah Peran Baru'}
        description="Atur matriks hak akses per modul untuk peran ini."
        size="lg"
      >
        <form onSubmit={handleSaveRoleSubmit} className="space-y-5 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Peran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="contoh: Supervisor Cabang"
              value={roleFormData.name}
              onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#121324] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan wewenang atau tanggung jawab peran ini..."
              value={roleFormData.description}
              onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#121324] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* PERMISSION CHECKLIST MATRIX */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Konfigurasi Matriks Hak Akses (Permissions)
              </label>

              <button
                type="button"
                onClick={() => {
                  const allIds = permissions.map((p) => p.id);
                  const isAllSelected = allIds.every((id) => roleFormData.permission_ids.includes(id));
                  setRoleFormData((prev) => ({
                    ...prev,
                    permission_ids: isAllSelected ? [] : allIds,
                  }));
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {permissions.every((p) => roleFormData.permission_ids.includes(p.id))
                  ? 'Hapus Semua Pilihan'
                  : 'Pilih Semua Izin'}
              </button>
            </div>

            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {Object.entries(permissionCategories).map(([category, catPerms]) => {
                const allCatChecked = catPerms.every((p) => roleFormData.permission_ids.includes(p.id));

                return (
                  <div
                    key={category}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#15162a]/60 border border-slate-200/60 dark:border-slate-800/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        📁 Modul {category}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCategoryPermissions(catPerms)}
                        className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {allCatChecked ? 'Batal Pilih Modul' : 'Pilih Semua di Modul Ini'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {catPerms.map((p) => {
                        const isChecked = roleFormData.permission_ids.includes(p.id);

                        return (
                          <label
                            key={p.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${isChecked
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60'
                              : 'bg-white dark:bg-[#121324] border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/50'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(p.id)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 mt-0.5"
                            />
                            <div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block leading-snug">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                                {p.description || p.code}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Peran & Hak Akses'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: HAPUS PERAN */}
      <Modal
        open={isDeleteRoleOpen}
        onOpenChange={setIsDeleteRoleOpen}
        title="Konfirmasi Hapus Peran"
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 flex items-start gap-3">
            <ShieldAlert className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-rose-800 dark:text-rose-300">
              Apakah Anda yakin ingin menghapus peran <strong className="font-bold">{selectedRole?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsDeleteRoleOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteRoleConfirm}
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {submitting ? 'Menghapus...' : 'Ya, Hapus Peran'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
