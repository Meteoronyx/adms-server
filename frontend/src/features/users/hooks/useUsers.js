import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
  deleteAdminUser,
} from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers();
      if (res && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Gagal memuat daftar pengguna', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
        (u.username && u.username.toLowerCase().includes(search.toLowerCase()));

      const matchRole =
        roleFilter === 'all'
          ? true
          : roleFilter === 'no_role'
          ? !u.role_name
          : u.role_name === roleFilter;

      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const createUser = async (formData) => {
    setSubmitting(true);
    try {
      await createAdminUser(formData);
      addToast('Pengguna berhasil dibuat', 'success');
      await fetchUsers();
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal membuat pengguna', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updateUser = async (id, formData) => {
    setSubmitting(true);
    try {
      await updateAdminUser(id, formData);
      addToast('Pengguna berhasil diperbarui', 'success');
      await fetchUsers();
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal memperbarui pengguna', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (id, newPassword) => {
    setSubmitting(true);
    try {
      await resetAdminUserPassword(id, newPassword);
      addToast('Password berhasil direset', 'success');
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal mereset password', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const removeUser = async (id) => {
    setSubmitting(true);
    try {
      await deleteAdminUser(id);
      addToast('Pengguna berhasil dihapus', 'success');
      await fetchUsers();
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal menghapus pengguna', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    users,
    filteredUsers,
    loading,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    submitting,
    fetchUsers,
    createUser,
    updateUser,
    resetPassword,
    removeUser,
  };
}
