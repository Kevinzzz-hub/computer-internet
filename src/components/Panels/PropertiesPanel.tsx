import { X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useTopologyStore } from '../../store/useTopologyStore';
import DeviceConfig from './DeviceConfig';
import RoutingTableEditor from './RoutingTableEditor';

export default function PropertiesPanel() {
  const selectedDeviceId = useUIStore(s => s.selectedDeviceId);
  const selectDevice = useUIStore(s => s.selectDevice);
  const device = useTopologyStore(s => selectedDeviceId ? s.devices[selectedDeviceId] : undefined);

  if (!selectedDeviceId || !device) return null;

  return (
    <div className="absolute right-4 top-4 bottom-4 w-[320px] bg-slate-850 border border-slate-700 rounded-lg shadow-xl z-30 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <span className="font-medium text-sm text-slate-200">Properties: {device.name}</span>
        <button onClick={() => selectDevice(null)} className="p-1 hover:bg-slate-700 rounded text-slate-400">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <DeviceConfig key={`${device.id}-${device.interfaces.length}-${device.routingTable?.length || 0}`} device={device} />
        {device.type === 'router' && <RoutingTableEditor key={`rt-${device.id}-${device.routingTable?.length || 0}`} device={device} />}
      </div>
    </div>
  );
}
