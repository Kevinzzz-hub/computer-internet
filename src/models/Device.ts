import type { DeviceData, DeviceType, NetworkInterface, DeviceStatus, InterfaceStatus } from '../types';
import { generateMAC } from '../utils/mac';
import { parseCIDR, getInterfaceIP, getInterfaceMask, networkAddress } from '../utils/ip';

let idCounter = 0;

export function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

export function createInterfaces(
  deviceId: string,
  type: DeviceType,
  names: string[],
): NetworkInterface[] {
  return names.map((name, i) => {
    const intId = nextId('int');
    return {
      id: intId,
      name,
      macAddress: generateMAC(deviceId, name),
      ipAddress: '',
      subnetMask: '',
      status: 'up' as InterfaceStatus,
    };
  });
}

export function createDevice(
  type: DeviceType,
  name: string,
  position: { x: number; y: number },
): DeviceData {
  const id = nextId(type);
  const interfaceNames =
    type === 'router' ? ['g0/0', 'g0/1', 'g0/2', 'g0/3'] :
    type === 'switch' ? ['fa0/1', 'fa0/2', 'fa0/3', 'fa0/4', 'fa0/5', 'fa0/6', 'fa0/7', 'fa0/8'] :
    ['eth0'];

  const device: DeviceData = {
    id,
    name,
    type,
    interfaces: createInterfaces(id, type, interfaceNames),
    status: 'online',
    position,
  };

  if (type === 'router') {
    device.routingTable = [];
    device.ripEnabled = false;
    device.ripNetworks = [];
  }
  if (type === 'pc') {
    device.defaultGateway = '';
  }

  return device;
}

export function getInterface(device: DeviceData, intId: string): NetworkInterface | undefined {
  return device.interfaces.find(i => i.id === intId);
}

export function getInterfaceByName(device: DeviceData, name: string): NetworkInterface | undefined {
  return device.interfaces.find(i => i.name === name);
}

export function getEnabledInterfaces(device: DeviceData): NetworkInterface[] {
  return device.interfaces.filter(i => i.status === 'up' && i.ipAddress);
}

export function getConnectedRoutes(device: DeviceData): { network: string; mask: string; interfaceName: string }[] {
  return getEnabledInterfaces(device).map(intf => {
    const parsed = parseCIDR(intf.ipAddress);
    if (!parsed) return null!;
    const ip = getInterfaceIP(intf.ipAddress);
    const mask = getInterfaceMask(intf.ipAddress);
    return {
      network: networkAddress(ip, mask),
      mask,
      interfaceName: intf.name,
    };
  }).filter(Boolean);
}
