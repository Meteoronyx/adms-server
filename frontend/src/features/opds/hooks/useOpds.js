import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listOpds,
  createOpd,
  updateOpd,
  deleteOpd,
  triggerAutoMap,
} from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';

export function useOpds() {
  const [opds, setOpds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();
  const debounceRef = useRef(null);

  const fetchOpds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listOpds({ search, page, limit });
      setOpds(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (err) {
      addToast(err.message || 'Gagal memuat data OPD', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, page, addToast]);

  useEffect(() => {
    fetchOpds();
  }, [fetchOpds]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const create = async (formData) => {
    setSubmitting(true);
    try {
      await createOpd(formData);
      addToast('OPD berhasil ditambahkan', 'success');
      await fetchOpds();
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal menambahkan OPD', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const update = async (id, formData) => {
    setSubmitting(true);
    try {
      await updateOpd(id, formData);
      addToast('OPD berhasil diperbarui', 'success');
      await fetchOpds();
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal memperbarui OPD', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    setSubmitting(true);
    try {
      await deleteOpd(id);
      addToast('OPD berhasil dihapus', 'success');
      await fetchOpds();
      return true;
    } catch (err) {
      addToast(err.message || 'Gagal menghapus OPD', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const autoMap = async () => {
    setSubmitting(true);
    try {
      const res = await triggerAutoMap();
      addToast(res.message || 'Auto-mapping OPD selesai', 'success');
      return true;
    } catch (err) {
      addToast(err.message || 'Auto-mapping OPD gagal', 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    opds,
    loading,
    searchInput,
    setSearchInput,
    page,
    setPage,
    limit,
    total,
    submitting,
    fetchOpds,
    create,
    update,
    remove,
    autoMap,
  };
}
