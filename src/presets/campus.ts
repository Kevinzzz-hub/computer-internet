import type { TopologyExport } from '../types';

export const campus: TopologyExport = {
  version: 1,
  devices: [
    // Building A — PC1 + Switch1 → Router1
    {
      id: 'camp-pc-a1',
      name: 'PC-A1',
      type: 'pc',
      interfaces: [
        { id: 'int-cpa1-e0', name: 'eth0', macAddress: '02:ca:00:00:01:01', ipAddress: '192.168.1.10/24', subnetMask: '255.255.255.0', status: 'up' },
      ],
      status: 'online',
      defaultGateway: '192.168.1.1',
      position: { x: 50, y: 50 },
    },
    {
      id: 'camp-sw1',
      name: 'Switch-A',
      type: 'switch',
      interfaces: [
        { id: 'int-csw1-f1', name: 'fa0/1', macAddress: '02:ca:00:00:10:01', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw1-f2', name: 'fa0/2', macAddress: '02:ca:00:00:10:02', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw1-f3', name: 'fa0/3', macAddress: '02:ca:00:00:10:03', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw1-f4', name: 'fa0/4', macAddress: '02:ca:00:00:10:04', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw1-f5', name: 'fa0/5', macAddress: '02:ca:00:00:10:05', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw1-f6', name: 'fa0/6', macAddress: '02:ca:00:00:10:06', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw1-f7', name: 'fa0/7', macAddress: '02:ca:00:00:10:07', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw1-f8', name: 'fa0/8', macAddress: '02:ca:00:00:10:08', ipAddress: '', subnetMask: '', status: 'up' },
      ],
      status: 'online',
      position: { x: 220, y: 50 },
    },
    {
      id: 'camp-r1',
      name: 'Router-BuildingA',
      type: 'router',
      interfaces: [
        { id: 'int-cr1-g00', name: 'g0/0', macAddress: '02:ca:00:00:20:01', ipAddress: '192.168.1.1/24', subnetMask: '255.255.255.0', status: 'up' },
        { id: 'int-cr1-g01', name: 'g0/1', macAddress: '02:ca:00:00:20:02', ipAddress: '10.0.1.1/24', subnetMask: '255.255.255.0', status: 'up' },
        { id: 'int-cr1-g02', name: 'g0/2', macAddress: '02:ca:00:00:20:03', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-cr1-g03', name: 'g0/3', macAddress: '02:ca:00:00:20:04', ipAddress: '', subnetMask: '', status: 'up' },
      ],
      routingTable: [
        { network: '192.168.1.0', mask: '255.255.255.0', nextHop: '0.0.0.0', interfaceName: 'g0/0', metric: 0, source: 'connected' },
        { network: '10.0.1.0', mask: '255.255.255.0', nextHop: '0.0.0.0', interfaceName: 'g0/1', metric: 0, source: 'connected' },
        { network: '10.0.2.0', mask: '255.255.255.0', nextHop: '10.0.1.2', interfaceName: 'g0/1', metric: 1, source: 'static' },
        { network: '192.168.2.0', mask: '255.255.255.0', nextHop: '10.0.1.2', interfaceName: 'g0/1', metric: 2, source: 'static' },
      ],
      ripEnabled: false,
      ripNetworks: [],
      status: 'online',
      position: { x: 400, y: 50 },
    },
    // Core Router
    {
      id: 'camp-core',
      name: 'Router-Core',
      type: 'router',
      interfaces: [
        { id: 'int-ccr-g00', name: 'g0/0', macAddress: '02:ca:00:00:30:01', ipAddress: '10.0.1.2/24', subnetMask: '255.255.255.0', status: 'up' },
        { id: 'int-ccr-g01', name: 'g0/1', macAddress: '02:ca:00:00:30:02', ipAddress: '10.0.2.1/24', subnetMask: '255.255.255.0', status: 'up' },
        { id: 'int-ccr-g02', name: 'g0/2', macAddress: '02:ca:00:00:30:03', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-ccr-g03', name: 'g0/3', macAddress: '02:ca:00:00:30:04', ipAddress: '', subnetMask: '', status: 'up' },
      ],
      routingTable: [
        { network: '10.0.1.0', mask: '255.255.255.0', nextHop: '0.0.0.0', interfaceName: 'g0/0', metric: 0, source: 'connected' },
        { network: '10.0.2.0', mask: '255.255.255.0', nextHop: '0.0.0.0', interfaceName: 'g0/1', metric: 0, source: 'connected' },
        { network: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.1.1', interfaceName: 'g0/0', metric: 1, source: 'static' },
        { network: '192.168.2.0', mask: '255.255.255.0', nextHop: '10.0.2.2', interfaceName: 'g0/1', metric: 1, source: 'static' },
      ],
      ripEnabled: false,
      ripNetworks: [],
      status: 'online',
      position: { x: 580, y: 150 },
    },
    // Building B — Router3 + Switch2 → PC3 + PC4
    {
      id: 'camp-r3',
      name: 'Router-BuildingB',
      type: 'router',
      interfaces: [
        { id: 'int-cr3-g00', name: 'g0/0', macAddress: '02:ca:00:00:40:01', ipAddress: '10.0.2.2/24', subnetMask: '255.255.255.0', status: 'up' },
        { id: 'int-cr3-g01', name: 'g0/1', macAddress: '02:ca:00:00:40:02', ipAddress: '192.168.2.1/24', subnetMask: '255.255.255.0', status: 'up' },
        { id: 'int-cr3-g02', name: 'g0/2', macAddress: '02:ca:00:00:40:03', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-cr3-g03', name: 'g0/3', macAddress: '02:ca:00:00:40:04', ipAddress: '', subnetMask: '', status: 'up' },
      ],
      routingTable: [
        { network: '10.0.2.0', mask: '255.255.255.0', nextHop: '0.0.0.0', interfaceName: 'g0/0', metric: 0, source: 'connected' },
        { network: '192.168.2.0', mask: '255.255.255.0', nextHop: '0.0.0.0', interfaceName: 'g0/1', metric: 0, source: 'connected' },
        { network: '10.0.1.0', mask: '255.255.255.0', nextHop: '10.0.2.1', interfaceName: 'g0/0', metric: 1, source: 'static' },
        { network: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.2.1', interfaceName: 'g0/0', metric: 2, source: 'static' },
      ],
      ripEnabled: false,
      ripNetworks: [],
      status: 'online',
      position: { x: 760, y: 200 },
    },
    {
      id: 'camp-sw2',
      name: 'Switch-B',
      type: 'switch',
      interfaces: [
        { id: 'int-csw2-f1', name: 'fa0/1', macAddress: '02:ca:00:00:50:01', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw2-f2', name: 'fa0/2', macAddress: '02:ca:00:00:50:02', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw2-f3', name: 'fa0/3', macAddress: '02:ca:00:00:50:03', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw2-f4', name: 'fa0/4', macAddress: '02:ca:00:00:50:04', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw2-f5', name: 'fa0/5', macAddress: '02:ca:00:00:50:05', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw2-f6', name: 'fa0/6', macAddress: '02:ca:00:00:50:06', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw2-f7', name: 'fa0/7', macAddress: '02:ca:00:00:50:07', ipAddress: '', subnetMask: '', status: 'up' },
        { id: 'int-csw2-f8', name: 'fa0/8', macAddress: '02:ca:00:00:50:08', ipAddress: '', subnetMask: '', status: 'up' },
      ],
      status: 'online',
      position: { x: 940, y: 250 },
    },
    {
      id: 'camp-pc-b1',
      name: 'PC-B1',
      type: 'pc',
      interfaces: [
        { id: 'int-cpb1-e0', name: 'eth0', macAddress: '02:ca:00:00:60:01', ipAddress: '192.168.2.10/24', subnetMask: '255.255.255.0', status: 'up' },
      ],
      status: 'online',
      defaultGateway: '192.168.2.1',
      position: { x: 1120, y: 180 },
    },
    {
      id: 'camp-pc-b2',
      name: 'PC-B2',
      type: 'pc',
      interfaces: [
        { id: 'int-cpb2-e0', name: 'eth0', macAddress: '02:ca:00:00:60:02', ipAddress: '192.168.2.20/24', subnetMask: '255.255.255.0', status: 'up' },
      ],
      status: 'online',
      defaultGateway: '192.168.2.1',
      position: { x: 1120, y: 300 },
    },
  ],
  connections: [
    // Building A
    { id: 'conn-ca-1', sourceDeviceId: 'camp-pc-a1', sourceInterfaceId: 'int-cpa1-e0', targetDeviceId: 'camp-sw1', targetInterfaceId: 'int-csw1-f1' },
    { id: 'conn-ca-2', sourceDeviceId: 'camp-sw1', sourceInterfaceId: 'int-csw1-f2', targetDeviceId: 'camp-r1', targetInterfaceId: 'int-cr1-g00' },
    // Building A → Core
    { id: 'conn-ca-3', sourceDeviceId: 'camp-r1', sourceInterfaceId: 'int-cr1-g01', targetDeviceId: 'camp-core', targetInterfaceId: 'int-ccr-g00' },
    // Core → Building B
    { id: 'conn-ca-4', sourceDeviceId: 'camp-core', sourceInterfaceId: 'int-ccr-g01', targetDeviceId: 'camp-r3', targetInterfaceId: 'int-cr3-g00' },
    // Building B
    { id: 'conn-ca-5', sourceDeviceId: 'camp-r3', sourceInterfaceId: 'int-cr3-g01', targetDeviceId: 'camp-sw2', targetInterfaceId: 'int-csw2-f1' },
    { id: 'conn-ca-6', sourceDeviceId: 'camp-sw2', sourceInterfaceId: 'int-csw2-f2', targetDeviceId: 'camp-pc-b1', targetInterfaceId: 'int-cpb1-e0' },
    { id: 'conn-ca-7', sourceDeviceId: 'camp-sw2', sourceInterfaceId: 'int-csw2-f3', targetDeviceId: 'camp-pc-b2', targetInterfaceId: 'int-cpb2-e0' },
  ],
};
