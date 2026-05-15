import { useTopologyStore } from '../../store/useTopologyStore';
import { useUIStore } from '../../store/useUIStore';
import { useTerminalStore } from '../../store/useTerminalStore';

export default function DeviceContextMenu() {
  const contextMenu = useUIStore(s => s.contextMenu);
  const closeContextMenu = useUIStore(s => s.closeContextMenu);
  const selectDevice = useUIStore(s => s.selectDevice);
  const removeDevice = useTopologyStore(s => s.removeDevice);
  const openTerminal = useTerminalStore(s => s.openTerminal);

  if (!contextMenu) return null;

  const handleConfigure = () => {
    selectDevice(contextMenu.deviceId);
    closeContextMenu();
  };

  const handleTerminal = () => {
    openTerminal(contextMenu.deviceId);
    closeContextMenu();
  };

  const handleDelete = () => {
    removeDevice(contextMenu.deviceId);
    closeContextMenu();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
      <div
        className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[160px]"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <button onClick={handleConfigure} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
          Configure
        </button>
        <button onClick={handleTerminal} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
          Open Terminal
        </button>
        <hr className="border-slate-700 my-1" />
        <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-700">
          Delete Device
        </button>
      </div>
    </>
  );
}
