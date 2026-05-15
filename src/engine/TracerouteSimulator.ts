import type { TopologySnapshot, SimulationResult, SimulationEvent } from '../types';
import { forwardPacket } from './PacketForwarder';
import { getInterfaceIP } from '../utils/ip';

export function simulateTraceroute(
  snapshot: TopologySnapshot,
  sourceDeviceId: string,
  targetIP: string,
  maxHops: number = 30,
): SimulationResult {
  const outputLines: string[] = [];
  const events: SimulationEvent[] = [];

  const sourceDev = snapshot.devices[sourceDeviceId];
  if (!sourceDev) {
    return { success: false, outputLines: ['Error: Source device not found'], events: [] };
  }

  const srcInt = sourceDev.interfaces.find(i => i.ipAddress && i.status === 'up');
  const srcIP = srcInt ? getInterfaceIP(srcInt.ipAddress) : '0.0.0.0';

  outputLines.push(`traceroute to ${targetIP} (${targetIP}), ${maxHops} hops max`);

  for (let ttl = 1; ttl <= maxHops; ttl++) {
    const result = forwardPacket(snapshot, targetIP, sourceDeviceId, ttl);
    events.push(...result.events);

    if (result.delivered) {
      // Found the target
      const hopDev = snapshot.devices[result.finalDeviceId];
      const hopInt = hopDev?.interfaces.find(i => i.ipAddress && i.status === 'up');
      const hopIP = hopInt ? getInterfaceIP(hopInt.ipAddress) : targetIP;
      outputLines.push(`${ttl}  ${hopDev?.name || '???'} (${hopIP})  2.0 ms`);
      outputLines.push(`Trace complete.`);
      return { success: true, outputLines, events };
    }

    if (result.message === 'TTL expired') {
      // Got TTL expired from the last device that handled the packet
      const lastHop = result.hops.length > 0 ? result.hops[result.hops.length - 1] : null;
      if (lastHop) {
        const hopDev = snapshot.devices[lastHop.deviceId];
        const hopInt = hopDev?.interfaces.find(i => i.name === lastHop.interfaceName && i.ipAddress);
        const hopIP = hopInt ? getInterfaceIP(hopInt.ipAddress) : '*';
        outputLines.push(`${ttl}  ${hopDev?.name || '???'} (${hopIP})  1.5 ms`);
      } else {
        outputLines.push(`${ttl}  * * *`);
      }
    } else {
      // No route or host unreachable
      outputLines.push(`${ttl}  * * *`);
      if (result.message === 'No route to host') {
        outputLines.push(`No route to host`);
        break;
      }
    }
  }

  return { success: false, outputLines, events };
}
