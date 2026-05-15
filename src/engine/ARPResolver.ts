import type { TopologySnapshot, SimulationEvent } from '../types';
import { getInterfaceIP, getInterfaceMask, sameSubnet } from '../utils/ip';

export interface ARPResult {
  deviceId: string;
  interfaceName: string;
  mac: string;
}

export function resolveARP(
  snapshot: TopologySnapshot,
  sourceDeviceId: string,
  sourceInterfaceName: string,
  targetIP: string,
): { result: ARPResult | null; events: SimulationEvent[] } {
  const events: SimulationEvent[] = [];
  const sourceDevice = snapshot.devices[sourceDeviceId];
  if (!sourceDevice) return { result: null, events };

  const srcInt = sourceDevice.interfaces.find(i => i.name === sourceInterfaceName);
  if (!srcInt || !srcInt.ipAddress || srcInt.status === 'down') {
    events.push({ type: 'arp-timeout', sourceDeviceId, targetIP });
    return { result: null, events };
  }

  const srcIP = getInterfaceIP(srcInt.ipAddress);
  const srcMask = getInterfaceMask(srcInt.ipAddress);

  events.push({ type: 'arp-request', sourceDeviceId, sourceInterface: sourceInterfaceName, targetIP });

  // Search all devices for one with targetIP on the same subnet
  for (const [devId, dev] of Object.entries(snapshot.devices)) {
    if (devId === sourceDeviceId && sourceDevice.type !== 'router') continue; // Don't ARP yourself (but routers can ping themselves)

    for (const intf of dev.interfaces) {
      if (!intf.ipAddress || intf.status === 'down') continue;
      const intIP = getInterfaceIP(intf.ipAddress);
      if (intIP !== targetIP) continue;

      // Check if on same subnet
      if (!sameSubnet(srcIP, srcMask, intIP)) {
        // Different subnet — skip
        continue;
      }

      // Found the target on same subnet
      events.push({ type: 'arp-reply', sourceDeviceId, targetDeviceId: devId, mac: intf.macAddress });
      return {
        result: { deviceId: devId, interfaceName: intf.name, mac: intf.macAddress },
        events,
      };
    }
  }

  events.push({ type: 'arp-timeout', sourceDeviceId, targetIP });
  return { result: null, events };
}
