import { Badge } from '../../../components/ui/Badge';
import { Shield, Plus, Pencil, Trash2, ShieldCheck, FolderKey } from 'lucide-react';

export function RolesTab({
  roles,
  loading,
  hasPermission,
  onOpenCreateRole,
  onOpenEditRole,
  onOpenDeleteRole,
}) {
  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#18192d] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Pengaturan Role & Hak Akses
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-400">
              Kelola kelompok wewenang pengguna dalam sistem
            </p>
          </div>
        </div>

        {hasPermission('roles:write') && (
          <button
            onClick={onOpenCreateRole}
            className="flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all flex-shrink-0"
          >
            <Plus size={14} />
            <span>Tambah Role</span>
          </button>
        )}
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
          Memuat daftar role...
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white dark:bg-[#18192d] p-12 text-center text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl">
          <FolderKey className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold">Belum ada role terdefinisi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => {
            const isSystem = r.is_system;
            const perms = r.permissions || [];

            return (
              <div
                key={r.id}
                className="bg-white dark:bg-[#18192d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
              >
                {/* Role Title & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {r.name}
                      </h3>
                      {isSystem && (
                        <Badge variant="warning">
                          System Role
                        </Badge>
                      )}
                    </div>
                    {r.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {r.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {hasPermission('roles:write') && (
                      <button
                        onClick={() => onOpenEditRole(r)}
                        title="Edit Role & Permissions"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {hasPermission('roles:delete') && !isSystem && (
                      <button
                        onClick={() => onOpenDeleteRole(r)}
                        title="Hapus Role"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Permissions Badges */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Hak Akses ({perms.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                    {perms.length === 0 ? (
                      <span className="text-xs italic text-slate-400">Tidak ada hak akses</span>
                    ) : (
                      perms.map((p) => (
                        <Badge key={p.id} variant="neutral" size="sm">
                          {p.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
