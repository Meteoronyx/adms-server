import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import { useToast } from '../../../hooks/useToast';
import {
  getDevicePegawai,
  updateUser,
  deleteUser,
  enrollFingerprint,
} from '../../../lib/api';

export function useDeviceDetail(sn) {
  const { addToast } = useToast();
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals
  const [updateUserModal, setUpdateUserModal] = useState({ open: false, data: null });
  const [enrollModal, setEnrollModal] = useState({ open: false, data: null });

  const fetchData = useCallback(async () => {
    if (!sn) return;
    try {
      const offset = (page - 1) * limit;
      const res = await getDevicePegawai(sn, { limit, offset, search: debouncedSearch });
      setData(res);
    } catch (err) {
      addToast(err.message || 'Gagal memuat data perangkat', 'error');
    } finally {
      setLoading(false);
    }
  }, [sn, page, debouncedSearch, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination on SN change
  useEffect(() => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }, [sn]);

  // Socket sync
  useEffect(() => {
    if (!socket || !sn) return;
    const handleDeviceUpdate = (eventData) => {
      if (eventData.sn === sn) {
        fetchData();
      }
    };
    socket.on('device_update', handleDeviceUpdate);
    return () => socket.off('device_update', handleDeviceUpdate);
  }, [socket, sn, fetchData]);

  const removeUserFromDevice = async (pin) => {
    if (!window.confirm(`Hapus pengguna dengan PIN ${pin} dari perangkat ini?`)) return;
    try {
      await deleteUser(sn, pin);
      addToast('Perintah hapus pengguna berhasil dimasukkan ke antrean', 'success');
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Gagal menghapus pengguna dari perangkat', 'error');
    }
  };

  const submitUpdateUser = async (pin, updateData) => {
    try {
      await updateUser(sn, { pin, ...updateData });
      addToast('Pembaruan data pengguna dimasukkan ke antrean', 'success');
      setUpdateUserModal({ open: false, data: null });
      await fetchData();
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal memperbarui pengguna', 'error');
      return false;
    }
  };

  const submitEnrollFingerprint = async (pin, enrollData) => {
    try {
      await enrollFingerprint(sn, { pin, ...enrollData });
      addToast('Pendaftaran sidik jari dimasukkan ke antrean', 'success');
      setEnrollModal({ open: false, data: null });
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal merekam sidik jari', 'error');
      return false;
    }
  };

  return {
    sn,
    device: data?.device || null,
    pegawai: data?.pegawai || [],
    totalCount: data?.total ?? 0,
    pegawaiCount: data?.count ?? 0,
    loading,
    search,
    setSearch,
    page,
    setPage,
    limit,
    updateUserModal,
    setUpdateUserModal,
    enrollModal,
    setEnrollModal,
    removeUserFromDevice,
    submitUpdateUser,
    submitEnrollFingerprint,
  };
}
