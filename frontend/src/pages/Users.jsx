import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Tabs } from '../components/ui/Tabs';
import { UsersIcon, ShieldCheck } from 'lucide-react';

import { useUsers } from '../features/users/hooks/useUsers';
import { useRoles } from '../features/users/hooks/useRoles';
import { useUserModals } from '../features/users/hooks/useUserModals';

import { UsersTab } from '../features/users/components/UsersTab';
import { RolesTab } from '../features/users/components/RolesTab';

import { CreateUserModal } from '../features/users/components/modals/CreateUserModal';
import { EditUserModal } from '../features/users/components/modals/EditUserModal';
import { ResetPasswordModal } from '../features/users/components/modals/ResetPasswordModal';
import { DeleteUserModal } from '../features/users/components/modals/DeleteUserModal';
import { RoleModal } from '../features/users/components/modals/RoleModal';
import { DeleteRoleModal } from '../features/users/components/modals/DeleteRoleModal';

export default function Users() {
  const [activeTab, setActiveTab] = useState('users');
  const { user: currentUser, hasPermission } = useAuth();

  const usersHook = useUsers();
  const rolesHook = useRoles();
  const modalsHook = useUserModals();

  const tabOptions = [
    { id: 'users', label: 'Kelola Pengguna', icon: UsersIcon, badge: usersHook.users.length },
    { id: 'roles', label: 'Role & Hak Akses', icon: ShieldCheck, badge: rolesHook.roles.length },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Manajemen Pengguna & Pengaturan Akses
          </h1>
          {/* <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola akun administrator, staf operasional, dan konfigurasi hak akses berbasis role (RBAC)
          </p> */}
        </div>

        <Tabs tabs={tabOptions} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Main Tab Content */}
      {activeTab === 'users' && (
        <UsersTab
          users={usersHook.filteredUsers}
          roles={rolesHook.roles}
          opds={usersHook.opds}
          loading={usersHook.loading}
          search={usersHook.search}
          setSearch={usersHook.setSearch}
          roleFilter={usersHook.roleFilter}
          setRoleFilter={usersHook.setRoleFilter}
          opdFilter={usersHook.opdFilter}
          setOpdFilter={usersHook.setOpdFilter}
          currentUser={currentUser}
          hasPermission={hasPermission}
          onOpenCreate={modalsHook.openCreateUser}
          onOpenEdit={modalsHook.openEditUser}
          onOpenResetPass={modalsHook.openResetPassword}
          onOpenDelete={modalsHook.openDeleteUser}
        />
      )}

      {activeTab === 'roles' && (
        <RolesTab
          roles={rolesHook.roles}
          loading={rolesHook.loading}
          hasPermission={hasPermission}
          onOpenCreateRole={modalsHook.openCreateRole}
          onOpenEditRole={modalsHook.openEditRole}
          onOpenDeleteRole={modalsHook.openDeleteRole}
        />
      )}

      {/* Modal Dialogs */}
      <CreateUserModal
        open={modalsHook.activeModal === 'createUser'}
        onClose={modalsHook.closeModal}
        onSubmit={usersHook.createUser}
        roles={rolesHook.roles}
        opds={usersHook.opds}
        submitting={usersHook.submitting}
      />

      <EditUserModal
        open={modalsHook.activeModal === 'editUser'}
        onClose={modalsHook.closeModal}
        onSubmit={usersHook.updateUser}
        user={modalsHook.selectedUser}
        roles={rolesHook.roles}
        opds={usersHook.opds}
        submitting={usersHook.submitting}
      />

      <ResetPasswordModal
        open={modalsHook.activeModal === 'resetPass'}
        onClose={modalsHook.closeModal}
        onSubmit={usersHook.resetPassword}
        user={modalsHook.selectedUser}
        submitting={usersHook.submitting}
      />

      <DeleteUserModal
        open={modalsHook.activeModal === 'deleteUser'}
        onClose={modalsHook.closeModal}
        onSubmit={usersHook.removeUser}
        user={modalsHook.selectedUser}
        submitting={usersHook.submitting}
      />

      <RoleModal
        open={modalsHook.activeModal === 'role'}
        onClose={modalsHook.closeModal}
        onSubmit={modalsHook.selectedRole ? rolesHook.updateRole : rolesHook.createRole}
        role={modalsHook.selectedRole}
        permissionCategories={rolesHook.permissionCategories}
        submitting={rolesHook.submitting}
      />

      <DeleteRoleModal
        open={modalsHook.activeModal === 'deleteRole'}
        onClose={modalsHook.closeModal}
        onSubmit={rolesHook.removeRole}
        role={modalsHook.selectedRole}
        submitting={rolesHook.submitting}
      />
    </div>
  );
}
