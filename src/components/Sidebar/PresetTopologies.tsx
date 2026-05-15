import { useTopologyStore } from '../../store/useTopologyStore';
import { presetTopologies } from '../../presets';

export default function PresetTopologies() {
  const importTopology = useTopologyStore(s => s.importTopology);

  const handleLoad = (key: string) => {
    const preset = presetTopologies[key];
    if (preset) {
      // Deep clone to avoid mutating the preset object
      importTopology(JSON.parse(JSON.stringify(preset)));
    }
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Examples</h3>
      <div className="space-y-1">
        {Object.entries(presetTopologies).map(([key, preset]) => {
          const deviceCount = preset.devices.length;
          const connCount = preset.connections.length;
          return (
            <button
              key={key}
              onClick={() => handleLoad(key)}
              className="w-full text-left px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-500 transition-colors text-sm"
            >
              <div className="text-slate-300">{getPresetName(key)}</div>
              <div className="text-xs text-slate-500 mt-0.5">{deviceCount} devices, {connCount} links</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getPresetName(key: string): string {
  switch (key) {
    case 'simple-lan': return 'Simple LAN';
    case 'two-routers': return 'Two Routers';
    case 'campus': return 'Campus Network';
    default: return key;
  }
}
