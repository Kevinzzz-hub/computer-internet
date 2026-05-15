import type { TopologySnapshot, SimulationResult, ParsedCommand } from '../types';
import { simulatePing } from './PingSimulator';
import { simulateTraceroute } from './TracerouteSimulator';
import { runRIPUpdate, runRIPConvergence } from './RIPSimulator';
import { getInterfaceIP, getInterfaceMask, isValidIP, networkAddress } from '../utils/ip';
import { forwardPacket } from './PacketForwarder';
import { lookupRoute } from '../models/Router';

export function executeCommand(
  snapshot: TopologySnapshot,
  deviceId: string,
  command: ParsedCommand,
): SimulationResult {
  const device = snapshot.devices[deviceId];
  if (!device) {
    return { success: false, outputLines: ['Error: Device not found'], events: [] };
  }

  switch (command.command) {
    case 'ping': {
      const target = command.args.target as string;
      const count = (command.args.count as number) || 4;
      if (!isValidIP(target)) {
        return { success: false, outputLines: [`Error: Invalid IP address: ${target}`], events: [] };
      }
      return simulatePing(snapshot, deviceId, target, count);
    }

    case 'traceroute': {
      const target = command.args.target as string;
      const maxHops = (command.args['max-hops'] as number) || 30;
      if (!isValidIP(target)) {
        return { success: false, outputLines: [`Error: Invalid IP address: ${target}`], events: [] };
      }
      return simulateTraceroute(snapshot, deviceId, target, maxHops);
    }

    case 'show-ip-route': {
      const outputLines: string[] = [];
      outputLines.push(`Routing table for ${device.name}:`);
      outputLines.push('');

      if (device.type === 'pc') {
        outputLines.push('Destination     Gateway         Genmask         Flags Metric Iface');
        const eth0 = device.interfaces.find(i => i.name === 'eth0');
        if (eth0 && eth0.ipAddress && eth0.status === 'up') {
          const ip = getInterfaceIP(eth0.ipAddress);
          const mask = getInterfaceMask(eth0.ipAddress);
          outputLines.push(`${ip.padEnd(15)} 0.0.0.0         ${mask.padEnd(15)} U     0      eth0`);
        }
        if (device.defaultGateway) {
          outputLines.push(`0.0.0.0         ${device.defaultGateway.padEnd(15)} 0.0.0.0         UG    1      eth0`);
        }
      } else if (device.type === 'router') {
        outputLines.push('Destination     Gateway         Genmask         Flags Metric Iface');
        const allRoutes = buildRouterRoutes(device, snapshot);
        for (const r of allRoutes) {
          const flags = r.source === 'connected' ? 'C' : r.source === 'static' ? 'S' : 'R';
          const nextHop = r.nextHop === '0.0.0.0' ? '0.0.0.0' : r.nextHop;
          outputLines.push(
            `${r.network.padEnd(15)} ${nextHop.padEnd(15)} ${r.mask.padEnd(15)} ${flags}     ${String(r.metric).padEnd(6)} ${r.interfaceName}`
          );
        }
      } else {
        outputLines.push('Switches do not have a routing table.');
      }
      return { success: true, outputLines, events: [] };
    }

    case 'show-arp': {
      const outputLines: string[] = [];
      outputLines.push(`ARP cache for ${device.name}:`);
      outputLines.push('IP Address       MAC Address       Interface');
      // Show ARP entries gathered from directly connected devices
      const conns = snapshot.connections;
      for (const c of conns) {
        let neighborId: string | undefined;
        let neighborIntId: string | undefined;
        let localIntId: string | undefined;
        if (c.sourceDeviceId === deviceId) {
          neighborId = c.targetDeviceId;
          neighborIntId = c.targetInterfaceId;
          localIntId = c.sourceInterfaceId;
        } else if (c.targetDeviceId === deviceId) {
          neighborId = c.sourceDeviceId;
          neighborIntId = c.sourceInterfaceId;
          localIntId = c.targetInterfaceId;
        }
        if (neighborId && neighborIntId && localIntId) {
          const nDev = snapshot.devices[neighborId];
          const nInt = nDev?.interfaces.find(i => i.id === neighborIntId);
          const lInt = device.interfaces.find(i => i.id === localIntId);
          if (nInt && nInt.ipAddress) {
            outputLines.push(
              `${getInterfaceIP(nInt.ipAddress).padEnd(16)} ${nInt.macAddress.padEnd(17)} ${lInt?.name || '?'}`
            );
          }
        }
      }
      if (outputLines.length === 2) {
        outputLines.push('(ARP cache is empty)');
      }
      return { success: true, outputLines, events: [] };
    }

    case 'show-interfaces': {
      const outputLines: string[] = [];
      outputLines.push(`Interfaces for ${device.name}:`);
      outputLines.push('');
      for (const intf of device.interfaces) {
        const statusIcon = intf.status === 'up' ? 'UP' : 'DOWN';
        const ip = intf.ipAddress ? getInterfaceIP(intf.ipAddress) + '/' + getInterfaceMask(intf.ipAddress).replace(/^255\.255\.255\./, '') : 'unassigned';
        outputLines.push(`${intf.name.padEnd(10)} ${statusIcon.padEnd(6)} ${ip.padEnd(18)} ${intf.macAddress}`);
      }
      return { success: true, outputLines, events: [] };
    }

    case 'ifconfig': {
      return executeCommand(snapshot, deviceId, { command: 'show-interfaces', args: {} });
    }

    case 'show-running-config': {
      const outputLines: string[] = [];
      outputLines.push(`! Running configuration for ${device.name} (${device.type})`);
      outputLines.push(`hostname ${device.name}`);
      outputLines.push('!');
      for (const intf of device.interfaces) {
        if (intf.ipAddress) {
          outputLines.push(`interface ${intf.name}`);
          outputLines.push(` ip address ${intf.ipAddress}`);
          if (intf.status === 'down') outputLines.push(' shutdown');
          outputLines.push('!');
        }
      }
      if (device.type === 'router' && device.routingTable) {
        for (const r of device.routingTable) {
          if (r.source === 'static') {
            outputLines.push(`ip route ${r.network} ${r.mask} ${r.nextHop}`);
          }
        }
        if (device.ripEnabled) {
          outputLines.push('router rip');
          for (const net of (device.ripNetworks || [])) {
            outputLines.push(` network ${net}`);
          }
          outputLines.push('!');
        }
      }
      outputLines.push('end');
      return { success: true, outputLines, events: [] };
    }

    case 'ip-route-add': {
      if (device.type !== 'router') {
        return { success: false, outputLines: ['Error: Only routers support static routes'], events: [] };
      }
      const network = command.args.network as string;
      const mask = command.args.mask as string;
      const nextHop = command.args['next-hop'] as string;
      if (!isValidIP(network) || !isValidIP(mask) || !isValidIP(nextHop)) {
        return { success: false, outputLines: ['Error: Invalid IP address'], events: [] };
      }
      const intf = device.interfaces.find(i => {
        if (!i.ipAddress) return false;
        return getInterfaceIP(i.ipAddress) === nextHop || getInterfaceIP(i.ipAddress).split('.').slice(0, 3).join('.') === nextHop.split('.').slice(0, 3).join('.');
      });
      const ifaceName = intf?.name || 'unknown';
      const newRoute = {
        network,
        mask,
        nextHop,
        interfaceName: ifaceName,
        metric: 1,
        source: 'static' as const,
      };
      const existing = device.routingTable || [];
      // Check for duplicates
      if (existing.some(r => r.network === network && r.mask === mask)) {
        return { success: false, outputLines: ['Error: Route already exists'], events: [] };
      }
      return {
        success: true,
        outputLines: [`Static route added: ${network}/${mask} via ${nextHop}`],
        events: [],
      };
    }

    case 'ip-route-del': {
      if (device.type !== 'router') {
        return { success: false, outputLines: ['Error: Only routers support static routes'], events: [] };
      }
      const network = command.args.network as string;
      const mask = command.args.mask as string;
      return {
        success: true,
        outputLines: [`Static route deleted: ${network}/${mask}`],
        events: [],
      };
    }

    case 'router-rip': {
      if (device.type !== 'router') {
        return { success: false, outputLines: ['Error: Only routers support RIP'], events: [] };
      }
      // Enable RIP
      return {
        success: true,
        outputLines: ['RIP enabled. Use "network <ip/prefix>" to add advertised networks'],
        events: [],
      };
    }

    case 'rip-network': {
      if (device.type !== 'router') {
        return { success: false, outputLines: ['Error: Only routers support RIP'], events: [] };
      }
      const net = command.args.network as string;
      return {
        success: true,
        outputLines: [`RIP network added: ${net}`],
        events: [],
      };
    }

    case 'rip-no-network': {
      if (device.type !== 'router') {
        return { success: false, outputLines: ['Error: Only routers support RIP'], events: [] };
      }
      const net = command.args.network as string;
      return {
        success: true,
        outputLines: [`RIP network removed: ${net}`],
        events: [],
      };
    }

    case 'show-ip-protocols': {
      if (device.type !== 'router') {
        return { success: false, outputLines: ['Error: Only routers support routing protocols'], events: [] };
      }
      const outputLines: string[] = [];
      outputLines.push(`Routing Protocol is "rip"`);
      outputLines.push(`  RIP ${device.ripEnabled ? 'enabled' : 'disabled'}`);
      if (device.ripNetworks) {
        outputLines.push(`  Advertised networks:`);
        for (const n of device.ripNetworks) {
          outputLines.push(`    ${n}`);
        }
      }
      return { success: true, outputLines, events: [] };
    }

    case 'describe': {
      const target = command.args.ip as string;
      if (!isValidIP(target)) {
        return { success: false, outputLines: [`Error: Invalid IP: ${target}`], events: [] };
      }
      return describePacketPath(snapshot, deviceId, target);
    }

    case 'clear-arp': {
      return { success: true, outputLines: ['ARP cache cleared.'], events: [] };
    }

    case 'clear-ip-route': {
      if (device.type !== 'router') {
        return { success: false, outputLines: ['Error: Only routers support this command'], events: [] };
      }
      return {
        success: true,
        outputLines: ['Routing table cleared (static and RIP routes removed).'],
        events: [],
      };
    }

    case 'help': {
      const outputLines = [
        'Available commands:',
        '  ping <ip> [count]              - Send ICMP echo requests',
        '  traceroute <ip> [max-hops]     - Trace route to destination',
        '  show ip route [rip|static]     - Show routing table',
        '  show arp                       - Show ARP cache',
        '  show interfaces                - Show interface status',
        '  show running-config            - Show full configuration',
        '  show ip protocols              - Show routing protocol status',
        '  ifconfig                       - Show interface info (alias)',
        '  ip route add <net> mask <m> <nh> - Add static route',
        '  ip route del <net> mask <m>    - Delete static route',
        '  router rip                     - Enable RIP',
        '  network <ip/prefix>            - Add RIP network',
        '  no network <ip/prefix>         - Remove RIP network',
        '  clear arp                      - Clear ARP cache',
        '  clear ip route *               - Clear static/RIP routes',
        '  describe <ip>                  - Explain packet path to IP',
        '  help                           - Show this help',
      ];
      return { success: true, outputLines, events: [] };
    }

    default:
      return { success: false, outputLines: [`Unknown command: ${command.command}. Type "help" for available commands.`], events: [] };
  }
}

function buildRouterRoutes(device: import('../types').DeviceData, snapshot: TopologySnapshot): { network: string; mask: string; nextHop: string; interfaceName: string; metric: number; source: 'connected' | 'static' | 'rip' }[] {
  const routes: { network: string; mask: string; nextHop: string; interfaceName: string; metric: number; source: 'connected' | 'static' | 'rip' }[] = [];

  for (const intf of device.interfaces) {
    if (!intf.ipAddress || intf.status === 'down') continue;
    const ip = getInterfaceIP(intf.ipAddress);
    const mask = getInterfaceMask(intf.ipAddress);
    routes.push({ network: networkAddress(ip, mask), mask, nextHop: '0.0.0.0', interfaceName: intf.name, metric: 0, source: 'connected' });
  }

  if (device.routingTable) {
    for (const r of device.routingTable) {
      if (r.source !== 'connected') {
        routes.push(r);
      }
    }
  }

  return routes;
}

function describePacketPath(
  snapshot: TopologySnapshot,
  sourceDeviceId: string,
  targetIP: string,
): SimulationResult {
  const outputLines: string[] = [];
  const sourceDev = snapshot.devices[sourceDeviceId];
  if (!sourceDev) {
    return { success: false, outputLines: ['Error: Source device not found'], events: [] };
  }

  outputLines.push(`Packet path from ${sourceDev.name} to ${targetIP}:`);
  outputLines.push('');

  // Use forwardPacket to trace the path
  const result = forwardPacket(snapshot, targetIP, sourceDeviceId, 64);

  if (result.delivered) {
    outputLines.push(`Packet would be DELIVERED to target.`);
    outputLines.push(`Hops: ${result.hops.map(h => snapshot.devices[h.deviceId]?.name || '?').join(' → ')}`);
  } else {
    outputLines.push(`Packet would be DROPPED: ${result.message}`);
    if (result.hops.length > 0) {
      outputLines.push(`Path before drop: ${result.hops.map(h => snapshot.devices[h.deviceId]?.name || '?').join(' → ')}`);
    }
  }

  return { success: true, outputLines, events: result.events };
}
