import { create } from 'zustand';
import type { DeviceData, Connection, TopologyExport, TopologySnapshot } from '../types';
import { createDevice, getInterface } from '../models/Device';
import type { DeviceType, NetworkInterface } from '../types';
import { sameSubnet, getInterfaceIP, getInterfaceMask, networkAddress } from '../utils/ip';
import { generateMAC } from '../utils/mac';

interface TopologyState {
  devices: Record<string, DeviceData>;
  connections: Connection[];

  // Actions
  addDevice: (type: DeviceType, position: { x: number; y: number }) => string;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, updates: Partial<DeviceData>) => void;
  updateInterface: (deviceId: string, intId: string, updates: Partial<NetworkInterface>) => void;
  addInterface: (deviceId: string) => void;
  removeInterface: (deviceId: string, intId: string) => void;

  addConnection: (srcDevId: string, srcIntId: string, tgtDevId: string, tgtIntId: string) => { id: string } | { error: string };
  removeConnection: (id: string) => void;

  getDevice: (id: string) => DeviceData | undefined;
  findDeviceByIP: (ip: string) => DeviceData | undefined;
  getConnectedDevice: (deviceId: string, intName: string) => { deviceId: string; interfaceName: string } | undefined;
  getConnectedDevicesOnSubnet: (deviceId: string, intName: string) => DeviceData[];

  buildSnapshot: () => TopologySnapshot;

  exportTopology: () => TopologyExport;
  importTopology: (data: TopologyExport) => void;
  clearTopology: () => void;
}

export const useTopologyStore = create<TopologyState>((set, get) => ({
  devices: {},
  connections: [],

  addDevice: (type, position) => {
    const device = createDevice(type, `${type.toUpperCase()}-${Object.keys(get().devices).length + 1}`, position);
    set(s => ({ devices: { ...s.devices, [device.id]: device } }));
    return device.id;
  },

  removeDevice: (id) => {
    set(s => {
      const { [id]: _, ...rest } = s.devices;
      return {
        devices: rest,
        connections: s.connections.filter(c => c.sourceDeviceId !== id && c.targetDeviceId !== id),
      };
    });
  },

  updateDevice: (id, updates) => {
    set(s => {
      const device = s.devices[id];
      if (!device) return s;
      return { devices: { ...s.devices, [id]: { ...device, ...updates } } };
    });
  },

  updateInterface: (deviceId, intId, updates) => {
    set(s => {
      const device = s.devices[deviceId];
      if (!device) return s;
      return {
        devices: {
          ...s.devices,
          [deviceId]: {
            ...device,
            interfaces: device.interfaces.map(i =>
              i.id === intId ? { ...i, ...updates } : i
            ),
          },
        },
      };
    });
  },

  addInterface: (deviceId) => {
    set(s => {
      const device = s.devices[deviceId];
      if (!device || device.type === 'pc') return s;
      const existing = device.interfaces;
      let newName: string;
      if (device.type === 'router') {
        newName = `g0/${existing.length}`;
      } else {
        newName = `fa0/${existing.length + 1}`;
      }
      const newInt: NetworkInterface = {
        id: `int-${Date.now()}`,
        name: newName,
        macAddress: '',
        ipAddress: '',
        subnetMask: '',
        status: 'up',
      };
      newInt.macAddress = generateMAC(deviceId, newName);

      return {
        devices: {
          ...s.devices,
          [deviceId]: { ...device, interfaces: [...existing, newInt] },
        },
      };
    });
  },

  removeInterface: (deviceId, intId) => {
    set(s => {
      const device = s.devices[deviceId];
      if (!device || device.interfaces.length <= 1) return s;
      const conns = s.connections.filter(c =>
        !(c.sourceDeviceId === deviceId && c.sourceInterfaceId === intId) &&
        !(c.targetDeviceId === deviceId && c.targetInterfaceId === intId)
      );
      return {
        devices: {
          ...s.devices,
          [deviceId]: {
            ...device,
            interfaces: device.interfaces.filter(i => i.id !== intId),
          },
        },
        connections: conns,
      };
    });
  },

  addConnection: (srcDevId, srcIntId, tgtDevId, tgtIntId) => {
    const state = get();
    const srcDev = state.devices[srcDevId];
    const tgtDev = state.devices[tgtDevId];
    if (!srcDev || !tgtDev) return { error: 'Device not found' };

    const srcInt = getInterface(srcDev, srcIntId);
    const tgtInt = getInterface(tgtDev, tgtIntId);
    if (!srcInt || !tgtInt) return { error: 'Interface not found' };

    // IP/subnet validation (skip for switch — L2 device, no IP needed)
    const srcIsSwitch = srcDev.type === 'switch';
    const tgtIsSwitch = tgtDev.type === 'switch';

    if (!srcIsSwitch && !srcInt.ipAddress) {
      return { error: `${srcDev.name}/${srcInt.name}: no IP configured. Set IP in the properties panel first.` };
    }
    if (!tgtIsSwitch && !tgtInt.ipAddress) {
      return { error: `${tgtDev.name}/${tgtInt.name}: no IP configured. Set IP in the properties panel first.` };
    }

    // Subnet check only when both sides are L3 devices (router/pc)
    if (!srcIsSwitch && !tgtIsSwitch) {
      const srcIP = getInterfaceIP(srcInt.ipAddress);
      const srcMask = getInterfaceMask(srcInt.ipAddress);
      const tgtIP = getInterfaceIP(tgtInt.ipAddress);

      if (!sameSubnet(srcIP, srcMask, tgtIP)) {
        return { error: `Subnet mismatch: ${srcIP}/${srcMask} cannot connect to ${tgtIP}. Both must be on the same subnet.` };
      }
    }

    // Check no existing connection on either interface
    const exists = state.connections.some(c =>
      (c.sourceDeviceId === srcDevId && c.sourceInterfaceId === srcIntId) ||
      (c.targetDeviceId === srcDevId && c.targetInterfaceId === srcIntId) ||
      (c.sourceDeviceId === tgtDevId && c.sourceInterfaceId === tgtIntId) ||
      (c.targetDeviceId === tgtDevId && c.targetInterfaceId === tgtIntId)
    );
    if (exists) return { error: 'One of the interfaces is already connected.' };

    const id = `conn-${Date.now()}`;
    const conn: Connection = {
      id,
      sourceDeviceId: srcDevId,
      sourceInterfaceId: srcIntId,
      targetDeviceId: tgtDevId,
      targetInterfaceId: tgtIntId,
    };

    set(s => ({ connections: [...s.connections, conn] }));

    // Auto-configure routing for routers (only if interface has an IP)
    if (srcDev.type === 'router' && srcInt.ipAddress) {
      const router = get().devices[srcDevId];
      if (router?.routingTable) {
        const existingRoute = router.routingTable.find(r =>
          r.interfaceName === srcInt.name && r.source === 'connected'
        );
        if (!existingRoute) {
          const ip = getInterfaceIP(srcInt.ipAddress);
          const mask = getInterfaceMask(srcInt.ipAddress);
          get().updateDevice(srcDevId, {
            routingTable: [
              ...router.routingTable,
              { network: networkAddress(ip, mask), mask, nextHop: '0.0.0.0', interfaceName: srcInt.name, metric: 0, source: 'connected' },
            ],
          });
        }
      }
    }
    if (tgtDev.type === 'router' && tgtInt.ipAddress) {
      const router = get().devices[tgtDevId];
      if (router?.routingTable) {
        const existingRoute = router.routingTable.find(r =>
          r.interfaceName === tgtInt.name && r.source === 'connected'
        );
        if (!existingRoute) {
          const ip = getInterfaceIP(tgtInt.ipAddress);
          const mask = getInterfaceMask(tgtInt.ipAddress);
          get().updateDevice(tgtDevId, {
            routingTable: [
              ...router.routingTable,
              { network: networkAddress(ip, mask), mask, nextHop: '0.0.0.0', interfaceName: tgtInt.name, metric: 0, source: 'connected' },
            ],
          });
        }
      }
    }

    return { id };
  },

  removeConnection: (id) => {
    set(s => ({ connections: s.connections.filter(c => c.id !== id) }));
  },

  getDevice: (id) => get().devices[id],

  findDeviceByIP: (ip) => {
    for (const dev of Object.values(get().devices)) {
      for (const intf of dev.interfaces) {
        if (intf.ipAddress) {
          const intIP = getInterfaceIP(intf.ipAddress);
          if (intIP === ip) return dev;
        }
      }
    }
    return undefined;
  },

  getConnectedDevice: (deviceId, intName) => {
    const conns = get().connections;
    for (const c of conns) {
      if (c.sourceDeviceId === deviceId) {
        const srcDev = get().devices[c.sourceDeviceId];
        const srcInt = getInterface(srcDev, c.sourceInterfaceId);
        if (srcInt?.name === intName) {
          const tgtDev = get().devices[c.targetDeviceId];
          const tgtInt = getInterface(tgtDev, c.targetInterfaceId);
          return { deviceId: c.targetDeviceId, interfaceName: tgtInt?.name || '' };
        }
      }
      if (c.targetDeviceId === deviceId) {
        const tgtDev = get().devices[c.targetDeviceId];
        const tgtInt = getInterface(tgtDev, c.targetInterfaceId);
        if (tgtInt?.name === intName) {
          const srcDev = get().devices[c.sourceDeviceId];
          const srcInt = getInterface(srcDev, c.sourceInterfaceId);
          return { deviceId: c.sourceDeviceId, interfaceName: srcInt?.name || '' };
        }
      }
    }
    return undefined;
  },

  getConnectedDevicesOnSubnet: (deviceId, intName) => {
    const device = get().devices[deviceId];
    if (!device) return [];
    const intf = device.interfaces.find(i => i.name === intName);
    if (!intf || !intf.ipAddress) return [];

    const ip = getInterfaceIP(intf.ipAddress);
    const mask = getInterfaceMask(intf.ipAddress);
    const conns = get().connections;
    const result: DeviceData[] = [];

    for (const c of conns) {
      let neighborId: string | undefined;
      let neighborIntId: string | undefined;

      if (c.sourceDeviceId === deviceId && getInterface(device, c.sourceInterfaceId)?.name === intName) {
        neighborId = c.targetDeviceId;
        neighborIntId = c.targetInterfaceId;
      } else if (c.targetDeviceId === deviceId && getInterface(device, c.targetInterfaceId)?.name === intName) {
        neighborId = c.sourceDeviceId;
        neighborIntId = c.sourceInterfaceId;
      }

      if (neighborId && neighborIntId) {
        const nDev = get().devices[neighborId];
        if (nDev) {
          // If neighbor is a switch, add all devices connected to that switch
          if (nDev.type === 'switch') {
            for (const sc of conns) {
              if (sc.id === c.id) continue;
              let swPeerId: string | undefined;
              if (sc.sourceDeviceId === neighborId) swPeerId = sc.targetDeviceId;
              else if (sc.targetDeviceId === neighborId) swPeerId = sc.sourceDeviceId;
              if (swPeerId && swPeerId !== deviceId) {
                const peer = get().devices[swPeerId];
                if (peer && !result.find(d => d.id === peer.id)) {
                  result.push(peer);
                }
              }
            }
          } else {
            result.push(nDev);
          }
        }
      }
    }
    return result;
  },

  buildSnapshot: () => ({
    devices: { ...get().devices },
    connections: [...get().connections],
  }),

  exportTopology: () => ({
    version: 1,
    devices: Object.values(get().devices),
    connections: [...get().connections],
  }),

  importTopology: (data) => {
    const devices: Record<string, DeviceData> = {};
    for (const d of data.devices) {
      devices[d.id] = d;
    }
    set({ devices, connections: data.connections });
  },

  clearTopology: () => set({ devices: {}, connections: [] }),
}));
