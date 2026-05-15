import type { ParsedCommand } from '../types';
import { isValidIP } from '../utils/ip';

export function parseCommand(input: string): ParsedCommand | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: 'Empty command' };

  const tokens = trimmed.split(/\s+/);
  const cmd = tokens[0].toLowerCase();

  switch (cmd) {
    case 'ping': {
      // ping <ip> [count]
      if (tokens.length < 2) return { error: 'Usage: ping <ip> [count]' };
      const target = tokens[1];
      if (!isValidIP(target)) return { error: `Invalid IP: ${target}` };
      const count = tokens[2] ? parseInt(tokens[2], 10) : 4;
      if (isNaN(count) || count < 1 || count > 100) return { error: 'Count must be 1-100' };
      return { command: 'ping', args: { target, count } };
    }

    case 'traceroute':
    case 'tracert': {
      if (tokens.length < 2) return { error: 'Usage: traceroute <ip> [max-hops]' };
      const target = tokens[1];
      if (!isValidIP(target)) return { error: `Invalid IP: ${target}` };
      const maxHops = tokens[2] ? parseInt(tokens[2], 10) : 30;
      if (isNaN(maxHops) || maxHops < 1 || maxHops > 64) return { error: 'Max hops must be 1-64' };
      return { command: 'traceroute', args: { target, 'max-hops': maxHops } };
    }

    case 'show': {
      if (tokens.length < 2) return { error: 'Usage: show <ip route|arp|interfaces|running-config|ip protocols>' };
      const sub = tokens.slice(1).join(' ');
      if (sub === 'ip route' || sub === 'ip route rip' || sub === 'ip route static') {
        return { command: 'show-ip-route', args: { type: tokens[3] || 'all' } };
      }
      if (sub === 'arp') return { command: 'show-arp', args: {} };
      if (sub === 'interfaces' || sub === 'interface') return { command: 'show-interfaces', args: {} };
      if (sub === 'running-config' || sub === 'running config') return { command: 'show-running-config', args: {} };
      if (sub === 'ip protocols' || sub === 'ip protocol') return { command: 'show-ip-protocols', args: {} };
      return { error: `Unknown show command: ${sub}` };
    }

    case 'ifconfig':
    case 'ipconfig': {
      return { command: 'ifconfig', args: {} };
    }

    case 'ip': {
      if (tokens.length < 2) return { error: 'Usage: ip route add|del ...' };
      if (tokens[1] === 'route') {
        if (tokens.length < 2) return { error: 'Usage: ip route add|del ...' };
        if (tokens[2] === 'add') {
          // ip route add <network> mask <mask> <next-hop>
          if (tokens.length < 7) return { error: 'Usage: ip route add <network> mask <mask> <next-hop>' };
          const network = tokens[3];
          const mask = tokens[5];
          const nextHop = tokens[6];
          if (!isValidIP(network)) return { error: `Invalid network: ${network}` };
          if (!isValidIP(mask)) return { error: `Invalid mask: ${mask}` };
          if (!isValidIP(nextHop)) return { error: `Invalid next-hop: ${nextHop}` };
          return { command: 'ip-route-add', args: { network, mask, 'next-hop': nextHop } };
        }
        if (tokens[2] === 'del' || tokens[2] === 'delete') {
          if (tokens.length < 6) return { error: 'Usage: ip route del <network> mask <mask>' };
          const network = tokens[3];
          const mask = tokens[5];
          if (!isValidIP(network)) return { error: `Invalid network: ${network}` };
          if (!isValidIP(mask)) return { error: `Invalid mask: ${mask}` };
          return { command: 'ip-route-del', args: { network, mask } };
        }
      }
      return { error: 'Unknown ip command. Try: ip route add|del' };
    }

    case 'router': {
      if (tokens.length < 2) return { error: 'Usage: router rip' };
      if (tokens[1] === 'rip') {
        return { command: 'router-rip', args: {} };
      }
      return { error: `Unknown routing protocol: ${tokens[1]}` };
    }

    case 'network': {
      if (tokens.length < 2) return { error: 'Usage: network <ip/prefix>' };
      const net = tokens[1];
      const parts = net.split('/');
      if (parts.length !== 2) return { error: 'Use CIDR format: <ip>/<prefix>' };
      if (!isValidIP(parts[0])) return { error: `Invalid IP: ${parts[0]}` };
      const prefix = parseInt(parts[1], 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 32) return { error: 'Prefix must be 0-32' };
      return { command: 'rip-network', args: { network: net } };
    }

    case 'no': {
      if (tokens.length < 3) return { error: 'Usage: no network <ip/prefix>' };
      if (tokens[1] === 'network') {
        const net = tokens[2];
        const parts = net.split('/');
        if (parts.length !== 2) return { error: 'Use CIDR format: <ip>/<prefix>' };
        if (!isValidIP(parts[0])) return { error: `Invalid IP: ${parts[0]}` };
        return { command: 'rip-no-network', args: { network: net } };
      }
      return { error: `Unknown no command: no ${tokens[1]}` };
    }

    case 'describe': {
      if (tokens.length < 2) return { error: 'Usage: describe <ip>' };
      if (!isValidIP(tokens[1])) return { error: `Invalid IP: ${tokens[1]}` };
      return { command: 'describe', args: { ip: tokens[1] } };
    }

    case 'clear': {
      if (tokens.length < 2) return { error: 'Usage: clear <arp|ip route *>' };
      if (tokens[1] === 'arp') {
        return { command: 'clear-arp', args: {} };
      }
      if (tokens[1] === 'ip' && tokens[2] === 'route' && tokens[3] === '*') {
        return { command: 'clear-ip-route', args: {} };
      }
      return { error: `Unknown clear target: ${tokens.slice(1).join(' ')}` };
    }

    case 'help':
    case '?': {
      return { command: 'help', args: {} };
    }

    default:
      return { error: `Unknown command: ${cmd}. Type "help" for available commands.` };
  }
}
