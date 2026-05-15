import type { TopologyExport } from '../types';

export const twoRouters: TopologyExport = {
  version: 1,
  devices: [
    {
      id: 'pc2r-1',
      name: 'PC-A',
      type: 'pc',
      interfaces: [
        { id: 'int-pca-eth0', name: 'eth0', macAddress: '02:00:00:00:01:01', ipAddress: '192.168.1.10/24', subnetMask: '255.255.255.0', status: 'up' },
      ],
      status: 'online',
      defaultGateway: '192.168.1.1',
      position: { x: 80, y: 100 },
    },
    {
      id: 'r2r-1',
      name: 'Router1',
      type: 'router',
      interfaces: [
        { id: 'int-r1-g00', name: 'g0/0', macAddress: '02:00:00:00:01:10', ipAddress: '192.168.1.1/24', subnetMask: '255.255.255.0', status: 'up' },
        { id: 'int-r1-g01', name: 'g0/1', macAddress: '02:00:00:00:01:11', ipAddress: '10.0.0.1/24', subnetMask: '255.255.255.0', status: 'up' },
        { id: 'int-r1-g02', name: 'g0/2', macAddress: '02:00:00:00:01:12', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-r1-g03', name: 'g0/3', macAddress: '02:00:00:00:01:13', ipAddress: '', subnetMask: '', status: 'up' },
      ],
      routingTable: [
        { network: '192.168.1.0', mask: '255.255.255.0', nextHop: '0.0.0.0', interfaceName: 'g0/0', metric: 0, source: 'connected' },
        { network: '10.0.0.0', mask: '255.255.255.0', nextHop: '0.0.0.0', interfaceName: 'g0/1', metric: 0, source: 'connected' },
        { network: '192.168.2.0', mask: '255.255.255.0', nextHop: '10.0.0.2', interfaceName: 'g0/1', metric: 1, source: 'static' },
      ],
      ripEnabled: false,
      ripNetworks: [],
      status: 'online',
      position: { x: 300, y: 100 },
    },
    {
      id: 'r2r-2',
      name: 'Router2',
      type: 'router',
      interfaces: [
        { id: 'int-r2-g00', name: 'g0/0', macAddress: '02:00:00:00:02:10', ipAddress: '10.0.0.2/24', subnetMask: '255.255.255.0', status: 'up' },
        { id: 'int-r2-g01', name: 'g0/1', macAddress: '02:00:00:00:02:11', ipAddress: '192.168.2.1/24', subnetMask: '255.255.255.0', status: 'up' },
        { id: 'int-r2-g02', name: 'g0/2', macAddress: '02:00:00:00:02:12', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-r2-g03', name: 'g0/3', macAddress: '02:00:00:00:02:13', ipAddress: '', subnetMask: '', status: 'up' },
      ],
      routingTable: [
        { network: '10.0.0.0', mask: '255.255.255.0', nextHop: '0.0.0.0', interfaceName: 'g0/0', metric: 0, source: 'connected' },
        { network: '192.168.2.0', mask: '255.255.255.0', nextHop: '0.0.0.0', interfaceName: 'g0/1', metric: 0, source: 'connected' },
        { network: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.0.1', interfaceName: 'g0/0', metric: 1, source: 'static' },
      ],
      ripEnabled: false,
      ripNetworks: [],
      status: 'online',
      position: { x: 520, y: 100 },
    },
    {
      id: 'pc2r-2',
      name: 'PC-B',
      type: 'pc',
      interfaces: [
        { id: 'int-pcb-eth0', name: 'eth0', macAddress: '02:00:00:00:02:01', ipAddress: '192.168.2.10/24', subnetMask: '255.255.255.0', status: 'up' },
      ],
      status: 'online',
      defaultGateway: '192.168.2.1',
      position: { x: 740, y: 100 },
    },
  ],
  connections: [
    { id: 'conn-2r-1', sourceDeviceId: 'pc2r-1', sourceInterfaceId: 'int-pca-eth0', targetDeviceId: 'r2r-1', targetInterfaceId: 'int-r1-g00' },
    { id: 'conn-2r-2', sourceDeviceId: 'r2r-1', sourceInterfaceId: 'int-r1-g01', targetDeviceId: 'r2r-2', targetInterfaceId: 'int-r2-g00' },
    { id: 'conn-2r-3', sourceDeviceId: 'r2r-2', sourceInterfaceId: 'int-r2-g01', targetDeviceId: 'pc2r-2', targetInterfaceId: 'int-pcb-eth0' },
  ],
};
