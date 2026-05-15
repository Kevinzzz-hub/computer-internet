import type { ARPEntry } from '../types';

export function getDefaultRoute(gateway: string): { network: string; mask: string; nextHop: string; interfaceName: string } | null {
  if (!gateway || gateway === '0.0.0.0') return null;
  return {
    network: '0.0.0.0',
    mask: '0.0.0.0',
    nextHop: gateway,
    interfaceName: 'eth0',
  };
}

export function createARPEntry(ip: string, mac: string, intf: string): ARPEntry {
  return { ipAddress: ip, macAddress: mac, interfaceName: intf };
}
