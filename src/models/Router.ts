import type { Route } from '../types';
import { ipInSubnet } from '../utils/ip';

export function createRoute(
  network: string,
  mask: string,
  nextHop: string,
  interfaceName: string,
  metric: number,
  source: Route['source'],
): Route {
  return { network, mask, nextHop, interfaceName, metric, source };
}

export function lookupRoute(routes: Route[], destination: string): Route | undefined {
  let bestMatch: Route | undefined;
  let bestPrefix = -1;

  for (const route of routes) {
    if (ipInSubnet(destination, route.network, route.mask)) {
      const prefix = maskToPrefix(route.mask);
      if (prefix > bestPrefix) {
        bestPrefix = prefix;
        bestMatch = route;
      }
    }
  }
  return bestMatch;
}

function maskToPrefix(mask: string): number {
  let count = 0;
  for (const part of mask.split('.')) {
    const n = parseInt(part, 10);
    for (let i = 7; i >= 0; i--) {
      if ((n >> i) & 1) count++;
      else return count;
    }
  }
  return count;
}
