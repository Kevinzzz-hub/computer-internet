export function ipToBinary(ip: string): string {
  return ip.split('.').map(o => parseInt(o, 10).toString(2).padStart(8, '0')).join('');
}

export function binaryToIP(bin: string): string {
  return [0, 8, 16, 24].map(i => parseInt(bin.slice(i, i + 8), 2)).join('.');
}

export function maskToBinary(mask: string): string {
  return ipToBinary(mask);
}

export function prefixLengthFromMask(mask: string): number {
  let count = 0;
  const binary = maskToBinary(mask);
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') count++;
    else break;
  }
  return count;
}

export function maskFromPrefixLength(prefix: number): string {
  const full = '1'.repeat(prefix) + '0'.repeat(32 - prefix);
  return binaryToIP(full);
}

export function networkAddress(ip: string, mask: string): string {
  const ipBin = ipToBinary(ip);
  const maskBin = maskToBinary(mask);
  let networkBin = '';
  for (let i = 0; i < 32; i++) {
    networkBin += (ipBin[i] === '1' && maskBin[i] === '1') ? '1' : '0';
  }
  return binaryToIP(networkBin);
}

export function sameSubnet(ip1: string, mask1: string, ip2: string): boolean {
  const net1 = networkAddress(ip1, mask1);
  const net2 = networkAddress(ip2, mask1);
  return net1 === net2;
}

export function ipInSubnet(ip: string, network: string, mask: string): boolean {
  return networkAddress(ip, mask) === network;
}

export function isValidIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => {
    const n = parseInt(p, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

export function isValidCIDR(cidr: string): boolean {
  const parts = cidr.split('/');
  if (parts.length !== 2) return false;
  if (!isValidIP(parts[0])) return false;
  const prefix = parseInt(parts[1], 10);
  return !isNaN(prefix) && prefix >= 0 && prefix <= 32;
}

export function parseCIDR(cidr: string): { ip: string; mask: string } | null {
  if (!isValidCIDR(cidr)) return null;
  const [ip, prefix] = cidr.split('/');
  return { ip, mask: maskFromPrefixLength(parseInt(prefix, 10)) };
}

export function getInterfaceIP(ipCidr: string): string {
  const parsed = parseCIDR(ipCidr);
  return parsed ? parsed.ip : '';
}

export function getInterfaceMask(ipCidr: string): string {
  const parsed = parseCIDR(ipCidr);
  return parsed ? parsed.mask : '';
}

export function getInterfacePrefix(ipCidr: string): number {
  const parts = ipCidr.split('/');
  return parts.length === 2 ? parseInt(parts[1], 10) : 0;
}
