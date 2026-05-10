import { useEffect, useState } from 'react';
import { getCommandQueue } from '../lib/api';
import { useToast } from '../hooks/useToast';
import StatusBadge from '../components/StatusBadge';
import { ListOrdered, RefreshCw, Activity } from 'lucide-react';

export default function Commands() {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetch = async () => {
    try {
      const data = await getCommandQueue();
      setCommands(data.commands || []);
    } catch {
      addToast('Failed to load commands', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const iv = setInterval(fetch, 10000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Command Queue</h1>
          <p className="text-sm text-slate-500 mt-1">{commands.length} perintah dalam antrian</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Activity size={14} />
            <span>Auto-refresh every 10s</span>
          </div>
          <button
            onClick={fetch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-900"></div>
            <p className="text-sm text-slate-400">Loading commands...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">ID</th>
                  <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Device SN</th>
                  <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Device Name</th>
                  <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Type</th>
                  <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Params</th>
                  <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Status</th>
                  <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commands.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-slate-700">{c.id}</td>
                    <td className="px-6 py-3.5 font-mono text-sm text-slate-700">{c.device_sn}</td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium">{c.device_name || '-'}</td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700">{c.command_type}</span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs max-w-xs truncate font-mono" title={JSON.stringify(c.command_params)}>
                      {JSON.stringify(c.command_params)}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs">{c.created_at ? new Date(c.created_at).toLocaleString('id-ID') : '-'}</td>
                  </tr>
                ))}
                {commands.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ListOrdered size={24} className="text-slate-300" strokeWidth={1.5} />
                        <p className="text-sm text-slate-400 font-medium">Tidak ada perintah dalam antrian</p>
                        <p className="text-xs text-slate-400">Sistem dalam keadaan idle.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
