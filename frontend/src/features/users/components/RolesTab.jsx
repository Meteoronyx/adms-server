import { Badge } from '../../../components/ui/Badge';
import { Plus, Pencil, Trash2, ShieldCheck, FolderKey } from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface px-4 py-3 rounded-xl border border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-raised text-ink flex items-center justify-center border border-border">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-ink">
              Pengaturan Role & Hak Akses
            </h2>
            <p className="text-[11px] text-muted">
              Kelola kelompok akses pengguna dalam sistem
            </p>
          </div>
        </div>

        {hasPermission('roles:write') && (
          <button
            type="button"
            onClick={onOpenCreateRole}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-ink hover:bg-ink/90 rounded-lg transition-colors shrink-0"
          >
            <Plus size={14} />
            <span>Tambah Role</span>
          </button>
        )}
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="p-8 text-center text-muted text-xs">
          Memuat daftar role...
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-surface p-12 text-center text-muted border border-border rounded-xl">
          <FolderKey className="w-7 h-7 mx-auto mb-2 text-faint" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink">Belum ada role terdefinisi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => {
            const isSystem = r.is_system;
            const perms = r.permissions || [];

            return (
              <div
                key={r.id}
                className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between hover:border-control transition-colors space-y-3"
              >
                {/* Role Title & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-ink">
                        {r.name}
                      </h3>
                      {isSystem && (
                        <Badge variant="warning">
                          System Role
                        </Badge>
                      )}
                    </div>
                    {r.description && (
                      <p className="text-xs text-muted mt-0.5">
                        {r.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {hasPermission('roles:write') && (
                      <button
                        type="button"
                        onClick={() => onOpenEditRole(r)}
                        title="Edit Role & Permissions"
                        className="p-1.5 text-muted hover:text-ink hover:bg-raised rounded-md transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {hasPermission('roles:delete') && !isSystem && (
                      <button
                        type="button"
                        onClick={() => onOpenDeleteRole(r)}
                        title="Hapus Role"
                        className="p-1.5 text-muted hover:text-negative hover:bg-[#fdeded] rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Permissions Badges */}
                <div className="space-y-1.5 pt-2.5 border-t border-rule">
                  <span className="text-[11px] font-medium text-muted block num">
                    Hak Akses ({perms.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {perms.length === 0 ? (
                      <span className="text-xs text-faint">Tidak ada hak akses</span>
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
