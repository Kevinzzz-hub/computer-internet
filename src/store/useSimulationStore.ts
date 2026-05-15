import { create } from 'zustand';
import type { AnimationPath } from '../types';

interface SimulationState {
  isRunning: boolean;
  currentAnimation: AnimationPath | null;
  animationIndex: number;

  startAnimation: (path: AnimationPath) => void;
  advanceAnimation: () => void;
  clearAnimation: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  isRunning: false,
  currentAnimation: null,
  animationIndex: 0,

  startAnimation: (path) => set({
    isRunning: true,
    currentAnimation: path,
    animationIndex: 0,
  }),

  advanceAnimation: () => set(s => {
    if (!s.currentAnimation) return s;
    const next = s.animationIndex + 1;
    if (next >= s.currentAnimation.connectionIds.length) {
      return { isRunning: false, animationIndex: 0 };
    }
    return { animationIndex: next };
  }),

  clearAnimation: () => set({
    isRunning: false,
    currentAnimation: null,
    animationIndex: 0,
  }),
}));
