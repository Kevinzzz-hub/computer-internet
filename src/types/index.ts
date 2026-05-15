// ── Device types ──

export type DeviceType = 'router' | 'switch' | 'pc';
export type InterfaceStatus = 'up' | 'down';
export type DeviceStatus = 'online' | 'offline';

export interface NetworkInterface {
  id: string;
  name: string;
  macAddress: string;
  ipAddress: string;
  subnetMask: string;
  status: InterfaceStatus;
}

// ── Routing ──

export interface Route {
  network: string;
  mask: string;
  nextHop: string;
  interfaceName: string;
  metric: number;
  source: 'connected' | 'static' | 'rip';
}

export interface ARPEntry {
  ipAddress: string;
  macAddress: string;
  interfaceName: string;
}

// ── Device data (serializable, stored in Zustand) ──

export interface DeviceData {
  id: string;
  name: string;
  type: DeviceType;
  interfaces: NetworkInterface[];
  status: DeviceStatus;
  // PC-specific
  defaultGateway?: string;
  // Router-specific
  routingTable?: Route[];
  ripEnabled?: boolean;
  ripNetworks?: string[];
  // Position on canvas
  position: { x: number; y: number };
}

// ── Topology ──

export interface Connection {
  id: string;
  sourceDeviceId: string;
  sourceInterfaceId: string;
  targetDeviceId: string;
  targetInterfaceId: string;
}

// ── Packets ──

export interface IPPacket {
  id: string;
  sourceIP: string;
  destinationIP: string;
  ttl: number;
  protocol: 'ICMP' | 'UDP' | 'RIP';
  payload: ICMPPayload | RIPPayload;
}

export interface ICMPPayload {
  type: 'echo-request' | 'echo-reply' | 'ttl-exceeded' | 'host-unreachable';
  identifier: number;
  sequenceNumber: number;
}

export interface RIPPayload {
  routes: RIPAdvertisement[];
}

export interface RIPAdvertisement {
  network: string;
  mask: string;
  metric: number;
}

// ── Simulation ──

export interface SimulationResult {
  success: boolean;
  outputLines: string[];
  events: SimulationEvent[];
}

export type SimulationEvent =
  | { type: 'arp-request'; sourceDeviceId: string; sourceInterface: string; targetIP: string }
  | { type: 'arp-reply'; sourceDeviceId: string; targetDeviceId: string; mac: string }
  | { type: 'arp-timeout'; sourceDeviceId: string; targetIP: string }
  | { type: 'packet-forward'; fromDevice: string; fromInterface: string; toDevice: string; toInterface: string; packetId: string }
  | { type: 'packet-deliver'; deviceId: string; packetId: string }
  | { type: 'packet-drop'; deviceId: string; reason: string }
  | { type: 'ttl-expired'; deviceId: string }
  | { type: 'route-not-found'; deviceId: string; destination: string }
  | { type: 'rip-update'; fromDevice: string; toDevice: string };

export interface AnimationPath {
  deviceIds: string[];
  connectionIds: string[];
}

// ── Topology snapshot (passed to simulation engine) ──

export interface TopologySnapshot {
  devices: Record<string, DeviceData>;
  connections: Connection[];
}

// ── Import/Export ──

export interface TopologyExport {
  version: 1;
  devices: DeviceData[];
  connections: Connection[];
}

// ── Parsed command ──

export interface ParsedCommand {
  command: string;
  args: Record<string, string | number | boolean>;
}

// ── Validation ──

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  deviceId?: string;
  connectionId?: string;
}
