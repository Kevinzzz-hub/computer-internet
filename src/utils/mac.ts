export function generateMAC(deviceId: string, interfaceName: string): string {
  const seed = `${deviceId}:${interfaceName}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  // Locally administered unicast: x2-xx-xx-xx-xx-xx
  const octets: number[] = [];
  octets.push(0x02);
  for (let i = 1; i < 6; i++) {
    octets.push(Math.abs((hash >> (i * 4)) & 0xFF));
  }
  return octets.map(o => o.toString(16).padStart(2, '0')).join(':');
}

export function formatMAC(mac: string): string {
  return mac.toLowerCase().replace(/[^0-9a-f]/g, '').replace(/(.{2})(?=.)/g, '$1:');
}

export function isValidMAC(mac: string): boolean {
  return /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(mac);
}
