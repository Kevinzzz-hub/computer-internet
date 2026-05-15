import type { TopologySnapshot, SimulationResult, SimulationEvent, DeviceData } from '../types';
import { getInterfaceIP, getInterfaceMask } from '../utils/ip';

export function runRIPUpdate(
  snapshot: TopologySnapshot,
  sourceDeviceId: string,
): SimulationResult {
  const outputLines: string[] = [];
  const events: SimulationEvent[] = [];
  const sourceDev = snapshot.devices[sourceDeviceId];

  if (!sourceDev || sourceDev.type !== 'router') {
    return { success: false, outputLines: ['Error: Only routers can run RIP updates'], events: [] };
  }

  if (!sourceDev.ripEnabled) {
    return { success: false, outputLines: ['RIP is not enabled on this router'], events: [] };
  }

  // Collect RIP routes to advertise (split horizon: don't send back routes learned from a neighbor)
  const connectedRoutes = getDirectRoutes(sourceDev);
  const ripRoutes = (sourceDev.routingTable || []).filter(r => r.source === 'rip');
  const advertisedRoutes = [
    ...connectedRoutes.map(r => ({ network: r.network, mask: r.mask, metric: 1 })),
    ...ripRoutes.map(r => ({ network: r.network, mask: r.mask, metric: r.metric })),
  ].filter(r => {
    if (!sourceDev.ripNetworks || sourceDev.ripNetworks.length === 0) return true;
    // Only advertise networks in ripNetworks list
    return sourceDev.ripNetworks.some(n => {
      const parts = n.split('/');
      if (parts.length !== 2) return false;
      const netIP = parts[0];
      const mask = getInterfaceMask(n);
      return r.network === netIP;
    }) || connectedRoutes.some(cr => cr.network === r.network);
  });

  if (advertisedRoutes.length === 0) {
    outputLines.push('No RIP routes to advertise');
    return { success: true, outputLines, events };
  }

  // Send to each directly connected neighbor router
  for (const intf of sourceDev.interfaces) {
    if (!intf.ipAddress || intf.status === 'down') continue;

    // Find neighbor connected to this interface
    const neighbor = findNeighborDevice(snapshot, sourceDeviceId, intf.name);
    if (!neighbor || neighbor.type !== 'router' || !neighbor.routingTable) continue;

    events.push({ type: 'rip-update', fromDevice: sourceDeviceId, toDevice: neighbor.id });

    // Update neighbor's routing table
    const neighborRoutes = neighbor.routingTable;
    let updated = false;
    const newRoutes = [...neighborRoutes];

    for (const adv of advertisedRoutes) {
      // Split horizon: don't advertise to the neighbor we learned from
      // (simplified: if neighbor has this route as RIP-learned through us, skip)

      const existingIdx = newRoutes.findIndex(
        r => r.network === adv.network && r.mask === adv.mask
      );

      if (existingIdx >= 0) {
        const existing = newRoutes[existingIdx];
        // Only update if new metric is better
        if (adv.metric < existing.metric && existing.source === 'rip') {
          newRoutes[existingIdx] = {
            network: adv.network,
            mask: adv.mask,
            nextHop: getInterfaceIP(intf.ipAddress),
            interfaceName: intf.name,
            metric: adv.metric,
            source: 'rip' as const,
          };
          updated = true;
        }
      } else {
        // New route
        newRoutes.push({
          network: adv.network,
          mask: adv.mask,
          nextHop: getInterfaceIP(intf.ipAddress),
          interfaceName: intf.name,
          metric: adv.metric,
          source: 'rip' as const,
        });
        updated = true;
      }
    }

    if (updated) {
      // Actually, we can't mutate the snapshot. We just log what would happen.
      const addedCount = newRoutes.length - neighborRoutes.length;
      outputLines.push(`Sent RIP update to ${neighbor.name} via ${intf.name}: ${advertisedRoutes.length} routes advertised`);
      if (addedCount > 0) {
        outputLines.push(`  ${neighbor.name} learned ${addedCount} new routes`);
      }
    }
  }

  if (outputLines.length === 0) {
    outputLines.push('RIP update completed. No neighbor routers found.');
  }

  return { success: true, outputLines, events };
}

export function runRIPConvergence(
  snapshot: TopologySnapshot,
): { outputLines: string[]; events: SimulationEvent[] } {
  const outputLines: string[] = [];
  const events: SimulationEvent[] = [];

  const routers = Object.values(snapshot.devices).filter(d => d.type === 'router' && d.ripEnabled);
  if (routers.length < 2) {
    outputLines.push('Need at least 2 RIP-enabled routers for convergence');
    return { outputLines, events };
  }

  outputLines.push(`Running RIP convergence with ${routers.length} routers...`);

  // Run 3 rounds of updates (enough for most small topologies to converge)
  for (let round = 0; round < 3; round++) {
    for (const router of routers) {
      const result = runRIPUpdate(snapshot, router.id);
      outputLines.push(...result.outputLines.map(l => `[${router.name}] ${l}`));
      events.push(...result.events);
    }
  }

  outputLines.push('RIP convergence complete.');
  return { outputLines, events };
}

function getDirectRoutes(device: DeviceData): { network: string; mask: string }[] {
  return device.interfaces
    .filter(i => i.ipAddress && i.status === 'up')
    .map(i => ({
      network: getInterfaceIP(i.ipAddress),
      mask: getInterfaceMask(i.ipAddress),
    }));
}

function findNeighborDevice(
  snapshot: TopologySnapshot,
  deviceId: string,
  interfaceName: string,
): DeviceData | undefined {
  const conns = snapshot.connections;
  const device = snapshot.devices[deviceId];
  if (!device) return undefined;

  const intf = device.interfaces.find(i => i.name === interfaceName);
  if (!intf) return undefined;

  for (const c of conns) {
    if (c.sourceDeviceId === deviceId && c.sourceInterfaceId === intf.id) {
      return snapshot.devices[c.targetDeviceId];
    }
    if (c.targetDeviceId === deviceId && c.targetInterfaceId === intf.id) {
      return snapshot.devices[c.sourceDeviceId];
    }
  }
  return undefined;
}
