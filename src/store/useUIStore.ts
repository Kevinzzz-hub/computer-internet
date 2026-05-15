import { create } from 'zustand';

interface UIState {
  selectedDeviceId: string | null;
  contextMenu: { x: number; y: number; deviceId: string } | null;
  sidebarOpen: boolean;
  terminalHeight: number;

  selectDevice: (id: string | null) => void;
  toggleSidebar: () => void;
  setTerminalHeight: (h: number) => void;
  openContextMenu: (x: number, y: number, deviceId: string) => void;
  closeContextMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedDeviceId: null,
  contextMenu: null,
  sidebarOpen: true,
  terminalHeight: 280,

  selectDevice: (id) => set({ selectedDeviceId: id }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setTerminalHeight: (h) => set({ terminalHeight: h }),
  openContextMenu: (x, y, deviceId) => set({ contextMenu: { x, y, deviceId } }),
  closeContextMenu: () => set({ contextMenu: null }),
}));
