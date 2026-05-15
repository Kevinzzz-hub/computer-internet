import type { TopologyExport } from '../types';
import { simpleLAN } from './simple-lan';
import { twoRouters } from './two-routers';
import { campus } from './campus';

export const presetTopologies: Record<string, TopologyExport> = {
  'simple-lan': simpleLAN,
  'two-routers': twoRouters,
  'campus': campus,
};
