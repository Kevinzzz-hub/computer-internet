import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Monitor } from 'lucide-react';

interface PCNodeData {
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

function PCNode({ data, selected }: NodeProps) {
  const d = data as unknown as PCNodeData;
  const ethInt = d.interfaces?.[0];
  const color = ethInt?.status === 'up' ? (ethInt?.ipAddress ? '#4ade80' : '#facc15') : '#ef4444';

  return (
    <div className={`
      bg-slate-800 border-2 rounded-lg px-4 py-3 min-w-[160px]
      ${selected ? 'border-blue-400' : 'border-emerald-600'}
      ${d.status === 'offline' ? 'opacity-50' : ''}
    `}>
      <Handle
        type="target"
        position={Position.Left}
        id={ethInt?.id}
        style={{ ...HANDLE_STYLE, top: 28, background: color }}
        title={ethInt?.ipAddress ? `eth0: ${ethInt.ipAddress}` : 'eth0: no IP'}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={ethInt?.id}
        style={{ ...HANDLE_STYLE, top: 28, background: color }}
        title={ethInt?.ipAddress ? `eth0: ${ethInt.ipAddress}` : 'eth0: no IP'}
      />
      <div className="flex items-center gap-2 mb-1">
        <Monitor className="w-5 h-5 text-emerald-400" />
        <span className="font-medium text-sm text-slate-200">{d.name}</span>
        <span className={`w-2 h-2 rounded-full ml-auto ${d.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
      {ethInt && (
        <div className="text-xs text-slate-400 font-mono">
          {ethInt.ipAddress || '⚠ no IP'}
        </div>
      )}
    </div>
  );
}

export default memo(PCNode);
