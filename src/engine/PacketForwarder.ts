import type { TopologySnapshot, DeviceData, IPPacket, SimulationEvent } from '../types';
import { getInterfaceIP, getInterfaceMask, sameSubnet, networkAddress } from '../utils/ip';
import { lookupRoute } from '../models/Router';
import { resolveARP } from './ARPResolver';

export interface HopInfo {
  deviceId: string;
  interfaceName: string;
}

export interface ForwardResult {
  delivered: boolean;
  finalDeviceId: string;
  message: string;
  hops: HopInfo[];
  events: SimulationEvent[];
}

function deviceOwnsIP(device: DeviceData, ip: string): boolean {
  return device.interfaces.some(intf => {
    if (!intf.ipAddress || intf.status === 'down') return false;
    return getInterfaceIP(intf.ipAddress) === ip;
  });
}

function getSourceIP(device: DeviceData, interfaceName: string): string {
  const intf = device.interfaces.find(i => i.name === interfaceName);
  if (!intf || !intf.ipAddress) return '';
  return getInterfaceIP(intf.ipAddress);
}

export function forwardPacket(
  snapshot: TopologySnapshot,
  destIP: string,
  sourceDeviceId: string,
  maxTTL: number = 64,
): ForwardResult {
  const events: SimulationEvent[] = [];
  const hops: HopInfo[] = [];
  let currentDeviceId = sourceDeviceId;
  let ttl = maxTTL;
  let sourceIP = '';

  // Get the first device's IP for the packet source
  const firstDevice = snapshot.devices[sourceDeviceId];
  if (firstDevice) {
    const firstInt = firstDevice.interfaces.find(i => i.ipAddress && i.status === 'up');
    if (firstInt) sourceIP = getInterfaceIP(firstInt.ipAddress);
  }

  while (true) {
    const device = snapshot.devices[currentDeviceId];
    if (!device) {
      events.push({ type: 'packet-drop', deviceId: currentDeviceId, reason: 'Device not found' });
      return { delivered: false, finalDeviceId: currentDeviceId, message: 'Device not found', hops, events };
    }

    // Does this device own the destination IP?
    if (deviceOwnsIP(device, destIP)) {
      events.push({ type: 'packet-deliver', deviceId: currentDeviceId, packetId: '' });
      return { delivered: true, finalDeviceId: currentDeviceId, message: 'Delivered', hops, events };
    }

    // Build routing table for this device
    let routes = buildRoutingTable(device, snapshot);

    // Look up route for destination
    const route = lookupRoute(routes, destIP);
    if (!route) {
      events.push({ type: 'route-not-found', deviceId: currentDeviceId, destination: destIP });
      return { delivered: false, finalDeviceId: currentDeviceId, message: 'No route to host', hops, events };
    }

    // Determine next-hop IP
    const nextHopIP = route.nextHop === '0.0.0.0' ? destIP : route.nextHop;

    // Decrement TTL
    ttl--;
    if (ttl <= 0) {
      events.push({ type: 'ttl-expired', deviceId: currentDeviceId });
      return { delivered: false, finalDeviceId: currentDeviceId, message: 'TTL expired', hops, events };
    }

    // ARP resolve next-hop
    const arpResult = resolveARP(snapshot, currentDeviceId, route.interfaceName, nextHopIP);
    events.push(...arpResult.events);

    if (!arpResult.result) {
      events.push({ type: 'packet-drop', deviceId: currentDeviceId, reason: 'ARP failed for ' + nextHopIP });
      return { delivered: false, finalDeviceId: currentDeviceId, message: 'Destination Host Unreachable', hops, events };
    }

    // Forward to next device
    const fromInt = route.interfaceName;
    events.push({
      type: 'packet-forward',
      fromDevice: currentDeviceId,
      fromInterface: fromInt,
      toDevice: arpResult.result.deviceId,
      toInterface: arpResult.result.interfaceName,
      packetId: '',
    });

    hops.push({ deviceId: currentDeviceId, interfaceName: fromInt });
    sourceIP = getSourceIP(device, fromInt);
    currentDeviceId = arpResult.result.deviceId;
  }
}

function buildRoutingTable(
  device: DeviceData,
  snapshot: TopologySnapshot,
): { network: string; mask: string; nextHop: string; interfaceName: string; metric: number; source: 'connected' | 'static' | 'rip' }[] {
  const routes: { network: string; mask: string; nextHop: string; interfaceName: string; metric: number; source: 'connected' | 'static' | 'rip' }[] = [];

  if (device.type === 'pc') {
    // PC: connected route + default gateway
    const eth0 = device.interfaces.find(i => i.name === 'eth0' && i.ipAddress && i.status === 'up');
    if (eth0) {
      const ip = getInterfaceIP(eth0.ipAddress);
      const mask = getInterfaceMask(eth0.ipAddress);
      routes.push({ network: networkAddress(ip, mask), mask, nextHop: '0.0.0.0', interfaceName: 'eth0', metric: 0, source: 'connected' });
      if (device.defaultGateway) {
        routes.push({ network: '0.0.0.0', mask: '0.0.0.0', nextHop: device.defaultGateway, interfaceName: 'eth0', metric: 1, source: 'static' });
      }
    }
  } else if (device.type === 'router') {
    // Add connected routes
    for (const intf of device.interfaces) {
      if (!intf.ipAddress || intf.status === 'down') continue;
      const ip = getInterfaceIP(intf.ipAddress);
      const mask = getInterfaceMask(intf.ipAddress);
      routes.push({ network: networkAddress(ip, mask), mask, nextHop: '0.0.0.0', interfaceName: intf.name, metric: 0, source: 'connected' });
    }
    // Add user-configured routes
    if (device.routingTable) {
      for (const r of device.routingTable) {
        if (r.source !== 'connected') {
          routes.push(r);
        }
      }
    }
  }

  return routes;
}

export { deviceOwnsIP, getSourceIP };
