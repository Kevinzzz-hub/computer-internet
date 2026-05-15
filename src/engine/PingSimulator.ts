import type { TopologySnapshot, SimulationResult, SimulationEvent } from '../types';
import { forwardPacket } from './PacketForwarder';
import { getInterfaceIP } from '../utils/ip';

export function simulatePing(
  snapshot: TopologySnapshot,
  sourceDeviceId: string,
  targetIP: string,
  count: number = 4,
): SimulationResult {
  const outputLines: string[] = [];
  const events: SimulationEvent[] = [];

  const sourceDev = snapshot.devices[sourceDeviceId];
  if (!sourceDev) {
    return { success: false, outputLines: ['Error: Source device not found'], events: [] };
  }

  const srcInt = sourceDev.interfaces.find(i => i.ipAddress && i.status === 'up');
  const srcIP = srcInt ? getInterfaceIP(srcInt.ipAddress) : '0.0.0.0';

  outputLines.push(`PING ${targetIP} (${targetIP}) from ${srcIP}: 56 data bytes`);

  let successCount = 0;
  let totalTime = 0;
  const maxTime = 100;

  for (let seq = 0; seq < count; seq++) {
    // Forward request to target
    const fwdResult = forwardPacket(snapshot, targetIP, sourceDeviceId, 64);
    events.push(...fwdResult.events);

    if (!fwdResult.delivered) {
      outputLines.push(`Request timeout for icmp_seq=${seq}`);
      continue;
    }

    // Forward reply back to source
    // The reply comes from targetIP back to srcIP
    const revResult = forwardPacket(snapshot, srcIP, fwdResult.finalDeviceId, 64);
    events.push(...revResult.events);

    if (!revResult.delivered) {
      outputLines.push(`Request timeout for icmp_seq=${seq}`);
      continue;
    }

    // Simulate variable time
    const time = Math.floor(Math.random() * 5) + 1; // 1-5ms base
    const hopPenalty = fwdResult.hops.length * 2;
    const totalMs = time + hopPenalty;

    successCount++;
    totalTime += totalMs;

    const ttl = 64 - fwdResult.hops.length;
    outputLines.push(`64 bytes from ${targetIP}: icmp_seq=${seq} ttl=${ttl} time=${totalMs.toFixed(1)} ms`);
  }

  // Summary
  outputLines.push('');
  outputLines.push(`--- ${targetIP} ping statistics ---`);
  const loss = count - successCount;
  outputLines.push(`${count} packets transmitted, ${successCount} received, ${(loss / count * 100).toFixed(0)}% packet loss`);
  if (successCount > 0) {
    const avg = totalTime / successCount;
    outputLines.push(`round-trip min/avg/max = ${(avg - 2).toFixed(1)}/${avg.toFixed(1)}/${(avg + 2).toFixed(1)} ms`);
  }

  return { success: successCount > 0, outputLines, events };
}
