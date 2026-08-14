import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
  deleteAdminUser,
  listOpds,
} from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [opds, setOpds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [opdFilter, setOpdFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [resUsers, resOpds] = await Promise.all([
        getAdminUsers(),
        listOpds({ all: true }).catch(() => ({ data: [] }))
      ]);

      if (resUsers && resUsers.data) {
        setUsers(resUsers.data);
      }
      if (resOpds && resOpds.data) {
        setOpds(resOpds.data);
      }
    } catch (err) {
      addToast(err.message || 'Gagal memuat data pengguna', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const s = search.toLowerCase().trim();
    return users.filter((u) => {
      const matchSearch =
        !s ||
        (u.name && u.name.toLowerCase().includes(s)) ||
        (u.username && u.username.toLowerCase().includes(s)) ||
        (u.nama_opd && u.nama_opd.toLowerCase().includes(s)) ||
        (u.kdunker && u.kdunker.toLowerCase().includes(s));

      const matchRole =
        roleFilter === 'all'
          ? true
          : roleFilter === 'no_role'
          ? !u.role_name
          : u.role_name === roleFilter;

      const matchOpd =
        opdFilter === 'all'
          ? true
          : opdFilter === 'global'
          ? !u.opd_id
          : u.opd_id === opdFilter;

      return matchSearch && matchRole && matchOpd;
    });
  }, [users, search, roleFilter, opdFilter]);

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
    opds,
    filteredUsers,
    loading,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    opdFilter,
    setOpdFilter,
    submitting,
    fetchUsers,
    createUser,
    updateUser,
    resetPassword,
    removeUser,
  };
}
