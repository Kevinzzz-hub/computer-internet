import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Router } from 'lucide-react';

interface RouterNodeData {
  name: string;
  status: string;
  interfaces: { id: string; name: string; ipAddress: string; status: string }[];
}

const HANDLE_STYLE: React.CSSProperties = {
  width: 14,
  height: 14,
  border: '2px solid #0f172a',
  cursor: 'crosshair',
};

function RouterNode({ data, selected }: NodeProps) {
  const d = data as unknown as RouterNodeData;
  const interfaces = d.interfaces || [];

  return (
    <div className={`
      bg-slate-800 border-2 rounded-lg px-4 py-3 min-w-[180px]
      ${selected ? 'border-blue-400' : 'border-slate-600'}
      ${d.status === 'offline' ? 'opacity-50' : ''}
    `}>
      <div className="flex items-center gap-2 mb-2">
        <Router className="w-5 h-5 text-cyan-400" />
        <span className="font-medium text-sm text-slate-200">{d.name}</span>
        <span className={`w-2 h-2 rounded-full ml-auto ${d.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
      <div className="space-y-1.5">
        {interfaces.map((intf, index: number) => {
          const top = 38 + index * 24;
          const color = intf.status === 'up' ? (intf.ipAddress ? '#4ade80' : '#facc15') : '#ef4444';
          return (
            <div key={intf.id} className="flex items-center justify-between text-xs">
              <Handle
                type="target"
                position={Position.Left}
                id={intf.id}
                style={{ ...HANDLE_STYLE, top, background: color }}
                title={intf.ipAddress ? `${intf.name}: ${intf.ipAddress}` : `${intf.name}: no IP`}
              />
              <span className="text-slate-400 font-mono">{intf.name}</span>
              <span className={intf.ipAddress ? 'text-slate-300 font-mono' : 'text-yellow-500 text-[10px]'}>
                {intf.ipAddress || '⚡ need IP'}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={intf.id}
                style={{ ...HANDLE_STYLE, top, background: color }}
                title={intf.ipAddress ? `${intf.name}: ${intf.ipAddress}` : `${intf.name}: no IP`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(RouterNode);
