import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  listDevices,
  verifyDevice,
  unverifyDevice,
  reuploadDevice,
  rebootDevice,
  clearLog,
  infoDevice,
  updateDeviceDetails,
  listOpds,
} from "../lib/api";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import StatusBadge from "../components/StatusBadge";
import { DataTable } from "../components/ui/DataTable";
import { Skeleton } from "../components/ui/Skeleton";
import { Modal } from "../components/ui/Modal";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Power,
  Trash2,
  Info,
  Search,
  Pencil,
  MoreHorizontal,
} from "lucide-react";

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [opds, setOpds] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedOpdId, setSelectedOpdId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [editModal, setEditModal] = useState({
    open: false,
    sn: "",
    currentName: "",
    currentOpdId: "",
  });
  const { addToast } = useToast();
  const { user, hasPermission } = useAuth();
  const isSystemAdmin = user?.role === "admin";
  const isParentOpd = Boolean(user?.is_parent_opd);
  const canFilterByOpd = isSystemAdmin || isParentOpd;
  const canWrite = hasPermission("devices:write");
  const canCommand = hasPermission("devices:command");

  useEffect(() => {
    if (canFilterByOpd) {
      listOpds({ all: true })
        .then((res) => setOpds(res.data || res.opds || []))
        .catch(() => {});
    }
  }, [canFilterByOpd]);

  const fetchDevices = useCallback(
    async ({ manual = false } = {}) => {
      if (manual) setRefreshing(true);
      try {
        const data = await listDevices();
        setDevices(data.devices || []);
        setLastFetchedAt(new Date());
      } catch (err) {
        addToast(err.message || "Gagal memuat perangkat", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const doAction = useCallback(
    async (fn, sn, successMsg) => {
      try {
        await fn(sn);
        addToast(successMsg);
        await fetchDevices();
      } catch (err) {
        addToast(err.message || "Tindakan gagal", "error");
      }
    },
    [addToast, fetchDevices],
  );

  const handleEditDevice = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const newName = (fd.get("device_name") || "").trim();
      if (!newName) {
        addToast("Nama perangkat wajib diisi", "error");
        return;
      }
      if (isSystemAdmin && !editModal.currentOpdId) {
        addToast("Unit Kerja (OPD) wajib dipilih terlebih dahulu", "error");
        return;
      }

      try {
        await updateDeviceDetails(editModal.sn, {
          device_name: newName,
          opd_id: editModal.currentOpdId || null,
        });
        addToast("Informasi perangkat berhasil diperbarui", "success");
        setEditModal({
          open: false,
          sn: "",
          currentName: "",
          currentOpdId: "",
        });
        await fetchDevices();
      } catch (err) {
        addToast(err.message || "Gagal memperbarui perangkat", "error");
      }
    },
    [editModal, isSystemAdmin, addToast, fetchDevices],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = devices;

    if (selectedOpdId) {
      if (isSystemAdmin) {
        list = list.filter(
          (d) =>
            d.opd_id === selectedOpdId || d.parent_opd_id === selectedOpdId,
        );
      } else {
        list = list.filter((d) => d.opd_id === selectedOpdId);
      }
    }

    if (query) {
      list = list.filter(
        (d) =>
          (d.sn || "").toLowerCase().includes(query) ||
          (d.name || "").toLowerCase().includes(query) ||
          (d.device_name || "").toLowerCase().includes(query) ||
          (d.nama_opd || "").toLowerCase().includes(query) ||
          (d.parent_nama_opd || "").toLowerCase().includes(query) ||
          (d.kdunker || "").toLowerCase().includes(query) ||
          (d.ip_address || "").includes(query),
      );
    }

    return [...list].sort((a, b) =>
      String(a.sn || "").localeCompare(String(b.sn || ""), "en", {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [devices, search, selectedOpdId, isSystemAdmin]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "sn",
        header: "Serial Number",
        cell: ({ row }) => (
          <Link
            to={`/devices/${row.original.sn}`}
            className="font-mono text-xs text-accent hover:underline font-medium" // taste-skill-ignore
          >
            {row.original.sn}
          </Link>
        ),
      },
      {
        accessorKey: "device_name",
        header: "Nama / Lokasi Perangkat",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 group">
            <div>
              <span className="font-medium text-ink block">
                {row.original.device_name || (
                  <span className="text-muted">Belum diberi nama</span>
                )}
              </span>
              {row.original.name &&
                row.original.name !== row.original.device_name && (
                  <span className="text-xs text-muted block">
                    {row.original.name}
                  </span>
                )}
            </div>
            {canWrite && (
              <button
                type="button"
                title="Ubah nama dan unit kerja perangkat"
                onClick={() =>
                  setEditModal({
                    open: true,
                    sn: row.original.sn,
                    currentName: row.original.device_name || "",
                    currentOpdId: row.original.opd_id || "",
                  })
                }
                className="opacity-0 group-hover:opacity-100 p-1 rounded-[4px] text-muted hover:text-ink hover:bg-raised transition-opacity"
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
        ),
      },
      {
        accessorKey: "nama_opd",
        header: "Unit Kerja (OPD)",
        cell: ({ row }) => {
          const opdName = row.original.nama_opd;
          const parentName = row.original.parent_nama_opd;
          const kdunker = row.original.kdunker;
          if (!opdName) {
            return (
              <span className="inline-flex items-center px-2 h-5 rounded-[4px] text-xs font-medium bg-warning-bg text-warning-ink whitespace-nowrap">
                Belum dipetakan
              </span>
            );
          }
          return (
            <div className="flex flex-col max-w-xs">
              <span
                className="text-xs font-medium text-ink truncate"
                title={opdName}
              >
                {opdName}
              </span>
              {parentName && (
                <span
                  className="text-[11px] text-muted truncate"
                  title={`Induk: ${parentName}`}
                >
                  Induk: {parentName}
                </span>
              )}
              {kdunker && (
                <span className="text-[11px] font-mono text-faint">
                  {" "}
                  {/* taste-skill-ignore */}
                  {kdunker}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "ip_address",
        header: "Alamat IP",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted num">
            {" "}
            {/* taste-skill-ignore */}
            {row.original.ip_address || "—"}
          </span>
        ),
      },
      {
        accessorKey: "last_activity",
        header: "Aktivitas Terakhir",
        cell: ({ row }) => (
          <span className="text-muted text-xs num">
            {row.original.last_activity
              ? new Date(row.original.last_activity).toLocaleString("id-ID")
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "verified",
        header: "Verifikasi",
        cell: ({ row }) =>
          row.original.verified ? (
            <div className="flex items-center gap-1.5 text-positive">
              <CheckCircle2 size={14} strokeWidth={1.8} />
              <span className="text-xs font-medium">Terverifikasi</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted">
              <XCircle size={14} strokeWidth={1.5} />
              <span className="text-xs font-normal">Belum</span>
            </div>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const d = row.original;

          const actionItems = [];
          if (canWrite) {
            actionItems.push({
              label: "Ubah Nama & OPD",
              icon: Pencil,
              onClick: () =>
                setEditModal({
                  open: true,
                  sn: d.sn,
                  currentName: d.device_name || "",
                  currentOpdId: d.opd_id || "",
                }),
            });
          }
          if (canWrite) {
            actionItems.push(
              d.verified
                ? {
                    label: "Batalkan Verifikasi",
                    icon: XCircle,
                    onClick: () =>
                      doAction(
                        unverifyDevice,
                        d.sn,
                        `Verifikasi ${d.sn} dibatalkan`,
                      ),
                  }
                : {
                    label: "Verifikasi Perangkat",
                    icon: CheckCircle2,
                    onClick: () => {
                      if (
                        !d.device_name ||
                        !d.device_name.trim() ||
                        !d.opd_id
                      ) {
                        addToast(
                          "Harap lengkapi Nama Perangkat dan Unit Kerja (OPD) terlebih dahulu sebelum melakukan verifikasi",
                          "error",
                        );
                        setEditModal({
                          open: true,
                          sn: d.sn,
                          currentName: d.device_name || "",
                          currentOpdId: d.opd_id || "",
                        });
                        return;
                      }
                      doAction(
                        verifyDevice,
                        d.sn,
                        `Perangkat ${d.sn} terverifikasi`,
                      );
                    },
                  },
            );
          }
          if (canCommand) {
            actionItems.push(
              {
                label: "Tarik Ulang Log Presensi",
                icon: RefreshCw,
                onClick: () =>
                  doAction(
                    reuploadDevice,
                    d.sn,
                    `Perintah reupload dikirim ke ${d.sn}`,
                  ),
              },
              {
                label: "Minta Info Perangkat",
                icon: Info,
                onClick: () =>
                  doAction(
                    infoDevice,
                    d.sn,
                    `Perintah info dikirim ke ${d.sn}`,
                  ),
              },
              {
                label: "Mulai Ulang (Reboot)",
                icon: Power,
                onClick: () =>
                  doAction(
                    rebootDevice,
                    d.sn,
                    `Perintah reboot dikirim ke ${d.sn}`,
                  ),
              },
              {
                label: "Bersihkan Log Mesin",
                icon: Trash2,
                variant: "danger",
                onClick: () =>
                  doAction(
                    clearLog,
                    d.sn,
                    `Perintah hapus log dikirim ke ${d.sn}`,
                  ),
              },
            );
          }

          if (actionItems.length === 0) return null;

          return (
            <div className="flex justify-end">
              <DropdownMenu
                trigger={
                  <button
                    type="button"
                    className="p-1.5 rounded-[6px] text-muted hover:text-ink hover:bg-raised transition-colors"
                    aria-label="Tindakan perangkat"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                }
                items={actionItems}
                align="end"
              />
            </div>
          );
        },
      },
    ],
    [canWrite, canCommand, doAction, addToast],
  );

  return (
    <div className="space-y-6 pb-4">
      {/* Page Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink leading-tight">
            Manajemen Perangkat
          </h1>
          {/* <p className="text-sm text-muted mt-1">
            Pantau status koneksi, pemetaan OPD, dan perintah jarak jauh mesin
            presensi ADMS.
          </p>*/}
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {lastFetchedAt && (
            <span className="text-xs text-muted num hidden sm:inline">
              Diperbarui {lastFetchedAt.toLocaleTimeString("id-ID")}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchDevices({ manual: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-[6px] border border-control bg-surface text-ink hover:bg-raised transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>Perbarui</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-[316px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Cari SN, nama lokasi, OPD, atau IP…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-[6px] border border-control bg-surface text-ink placeholder:text-faint focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {canFilterByOpd && opds.length > 1 && (
            <div className="w-full sm:w-[300px]">
              <SearchableSelect
                value={selectedOpdId}
                onChange={(val) => setSelectedOpdId(val)}
                options={opds.map((o) => ({
                  value: o.id,
                  label: o.is_induk
                    ? `★ ${o.nama_opd} (Induk)`
                    : `${o.nama_opd}`,
                }))}
                placeholder="Filter Unit Kerja / Puskesmas…"
                defaultOptionLabel="Semua Unit Kerja"
              />
            </div>
          )}
        </div>
        <div className="text-xs text-muted num">
          Total <span className="font-medium text-ink">{filtered.length}</span>{" "}
          perangkat
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          pagination={true}
          getRowId={(row) => row.sn}
        />
      )}

      {/* Edit Device & OPD Modal */}
      <Modal
        open={editModal.open}
        onOpenChange={(isOpen) => {
          if (!isOpen)
            setEditModal({
              open: false,
              sn: "",
              currentName: "",
              currentOpdId: "",
            });
        }}
        title="Ubah Informasi Perangkat"
        description={`Serial Number: ${editModal.sn}`}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() =>
                setEditModal({
                  open: false,
                  sn: "",
                  currentName: "",
                  currentOpdId: "",
                })
              }
              className="h-8 px-3.5 text-xs font-medium text-ink bg-surface border border-control hover:bg-raised rounded-[6px] transition-colors"
            >
              Batal
            </button>
            <button
              form="edit-device-form"
              type="submit"
              className="h-8 px-3.5 text-xs font-medium bg-ink text-white hover:bg-ink/90 rounded-[6px] transition-colors"
            >
              Simpan Perubahan
            </button>
          </>
        }
      >
        <form
          id="edit-device-form"
          onSubmit={handleEditDevice}
          className="space-y-4 py-1"
        >
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Nama / Lokasi Perangkat <span className="text-negative">*</span>
            </label>
            <input
              type="text"
              name="device_name"
              defaultValue={editModal.currentName}
              placeholder="Contoh: Kantor Kecamatan Kresek"
              autoFocus
              required
              className="w-full h-[38px] text-sm rounded-[6px] border border-control px-3 bg-surface text-ink focus:outline-none focus:border-accent placeholder:text-faint transition-colors"
            />
          </div>

          {isSystemAdmin && (
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Unit Kerja (OPD) <span className="text-negative">*</span>
              </label>
              <SearchableSelect
                value={editModal.currentOpdId || ""}
                onChange={(val) =>
                  setEditModal((prev) => ({ ...prev, currentOpdId: val }))
                }
                options={opds.map((o) => ({
                  value: o.id,
                  label: `${o.nama_opd} (${o.kdunker || "—"})`,
                }))}
                placeholder="Pilih Unit Kerja (OPD)…"
                defaultOptionLabel=""
              />
              <p className="text-xs text-muted mt-1.5">
                Perangkat ini akan terhubung dengan daftar pegawai pada Unit
                Kerja yang dipilih.
              </p>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
