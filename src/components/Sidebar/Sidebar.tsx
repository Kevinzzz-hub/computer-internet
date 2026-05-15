import { useUIStore } from '../../store/useUIStore';
import DevicePalette from './DevicePalette';
import PresetTopologies from './PresetTopologies';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Sidebar() {
  const sidebarOpen = useUIStore(s => s.sidebarOpen);
  const toggleSidebar = useUIStore(s => s.toggleSidebar);

  return (
    <div className={`bg-slate-850 border-r border-slate-700 flex flex-col transition-all duration-200 ${sidebarOpen ? 'w-[260px]' : 'w-[40px]'}`}>
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        {sidebarOpen && <span className="text-sm font-medium text-slate-300">Devices</span>}
        <button onClick={toggleSidebar} className="p-1 hover:bg-slate-700 rounded text-slate-400">
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {sidebarOpen && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <DevicePalette />
          <PresetTopologies />
        </div>
      )}
    </div>
  );
}
