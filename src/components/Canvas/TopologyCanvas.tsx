import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection as RFConnection,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import RouterNode from './nodes/RouterNode';
import SwitchNode from './nodes/SwitchNode';
import PCNode from './nodes/PCNode';
import { useTopologyStore } from '../../store/useTopologyStore';
import { useUIStore } from '../../store/useUIStore';
import { useSimulationStore } from '../../store/useSimulationStore';
import type { DeviceType, DeviceData } from '../../types';

const nodeTypes = {
  router: RouterNode,
  switch: SwitchNode,
  pc: PCNode,
};

function topologyToFlow(
  devices: Record<string, DeviceData>,
  connections: { id: string; sourceDeviceId: string; sourceInterfaceId: string; targetDeviceId: string; targetInterfaceId: string }[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = Object.values(devices).map(d => ({
    id: d.id,
    type: d.type,
    position: d.position,
    data: {
      name: d.name,
      type: d.type,
      status: d.status,
      interfaces: d.interfaces,
    },
    draggable: true,
  }));

  const edges: Edge[] = connections.map(c => ({
    id: c.id,
    source: c.sourceDeviceId,
    target: c.targetDeviceId,
    sourceHandle: c.sourceInterfaceId,
    targetHandle: c.targetInterfaceId,
    animated: false,
    style: { stroke: '#4ade80', strokeWidth: 2 },
  }));

  return { nodes, edges };
}

// Toast notification helper
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/95 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm shadow-lg max-w-lg text-center">
      {message}
    </div>
  );
}

function CanvasInner() {
  const devices = useTopologyStore(s => s.devices);
  const connections = useTopologyStore(s => s.connections);
  const addConnection = useTopologyStore(s => s.addConnection);
  const updateDevice = useTopologyStore(s => s.updateDevice);
  const addDevice = useTopologyStore(s => s.addDevice);
  const selectDevice = useUIStore(s => s.selectDevice);
  const openContextMenu = useUIStore(s => s.openContextMenu);
  const currentAnimation = useSimulationStore(s => s.currentAnimation);
  const clearAnimation = useSimulationStore(s => s.clearAnimation);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => topologyToFlow(devices, connections),
    [devices, connections],
  );

  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Toast state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Always sync store → React Flow (data + structure), preserving positions
  const dataHashRef = useRef('');

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = topologyToFlow(devices, connections);
    // Hash of data (not positions) to detect real changes
    const dataHash = JSON.stringify(newNodes.map(n => ({ id: n.id, type: n.type, data: n.data }))) +
                     JSON.stringify(newEdges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })));

    if (dataHash !== dataHashRef.current) {
      dataHashRef.current = dataHash;
      // Preserve positions from current React Flow state
      const merged = newNodes.map(nn => {
        const existing = nodes.find(n => n.id === nn.id);
        return existing ? { ...nn, position: existing.position } : nn;
      });
      setNodes(merged);
      setEdges(newEdges);
    }
  }, [devices, connections]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-clear animation after 2 seconds
  useEffect(() => {
    if (!currentAnimation) return;
    const t = setTimeout(() => clearAnimation(), 2000);
    return () => clearTimeout(t);
  }, [currentAnimation, clearAnimation]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChangeBase(changes);
    for (const change of changes) {
      if (change.type === 'position' && change.position && change.id) {
        updateDevice(change.id, { position: change.position });
      }
    }
  }, [onNodesChangeBase, updateDevice]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    selectDevice(node.id);
  }, [selectDevice]);

  const handlePaneClick = useCallback(() => {
    selectDevice(null);
  }, [selectDevice]);

  const handleConnect = useCallback((params: RFConnection) => {
    if (!params.source || !params.target) {
      setToastMsg('Connection failed: source or target is missing');
      return;
    }
    if (!params.sourceHandle || !params.targetHandle) {
      setToastMsg('Cannot connect: no interface selected. Drag from the colored circle (●) on one device to the circle on another.');
      return;
    }
    const result = addConnection(params.source, params.sourceHandle, params.target, params.targetHandle);
    if (result && 'error' in result) {
      setToastMsg(result.error);
      return;
    }
    // Add edge to React Flow state immediately so the line persists
    if (result && 'id' in result) {
      setEdges(prev => [...prev, {
        id: result.id,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle!,
        targetHandle: params.targetHandle!,
        animated: false,
        style: { stroke: '#4ade80', strokeWidth: 2 },
      }]);
    }
  }, [addConnection, setEdges]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/netlab-device') as DeviceType;
    if (!type) return;

    const reactFlowEl = document.querySelector('.react-flow');
    if (!reactFlowEl) return;
    const rect = reactFlowEl.getBoundingClientRect();

    const position = {
      x: event.clientX - rect.left - 90,
      y: event.clientY - rect.top - 30,
    };
    addDevice(type, position);
  }, [addDevice]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    openContextMenu(event.clientX, event.clientY, node.id);
  }, [openContextMenu]);

  const animatedEdges = useMemo(() => {
    if (!currentAnimation) return edges;
    return edges.map(e => ({
      ...e,
      animated: currentAnimation.connectionIds.includes(e.id),
      style: {
        ...e.style,
        stroke: currentAnimation.connectionIds.includes(e.id) ? '#facc15' : '#4ade80',
      },
    }));
  }, [edges, currentAnimation]);

  return (
    <div className="w-full h-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}

      <ReactFlow
        nodes={nodes}
        edges={animatedEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeContextMenu={handleNodeContextMenu}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-slate-900"
        connectionLineStyle={{ stroke: '#facc15', strokeWidth: 2 }}
      >
        <Background color="#1e293b" gap={20} />
        <Controls className="[&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!fill-slate-400" />
        <MiniMap
          nodeColor={(n) => {
            switch (n.type) {
              case 'router': return '#06b6d4';
              case 'switch': return '#a855f7';
              case 'pc': return '#10b981';
              default: return '#64748b';
            }
          }}
          maskColor="rgba(0,0,0,0.7)"
          className="!bg-slate-800 !border-slate-700"
        />
      </ReactFlow>
    </div>
  );
}

export default function TopologyCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
