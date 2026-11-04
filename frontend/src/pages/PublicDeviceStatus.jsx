import { useEffect, useState, useMemo, useCallback } from "react";
import { getPublicDeviceStatus } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { DataTable } from "../components/ui/DataTable";
import { Skeleton } from "../components/ui/Skeleton";
import { Search, RefreshCw } from "lucide-react";

export default function PublicDeviceStatus() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [search, setSearch] = useState("");

  const fetchStatus = useCallback(async ({ manual = false } = {}) => {
    if (manual) setRefreshing(true);
    try {
      const res = await getPublicDeviceStatus();
      if (res && res.success) {
        setDevices(res.devices || []);
        setLastFetchedAt(new Date(res.updated_at || Date.now()));
      }
    } catch {
      // Fail gracefully
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Auto-refresh setiap 30 detik
    const timer = setInterval(() => {
      fetchStatus();
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  // Filter pencarian instan (SN, nama lokasi/perangkat, OPD)
  const filtered = useMemo(() => {
    if (!search.trim()) return devices;
    const query = search.trim().toLowerCase();
    return devices.filter((d) => {
      const name = (d.name || "").toLowerCase();
      const opd = (d.opd || "").toLowerCase();
      const parentOpd = (d.parent_opd || "").toLowerCase();
      const sn = (d.masked_sn || "").toLowerCase();
      return (
        name.includes(query) ||
        opd.includes(query) ||
        parentOpd.includes(query) ||
        sn.includes(query)
      );
    });
  }, [devices, search]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "masked_sn",
        header: "Serial Number",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-ink font-medium">
            {row.original.masked_sn}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Nama / Lokasi Perangkat",
        cell: ({ row }) => (
          <div>
            <span className="font-medium text-ink block">
              {row.original.name || (
                <span className="text-muted">Belum diberi nama</span>
              )}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "opd",
        header: "Unit Kerja (OPD)",
        cell: ({ row }) => {
          const opdName = row.original.opd;
          const parentName = row.original.parent_opd;
          if (!opdName || opdName === "Umum") {
            return (
              <span className="text-xs text-muted">
                {opdName || "—"}
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
            </div>
          );
        },
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
    ],
    []
  );

  return (
    <div className="min-h-screen bg-ground text-ink p-4 sm:p-6 space-y-4">
      {/* Filter / Search Bar - replika persis menu perangkat */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-[316px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Cari SN, nama lokasi, OPD…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-[6px] border border-control bg-surface text-ink placeholder:text-faint focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {lastFetchedAt && (
            <span className="text-xs text-muted num hidden sm:inline">
              Diperbarui {lastFetchedAt.toLocaleTimeString("id-ID")}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchStatus({ manual: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-[6px] border border-control bg-surface text-ink hover:bg-raised transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>Perbarui</span>
          </button>
          <div className="text-xs text-muted num">
            Total <span className="font-medium text-ink">{filtered.length}</span>{" "}
            perangkat
          </div>
        </div>
      </div>

      {/* Table tanpa pagination */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          pagination={false}
          getRowId={(row) => row.masked_sn}
        />
      )}
    </div>
  );
}
