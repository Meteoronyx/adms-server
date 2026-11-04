import { Badge } from '../../../components/ui/Badge';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import {
  UserPlus,
  Search,
  Users as UsersIcon,
  Shield,
  KeyRound,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';

export function UsersTab({
  users = [],
  roles = [],
  opds = [],
  loading,
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  opdFilter,
  setOpdFilter,
  currentUser,
  hasPermission,
  onOpenCreate,
  onOpenEdit,
  onOpenResetPass,
  onOpenDelete,
}) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-b border-border bg-raised/40">
        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, username, atau OPD..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:border-accent text-ink placeholder-faint transition-colors"
            />
          </div>

          {/* Role Filter */}
          <div className="w-full sm:w-44">
            <SearchableSelect
              size="xs"
              value={roleFilter === 'all' ? '' : roleFilter}
              onChange={(val) => setRoleFilter(val === '' ? 'all' : val)}
              options={[
                { value: 'no_role', label: 'Tanpa Role' },
                ...roles.map((r) => ({
                  value: r.name,
                  label: `Role: ${r.name}`,
                })),
              ]}
              defaultOptionLabel="Semua Role"
              placeholder="Semua Role"
            />
          </div>

          {/* OPD Filter */}
          <div className="w-full sm:w-60">
            <SearchableSelect
              size="xs"
              value={opdFilter === 'all' ? '' : opdFilter}
              onChange={(val) => setOpdFilter(val === '' ? 'all' : val)}
              options={[
                { value: 'global', label: 'Global / Tanpa OPD' },
                ...opds.map((o) => ({
                  value: o.id,
                  label: `${o.nama_opd} (${o.kdunker})`,
                })),
              ]}
              defaultOptionLabel="Semua Unit Kerja (OPD)"
              placeholder="Semua Unit Kerja (OPD)"
            />
          </div>
        </div>

        {/* Action Button */}
        {hasPermission('users:write') && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-ink hover:bg-ink/90 rounded-lg transition-colors shrink-0"
          >
            <UserPlus size={14} />
            <span>Tambah Pengguna</span>
          </button>
        )}
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="p-8 text-center text-muted text-xs">
          Memuat daftar pengguna...
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center text-muted">
          <UsersIcon className="w-7 h-7 mx-auto mb-2 text-faint" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink">Tidak ada pengguna ditemukan</p>
          <p className="text-xs text-muted mt-0.5">Coba sesuaikan kata kunci pencarian atau filter role.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-raised/60 text-muted font-medium border-b border-border">
              <tr>
                <th className="px-4 py-2.5">Pengguna</th>
                <th className="px-4 py-2.5">Username</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Induk Unit Kerja (OPD)</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule text-ink">
              {users.map((u) => {
                const isSelf = currentUser && currentUser.id === u.id;
                return (
                  <tr key={u.id} className="hover:bg-raised/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-raised text-ink font-semibold flex items-center justify-center text-xs shrink-0 border border-border">
                          {u.name ? u.name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-ink flex items-center gap-1.5">
                            {u.name || u.username}
                            {isSelf && (
                              <Badge variant="info" size="sm">
                                Anda
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted"> {/* taste-skill-ignore */}
                      {u.username}
                    </td>
                    <td className="px-4 py-3">
                      {u.role_name ? (
                        <Badge variant="info" icon={Shield}>
                          {u.role_name}
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Tanpa Role</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {u.nama_opd ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-ink">{u.nama_opd}</span>
                          <span className="text-[11px] font-mono text-muted">{u.kdunker}</span> {/* taste-skill-ignore */}
                        </div>
                      ) : (
                        <span className="text-muted">Global / Seluruh OPD</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active ? (
                        <Badge variant="success" icon={UserCheck}>
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="danger" icon={UserX}>
                          Nonaktif
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(() => {
                          const isTargetAdmin = u.role === 'admin';
                          const canModify = currentUser?.role === 'admin' || !isTargetAdmin;
                          return (
                            <>
                              {hasPermission('users:write') && canModify && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onOpenEdit(u)}
                                    title="Edit Pengguna"
                                    className="p-1.5 text-muted hover:text-ink hover:bg-raised rounded-md transition-colors"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenResetPass(u)}
                                    title="Reset Password"
                                    className="p-1.5 text-muted hover:text-warning hover:bg-[#fdf5e6] rounded-md transition-colors"
                                  >
                                    <KeyRound size={14} />
                                  </button>
                                </>
                              )}
                              {hasPermission('users:delete') && canModify && !isSelf && (
                                <button
                                  type="button"
                                  onClick={() => onOpenDelete(u)}
                                  title="Hapus Pengguna"
                                  className="p-1.5 text-muted hover:text-negative hover:bg-[#fdeded] rounded-md transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
