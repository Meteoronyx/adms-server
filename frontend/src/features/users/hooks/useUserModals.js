import { useState } from 'react';

export function useUserModals() {
  const [activeModal, setActiveModal] = useState(null); // 'createUser' | 'editUser' | 'resetPass' | 'deleteUser' | 'role' | 'deleteRole' | null
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  const openCreateUser = () => {
    setSelectedUser(null);
    setActiveModal('createUser');
  };

  const openEditUser = (user) => {
    setSelectedUser(user);
    setActiveModal('editUser');
  };

  const openResetPassword = (user) => {
    setSelectedUser(user);
    setActiveModal('resetPass');
  };

  const openDeleteUser = (user) => {
    setSelectedUser(user);
    setActiveModal('deleteUser');
  };

  const openCreateRole = () => {
    setSelectedRole(null);
    setActiveModal('role');
  };

  const openEditRole = (role) => {
    setSelectedRole(role);
    setActiveModal('role');
  };

  const openDeleteRole = (role) => {
    setSelectedRole(role);
    setActiveModal('deleteRole');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
    setSelectedRole(null);
  };

  return {
    activeModal,
    selectedUser,
    selectedRole,
    openCreateUser,
    openEditUser,
    openResetPassword,
    openDeleteUser,
    openCreateRole,
    openEditRole,
    openDeleteRole,
    closeModal,
  };
}
