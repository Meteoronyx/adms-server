import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Tabs } from '../components/ui/Tabs';

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
    { key: 'users', label: 'Kelola Pengguna', count: usersHook.users?.length || 0 },
    { key: 'roles', label: 'Role & Hak Akses', count: rolesHook.roles?.length || 0 },
  ];

  return (
    <div className="space-y-5 fade-in pb-8">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-semibold text-ink tracking-[-0.015em]">
          Manajemen Pengguna & Hak Akses
        </h1>
        <p className="text-[13px] text-muted mt-0.5">
          Kelola akun administrator, operator unit kerja, dan konfigurasi hak akses berbasis role (RBAC)
        </p>
      </div>

      <Tabs tabs={tabOptions} activeTab={activeTab} onChange={setActiveTab} />

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
