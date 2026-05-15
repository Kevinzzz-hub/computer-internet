import { useState } from 'react';
import { useTopologyStore } from '../../store/useTopologyStore';
import type { DeviceData, Route } from '../../types';
import { isValidIP } from '../../utils/ip';
import { Plus, Trash2 } from 'lucide-react';

export default function RoutingTableEditor({ device }: { device: DeviceData }) {
  const updateDevice = useTopologyStore(s => s.updateDevice);
  const [showAdd, setShowAdd] = useState(false);
  const [newNetwork, setNewNetwork] = useState('');
  const [newMask, setNewMask] = useState('');
  const [newNextHop, setNewNextHop] = useState('');

  const routes = device.routingTable || [];
  const staticRoutes = routes.filter(r => r.source === 'static');
  const ripRoutes = routes.filter(r => r.source === 'rip');

  const handleAddRoute = () => {
    if (!isValidIP(newNetwork) || !isValidIP(newMask) || !isValidIP(newNextHop)) return;
    const newRoute: Route = {
      network: newNetwork,
      mask: newMask,
      nextHop: newNextHop,
      interfaceName: 'g0/0',
      metric: 1,
      source: 'static',
    };
    updateDevice(device.id, {
      routingTable: [...routes, newRoute],
    });
    setNewNetwork('');
    setNewMask('');
    setNewNextHop('');
    setShowAdd(false);
  };

  const handleDeleteRoute = (network: string, mask: string) => {
    updateDevice(device.id, {
      routingTable: routes.filter(r => !(r.network === network && r.mask === mask && r.source === 'static')),
    });
  };

  const handleToggleRIP = () => {
    updateDevice(device.id, { ripEnabled: !device.ripEnabled });
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Routing Table</h3>

      {/* Connected routes */}
      <div className="text-xs text-slate-500 mb-2">Connected Routes</div>
      {device.interfaces.filter(i => i.ipAddress && i.status === 'up').map(intf => {
        const parts = intf.ipAddress.split('/');
        const ip = parts[0];
        const prefix = parts[1] || '32';
        const mask = cidrToMask(parseInt(prefix));
        return (
          <div key={intf.id} className="flex items-center justify-between text-xs py-1 text-slate-400">
            <span>{ip}/{prefix}</span>
            <span className="text-slate-600">connected</span>
          </div>
        );
      })}

      {/* Static routes */}
      <div className="text-xs text-slate-500 mb-2 mt-3">Static Routes</div>
      {staticRoutes.length === 0 && <div className="text-xs text-slate-600">No static routes</div>}
      {staticRoutes.map((r, i) => (
        <div key={i} className="flex items-center justify-between text-xs py-1 text-slate-300">
          <span>{r.network}/{maskToPrefix(r.mask)} via {r.nextHop}</span>
          <button onClick={() => handleDeleteRoute(r.network, r.mask)} className="text-slate-500 hover:text-red-400">
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      {/* RIP routes */}
      {ripRoutes.length > 0 && (
        <>
          <div className="text-xs text-slate-500 mb-2 mt-3">RIP Routes</div>
          {ripRoutes.map((r, i) => (
            <div key={i} className="text-xs py-1 text-slate-400">
              <span>{r.network}/{maskToPrefix(r.mask)} via {r.nextHop} metric={r.metric}</span>
            </div>
          ))}
        </>
      )}

      {/* RIP toggle */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700">
        <span className="text-xs text-slate-400">RIP</span>
        <button
          onClick={handleToggleRIP}
          className={`text-xs px-2 py-0.5 rounded ${device.ripEnabled ? 'bg-cyan-900 text-cyan-400' : 'bg-slate-700 text-slate-500'}`}
        >
          {device.ripEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {/* Add static route form */}
      {showAdd ? (
        <div className="mt-3 p-2 bg-slate-800 rounded border border-slate-700 space-y-2">
          <input value={newNetwork} onChange={e => setNewNetwork(e.target.value)} placeholder="Network (e.g. 192.168.2.0)" className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-slate-300" />
          <input value={newMask} onChange={e => setNewMask(e.target.value)} placeholder="Mask (e.g. 255.255.255.0)" className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-slate-300" />
          <input value={newNextHop} onChange={e => setNewNextHop(e.target.value)} placeholder="Next-hop IP" className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-slate-300" />
          <div className="flex gap-2">
            <button onClick={handleAddRoute} className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Add</button>
            <button onClick={() => setShowAdd(false)} className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded hover:bg-slate-600">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-1 mt-2 px-2 py-1.5 border border-dashed border-slate-600 rounded text-xs text-slate-500 hover:text-slate-300 hover:border-slate-500"
        >
          <Plus size={12} /> Add Static Route
        </button>
      )}
    </div>
  );
}

function cidrToMask(prefix: number): string {
  const full = '1'.repeat(prefix) + '0'.repeat(32 - prefix);
  return [0, 8, 16, 24].map(i => parseInt(full.slice(i, i + 8), 2)).join('.');
}

function maskToPrefix(mask: string): number {
  return mask.split('.').reduce((count, octet) => {
    const n = parseInt(octet);
    for (let i = 7; i >= 0; i--) {
      if ((n >> i) & 1) count++;
      else return count;
    }
    return count;
  }, 0);
}
