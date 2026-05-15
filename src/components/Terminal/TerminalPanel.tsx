import { useTerminalStore } from '../../store/useTerminalStore';
import { useTopologyStore } from '../../store/useTopologyStore';
import TerminalView from './TerminalView';
import { X } from 'lucide-react';

export default function TerminalPanel() {
  const openTerminals = useTerminalStore(s => s.openTerminals);
  const activeTerminalId = useTerminalStore(s => s.activeTerminalId);
  const setActiveTerminal = useTerminalStore(s => s.setActiveTerminal);
  const closeTerminal = useTerminalStore(s => s.closeTerminal);
  const devices = useTopologyStore(s => s.devices);

  return (
    <div className="border-t border-slate-700 bg-slate-900 flex flex-col" style={{ height: '280px' }}>
      {/* Tab bar */}
      <div className="flex items-center bg-slate-850 border-b border-slate-700 px-1 overflow-x-auto">
        {openTerminals.map(deviceId => {
          const device = devices[deviceId];
          const isActive = deviceId === activeTerminalId;
          return (
            <button
              key={deviceId}
              onClick={() => setActiveTerminal(deviceId)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs border-r border-slate-700 whitespace-nowrap
                ${isActive ? 'bg-slate-900 text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${device?.type === 'router' ? 'bg-cyan-400' : device?.type === 'switch' ? 'bg-purple-400' : 'bg-emerald-400'}`} />
              {device?.name || deviceId}
              <X
                size={12}
                className="ml-1 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(deviceId);
                }}
              />
            </button>
          );
        })}
        {openTerminals.length === 0 && (
          <div className="px-3 py-1.5 text-xs text-slate-600">
            No terminals open. Right-click a device → "Open Terminal" or select a device and click below.
          </div>
        )}
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden">
        {activeTerminalId && openTerminals.includes(activeTerminalId) ? (
          <TerminalView key={activeTerminalId} deviceId={activeTerminalId} />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-600">
            {openTerminals.length > 0 ? 'Select a terminal tab' : 'Open a terminal to get started'}
          </div>
        )}
      </div>
    </div>
  );
}
