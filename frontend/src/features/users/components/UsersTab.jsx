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
  users,
  roles,
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
    <div className="space-y-4">
      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#18192d] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, username, atau OPD..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-colors"
            />
          </div>

          {/* Role Filter */}
          <div className="w-full sm:w-48">
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
          <div className="w-full sm:w-64">
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
            onClick={onOpenCreate}
            className="flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all flex-shrink-0"
          >
            <UserPlus size={14} />
            <span>Tambah Pengguna</span>
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#18192d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            Memuat daftar pengguna...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">Tidak ada pengguna ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter role.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/60 dark:border-slate-800/60 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Induk Unit Kerja (OPD)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {users.map((u) => {
                  const isSelf = currentUser && currentUser.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-indigo-100 dark:border-indigo-900/40">
                            {u.name ? u.name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {u.name || u.username}
                              {isSelf && (
                                <Badge variant="indigo" size="sm">
                                  Anda
                                </Badge>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                        {u.username}
                      </td>
                      <td className="px-4 py-3">
                        {u.role_name ? (
                          <Badge variant="indigo" icon={Shield}>
                            {u.role_name}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Tanpa Role</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {u.nama_opd ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{u.nama_opd}</span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{u.kdunker}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Global / Seluruh OPD</span>
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
                          {hasPermission('users:write') && (
                            <>
                              <button
                                onClick={() => onOpenEdit(u)}
                                title="Edit Pengguna"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => onOpenResetPass(u)}
                                title="Reset Password"
                                className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg transition-colors"
                              >
                                <KeyRound size={15} />
                              </button>
                            </>
                          )}
                          {hasPermission('users:delete') && !isSelf && (
                            <button
                              onClick={() => onOpenDelete(u)}
                              title="Hapus Pengguna"
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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
    </div>
  );
}
