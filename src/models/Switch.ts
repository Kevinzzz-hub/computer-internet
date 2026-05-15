// Switch is a transparent bridge for v1.
// Devices connected to the same switch are on the same broadcast domain.
// No MAC-learning, no STP — purely decorative from a forwarding standpoint
// (ARP handles finding devices on the same subnet transparently).

export function getBroadcastDomain(switchId: string, connectedDeviceIds: string[]): string[] {
  return connectedDeviceIds;
}
