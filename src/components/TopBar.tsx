import { useTopologyStore } from '../store/useTopologyStore';
import { Network, Download, Upload, Trash2 } from 'lucide-react';

export default function TopBar() {
  const exportTopology = useTopologyStore(s => s.exportTopology);
  const importTopology = useTopologyStore(s => s.importTopology);
  const clearTopology = useTopologyStore(s => s.clearTopology);
  const devices = useTopologyStore(s => s.devices);
  const connections = useTopologyStore(s => s.connections);

  const handleExport = () => {
    const data = exportTopology();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'network-topology.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.version === 1 && Array.isArray(data.devices)) {
            importTopology(data);
          } else {
            alert('Invalid topology file');
          }
        } catch {
          alert('Failed to parse topology file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const deviceCount = Object.keys(devices).length;

  return (
    <div className="bg-slate-850 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Network className="w-5 h-5 text-blue-400" />
        <span className="font-semibold text-sm text-slate-200">NetSim Lab</span>
        <span className="text-xs text-slate-500">计算机网络实验平台</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>{deviceCount} devices</span>
        <span className="text-slate-700">|</span>
        <span>{connections.length} links</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleImport}
          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
          title="Import Topology"
        >
          <Upload size={14} /> Import
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
          title="Export Topology"
        >
          <Download size={14} /> Export
        </button>
        <button
          onClick={() => { if (confirm('Clear all devices and connections?')) clearTopology(); }}
          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
          title="Clear Topology"
        >
          <Trash2 size={14} /> Clear
        </button>
      </div>
    </div>
  );
}
