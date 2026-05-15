import { useState, useEffect } from 'react';
import { useTopologyStore } from '../../store/useTopologyStore';
import type { DeviceData } from '../../types';
import { Plus, Trash2, Save } from 'lucide-react';
import { isValidCIDR } from '../../utils/ip';

export default function DeviceConfig({ device }: { device: DeviceData }) {
  const updateDevice = useTopologyStore(s => s.updateDevice);
  const updateInterface = useTopologyStore(s => s.updateInterface);
  const addInterface = useTopologyStore(s => s.addInterface);
  const removeInterface = useTopologyStore(s => s.removeInterface);

  // Local state for editing
  const [hostname, setHostname] = useState(device.name);
  const [ipInputs, setIpInputs] = useState<Record<string, string>>({});
  const [ipErrors, setIpErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  // Initialize local state from device props
  useEffect(() => {
    setHostname(device.name);
    const inputs: Record<string, string> = {};
    const errors: Record<string, string> = {};
    for (const intf of device.interfaces) {
      inputs[intf.id] = intf.ipAddress || '';
      errors[intf.id] = '';
    }
    setIpInputs(inputs);
    setIpErrors(errors);
    setDirty(false);
  }, [device.id]); // Reset when switching devices

  const handleSave = () => {
    // Save hostname
    if (hostname.trim() && hostname !== device.name) {
      updateDevice(device.id, { name: hostname.trim() });
    }

    // Save all interface IPs
    const newErrors: Record<string, string> = {};
    let hasError = false;

    for (const intf of device.interfaces) {
      const value = ipInputs[intf.id] || '';
      if (value === '') {
        // Allow empty (no IP)
        updateInterface(device.id, intf.id, { ipAddress: '', subnetMask: '' });
      } else if (isValidCIDR(value)) {
        const parts = value.split('/');
        const ip = parts[0];
        const prefix = parseInt(parts[1], 10);
        updateInterface(device.id, intf.id, {
          ipAddress: value,
          subnetMask: cidrToMask(prefix),
        });
      } else {
        newErrors[intf.id] = 'Invalid CIDR format';
        hasError = true;
      }
    }

    setIpErrors(newErrors);
    if (!hasError) {
      setDirty(false);
    }
  };

  const handleIPChange = (intId: string, value: string) => {
    setIpInputs(prev => ({ ...prev, [intId]: value }));
    setIpErrors(prev => ({ ...prev, [intId]: '' }));
    setDirty(true);
  };

  const handleIPBlur = (intId: string) => {
    // Validate on blur
    const value = ipInputs[intId] || '';
    if (value !== '' && !isValidCIDR(value)) {
      setIpErrors(prev => ({ ...prev, [intId]: 'Invalid CIDR (e.g., 192.168.1.1/24)' }));
    } else {
      setIpErrors(prev => ({ ...prev, [intId]: '' }));
    }
  };

  const handleStatusToggle = (intId: string, current: string) => {
    updateInterface(device.id, intId, { status: current === 'up' ? 'down' : 'up' });
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Device</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400">Hostname</label>
          <input
            value={hostname}
            onChange={e => { setHostname(e.target.value); setDirty(true); }}
            className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Type</label>
          <div className="text-sm text-slate-300 mt-1 capitalize">{device.type}</div>
        </div>
      </div>

      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-2">Interfaces</h3>
      <div className="space-y-2">
        {device.interfaces.map(intf => (
          <div key={intf.id} className={`p-2 bg-slate-800 rounded border ${ipErrors[intf.id] ? 'border-red-500' : 'border-slate-700'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-300">{intf.name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleStatusToggle(intf.id, intf.status)}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${intf.status === 'up' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}
                >
                  {intf.status}
                </button>
                {device.type !== 'pc' && device.interfaces.length > 1 && (
                  <button onClick={() => removeInterface(device.id, intf.id)} className="text-slate-500 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            <input
              value={ipInputs[intf.id] || ''}
              onChange={e => handleIPChange(intf.id, e.target.value)}
              onBlur={() => handleIPBlur(intf.id)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              placeholder="192.168.1.1/24"
              className="w-full mt-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500"
            />
            {ipErrors[intf.id] && (
              <div className="text-[10px] text-red-400 mt-0.5">{ipErrors[intf.id]}</div>
            )}
            <div className="text-[10px] text-slate-500 mt-1">{intf.macAddress}</div>
          </div>
        ))}
        {device.type !== 'pc' && (
          <button
            onClick={() => addInterface(device.id)}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 border border-dashed border-slate-600 rounded text-xs text-slate-500 hover:text-slate-300 hover:border-slate-500"
          >
            <Plus size={12} /> Add Interface
          </button>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!dirty}
        className={`w-full flex items-center justify-center gap-2 mt-4 px-3 py-2 rounded text-sm font-medium transition-colors ${
          dirty
            ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
        }`}
      >
        <Save size={14} />
        Apply Changes
      </button>
    </div>
  );
}

function cidrToMask(prefix: number): string {
  const full = '1'.repeat(prefix) + '0'.repeat(32 - prefix);
  return [0, 8, 16, 24].map(i => parseInt(full.slice(i, i + 8), 2)).join('.');
}
