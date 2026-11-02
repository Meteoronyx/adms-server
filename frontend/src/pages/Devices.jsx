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
  Building2,
} from "lucide-react";

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [opds, setOpds] = useState([]);
  const [search, setSearch] = useState("");
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
  const canWrite = hasPermission("devices:write");
  const canCommand = hasPermission("devices:command");

  // Fetch OPDs for mapping (only needed for admin)
  useEffect(() => {
    if (isSystemAdmin) {
      listOpds({ all: true })
        .then((res) => setOpds(res.data || res.opds || []))
        .catch(() => {});
    }
  }, [isSystemAdmin]);

  // Data diambil sekali saat halaman dibuka. Update hanya lewat tombol Refresh.
  const fetchDevices = useCallback(
    async ({ manual = false } = {}) => {
      if (manual) setRefreshing(true);
      try {
        const data = await listDevices();
        setDevices(data.devices || []);
        setLastFetchedAt(new Date());
      } catch (err) {
        addToast(err.message || "Failed to load devices", "error");
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
        addToast(err.message || "Action failed", "error");
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

  // Urutan selalu SN ascending (numeric-aware) supaya baris tidak pernah
  // bergeser hanya karena ada perangkat yang baru saja heartbeat.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query
      ? devices.filter(
          (d) =>
            (d.sn || "").toLowerCase().includes(query) ||
            (d.name || "").toLowerCase().includes(query) ||
            (d.device_name || "").toLowerCase().includes(query) ||
            (d.nama_opd || "").toLowerCase().includes(query) ||
            (d.kdunker || "").toLowerCase().includes(query) ||
            (d.ip_address || "").includes(query),
        )
      : devices;

    return [...list].sort((a, b) =>
      String(a.sn || "").localeCompare(String(b.sn || ""), "en", {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [devices, search]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "sn",
        header: "SN",
        cell: ({ row }) => (
          <Link
            to={`/devices/${row.original.sn}`}
            className="font-mono text-sm text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline font-medium"
          >
            {row.original.sn}
          </Link>
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-400">
            {row.original.name || "-"}
          </span>
        ),
      },
      {
        accessorKey: "device_name",
        header: "Device Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 group">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {row.original.device_name || (
                <span className="text-slate-400 italic">Belum diisi</span>
              )}
            </span>
            {canWrite && (
              <button
                title="Edit nama dan unit kerja perangkat"
                onClick={() =>
                  setEditModal({
                    open: true,
                    sn: row.original.sn,
                    currentName: row.original.device_name || "",
                    currentOpdId: row.original.opd_id || "",
                  })
                }
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
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
          const kdunker = row.original.kdunker;
          if (!opdName) {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                Belum Dipetakan
              </span>
            );
          }
          return (
            <div className="flex flex-col max-w-xs">
              <span
                className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate"
                title={opdName}
              >
                {opdName}
              </span>
              {kdunker && (
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {kdunker}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "ip_address",
        header: "IP Address",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-400">
            {row.original.ip_address || "-"}
          </span>
        ),
      },
      {
        accessorKey: "last_activity",
        header: "Last Activity",
        cell: ({ row }) => (
          <span className="text-slate-500 text-xs">
            {row.original.last_activity
              ? new Date(row.original.last_activity).toLocaleString("id-ID")
              : "-"}
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
        header: "Verified",
        cell: ({ row }) =>
          row.original.verified ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={14} strokeWidth={2} />
              <span className="text-xs font-medium">Yes</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400">
              <XCircle size={14} strokeWidth={1.5} />
              <span className="text-xs font-medium">No</span>
            </div>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const d = row.original;

          const actionItems = [];
          if (canWrite) {
            actionItems.push({
              label: "Edit Device & OPD",
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
                    label: "Unverify Device",
                    icon: XCircle,
                    onClick: () =>
                      doAction(unverifyDevice, d.sn, `Unverified ${d.sn}`),
                  }
                : {
                    label: "Verify Device",
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
                      doAction(verifyDevice, d.sn, `Verified ${d.sn}`);
                    },
                  },
            );
          }
          if (canCommand) {
            actionItems.push(
              {
                label: "Reupload Attendance",
                icon: RefreshCw,
                onClick: () =>
                  doAction(reuploadDevice, d.sn, `Reupload queued for ${d.sn}`),
              },
              {
                label: "Request Device Info",
                icon: Info,
                onClick: () =>
                  doAction(infoDevice, d.sn, `Info queued for ${d.sn}`),
              },
              {
                label: "Reboot Device",
                icon: Power,
                onClick: () =>
                  doAction(rebootDevice, d.sn, `Reboot queued for ${d.sn}`),
              },
              {
                label: "Clear Log",
                icon: Trash2,
                variant: "danger",
                onClick: () =>
                  doAction(clearLog, d.sn, `Clear log queued for ${d.sn}`),
              },
            );
          }

          if (actionItems.length === 0) return null;

          return (
            <DropdownMenu
              trigger={
                <button
                  type="button"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Aksi Perangkat"
                >
                  <MoreHorizontal size={16} />
                </button>
              }
              items={actionItems}
              align="end"
            />
          );
        },
      },
    ],
    [canWrite, canCommand, doAction, addToast],
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Perangkat
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pantau dan kelola seluruh mesin absensi yang terdaftar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastFetchedAt && (
            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
              Data: {lastFetchedAt.toLocaleTimeString("id-ID")}
            </span>
          )}
          <button
            onClick={() => fetchDevices({ manual: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors disabled:opacity-50 shadow-sm"
            title="Muat ulang daftar perangkat"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Cari SN, nama mesin, unit kerja OPD, atau IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-colors"
          />
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          Total:{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {filtered.length}
          </span>{" "}
          perangkat
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
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
        title="Edit Informasi Perangkat"
        description={`SN: ${editModal.sn}`}
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
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              form="edit-device-form"
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors"
            >
              Simpan
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama / Lokasi Perangkat <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="device_name"
              defaultValue={editModal.currentName}
              placeholder="Contoh: Kantor Kecamatan Kresek"
              autoFocus
              required
              className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400 transition-colors"
            />
          </div>

          {isSystemAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Unit Kerja (OPD) <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={editModal.currentOpdId || ""}
                onChange={(val) =>
                  setEditModal((prev) => ({ ...prev, currentOpdId: val }))
                }
                options={opds.map((o) => ({
                  value: o.id,
                  label: `${o.nama_opd} (${o.kdunker || "-"})`,
                }))}
                placeholder="-- Cari dan Pilih Unit Kerja (OPD) --"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Perangkat hanya akan muncul pada akun pengguna yang terdaftar di
                Unit Kerja ini.
              </p>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
