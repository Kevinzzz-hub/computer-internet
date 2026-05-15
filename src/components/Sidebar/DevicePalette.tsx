import { Router, Network, Monitor } from 'lucide-react';
import type { DeviceType } from '../../types';
import type { DragEvent } from 'react';

const devices: { type: DeviceType; label: string; icon: typeof Router; color: string }[] = [
  { type: 'router', label: 'Router', icon: Router, color: 'text-cyan-400' },
  { type: 'switch', label: 'Switch', icon: Network, color: 'text-purple-400' },
  { type: 'pc', label: 'PC', icon: Monitor, color: 'text-emerald-400' },
];

export default function DevicePalette() {
  const handleDragStart = (e: DragEvent, type: DeviceType) => {
    e.dataTransfer.setData('application/netlab-device', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Drag to Canvas</h3>
      <div className="space-y-2">
        {devices.map(d => (
          <div
            key={d.type}
            draggable
            onDragStart={(e) => handleDragStart(e, d.type)}
            className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg cursor-grab active:cursor-grabbing hover:border-slate-500 transition-colors"
          >
            <d.icon className={`w-5 h-5 ${d.color}`} />
            <span className="text-sm text-slate-300">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
