import type { TopologyExport } from '../types';

export const simpleLAN: TopologyExport = {
  version: 1,
  devices: [
    {
      id: 'pc-lan-1',
      name: 'PC1',
      type: 'pc',
      interfaces: [
        { id: 'int-pc1-eth0', name: 'eth0', macAddress: '02:00:00:00:00:01', ipAddress: '192.168.1.10/24', subnetMask: '255.255.255.0', status: 'up' },
      ],
      status: 'online',
      defaultGateway: '192.168.1.1',
      position: { x: 100, y: 150 },
    },
    {
      id: 'sw-lan-1',
      name: 'Switch1',
      type: 'switch',
      interfaces: [
        { id: 'int-sw1-fa1', name: 'fa0/1', macAddress: '02:00:00:00:00:10', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-sw1-fa2', name: 'fa0/2', macAddress: '02:00:00:00:00:11', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-sw1-fa3', name: 'fa0/3', macAddress: '02:00:00:00:00:12', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-sw1-fa4', name: 'fa0/4', macAddress: '02:00:00:00:00:13', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-sw1-fa5', name: 'fa0/5', macAddress: '02:00:00:00:00:14', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-sw1-fa6', name: 'fa0/6', macAddress: '02:00:00:00:00:15', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-sw1-fa7', name: 'fa0/7', macAddress: '02:00:00:00:00:16', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-sw1-fa8', name: 'fa0/8', macAddress: '02:00:00:00:00:17', ipAddress: '', subnetMask: '', status: 'up' },
      ],
      status: 'online',
      position: { x: 300, y: 150 },
    },
    {
      id: 'pc-lan-2',
      name: 'PC2',
      type: 'pc',
      interfaces: [
        { id: 'int-pc2-eth0', name: 'eth0', macAddress: '02:00:00:00:00:02', ipAddress: '192.168.1.20/24', subnetMask: '255.255.255.0', status: 'up' },
      ],
      status: 'online',
      defaultGateway: '192.168.1.1',
      position: { x: 520, y: 150 },
    },
  ],
  connections: [
    { id: 'conn-lan-1', sourceDeviceId: 'pc-lan-1', sourceInterfaceId: 'int-pc1-eth0', targetDeviceId: 'sw-lan-1', targetInterfaceId: 'int-sw1-fa1' },
    { id: 'conn-lan-2', sourceDeviceId: 'pc-lan-2', sourceInterfaceId: 'int-pc2-eth0', targetDeviceId: 'sw-lan-1', targetInterfaceId: 'int-sw1-fa2' },
  ],
};
