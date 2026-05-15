import { create } from 'zustand';

interface TerminalState {
  openTerminals: string[];
  activeTerminalId: string | null;
  outputBuffers: Record<string, string[]>;
  commandHistory: Record<string, string[]>;

  openTerminal: (deviceId: string) => void;
  closeTerminal: (deviceId: string) => void;
  setActiveTerminal: (deviceId: string) => void;
  appendOutput: (deviceId: string, lines: string[]) => void;
  clearOutput: (deviceId: string) => void;
  addToHistory: (deviceId: string, cmd: string) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  openTerminals: [],
  activeTerminalId: null,
  outputBuffers: {},
  commandHistory: {},

  openTerminal: (deviceId) => set(s => {
    if (s.openTerminals.includes(deviceId)) {
      return { activeTerminalId: deviceId };
    }
    return {
      openTerminals: [...s.openTerminals, deviceId],
      activeTerminalId: deviceId,
    };
  }),

  closeTerminal: (deviceId) => set(s => {
    const idx = s.openTerminals.indexOf(deviceId);
    const newTerminals = s.openTerminals.filter(id => id !== deviceId);
    return {
      openTerminals: newTerminals,
      activeTerminalId: s.activeTerminalId === deviceId
        ? (newTerminals[Math.max(0, idx - 1)] || null)
        : s.activeTerminalId,
    };
  }),

  setActiveTerminal: (deviceId) => set({ activeTerminalId: deviceId }),

  appendOutput: (deviceId, lines) => set(s => ({
    outputBuffers: {
      ...s.outputBuffers,
      [deviceId]: [...(s.outputBuffers[deviceId] || []), ...lines],
    },
  })),

  clearOutput: (deviceId) => set(s => ({
    outputBuffers: { ...s.outputBuffers, [deviceId]: [] },
  })),

  addToHistory: (deviceId, cmd) => set(s => ({
    commandHistory: {
      ...s.commandHistory,
      [deviceId]: [...(s.commandHistory[deviceId] || []), cmd],
    },
  })),
}));
