import TopBar from './TopBar';
import Sidebar from './Sidebar/Sidebar';
import TopologyCanvas from './Canvas/TopologyCanvas';
import DeviceContextMenu from './Canvas/DeviceContextMenu';
import PropertiesPanel from './Panels/PropertiesPanel';
import TerminalPanel from './Terminal/TerminalPanel';

export default function Layout() {
  return (
    <div className="h-full flex flex-col bg-slate-900">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <TopologyCanvas />
            <PropertiesPanel />
            <DeviceContextMenu />
          </div>
          <TerminalPanel />
        </div>
      </div>
    </div>
  );
}
