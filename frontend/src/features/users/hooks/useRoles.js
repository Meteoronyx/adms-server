import { useState, useEffect, useCallback } from 'react';
import {
  getAdminRoles,
  getAdminPermissions,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
} from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [permissionCategories, setPermissionCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const fetchRolesAndPermissions = useCallback(async () => {
    setLoading(true);
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

        // Group permissions by category
        const categories = {};
        permsRes.data.forEach((perm) => {
          const cat = perm.category || 'Lainnya';
          if (!categories[cat]) {
            categories[cat] = [];
          }
          categories[cat].push(perm);
        });
        setPermissionCategories(categories);
      }
    } catch (err) {
      addToast(err.message || 'Gagal memuat daftar role & hak akses', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [fetchRolesAndPermissions]);

  const createRole = async (roleData) => {
    setSubmitting(true);
    try {
      await createAdminRole(roleData);
      addToast('Role berhasil dibuat', 'success');
      await fetchRolesAndPermissions();
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal membuat role', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updateRole = async (id, roleData) => {
    setSubmitting(true);
    try {
      await updateAdminRole(id, roleData);
      addToast('Role berhasil diperbarui', 'success');
      await fetchRolesAndPermissions();
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal memperbarui role', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const removeRole = async (id) => {
    setSubmitting(true);
    try {
      await deleteAdminRole(id);
      addToast('Role berhasil dihapus', 'success');
      await fetchRolesAndPermissions();
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal menghapus role', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    roles,
    permissions,
    permissionCategories,
    loading,
    submitting,
    fetchRolesAndPermissions,
    createRole,
    updateRole,
    removeRole,
  };
}
