import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

import { useTopologyStore } from '../../store/useTopologyStore';
import { useSimulationStore } from '../../store/useSimulationStore';
import { parseCommand } from '../../engine/CommandParser';
import { executeCommand } from '../../engine/SimulationEngine';
import { getInterfaceIP } from '../../utils/ip';
import type { Connection } from '../../types';

export default function TerminalView({ deviceId }: { deviceId: string }) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentLineRef = useRef('');
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  const device = useTopologyStore(s => s.devices[deviceId]);
  const buildSnapshot = useTopologyStore(s => s.buildSnapshot);
  const updateDevice = useTopologyStore(s => s.updateDevice);
  const startAnimation = useSimulationStore(s => s.startAnimation);

  const writeOutput = useCallback((lines: string[]) => {
    const term = xtermRef.current;
    if (!term) return;
    for (const line of lines) {
      term.writeln(line);
    }
  }, []);

  const writePrompt = useCallback(() => {
    const term = xtermRef.current;
    if (!term) return;
    const name = device?.name || deviceId;
    const prefix = device?.type === 'router' ? '#' : device?.type === 'switch' ? '>' : '$';
    term.write(`\r\n${name}${prefix} `);
  }, [device, deviceId]);

  const executeCmd = useCallback((raw: string) => {
    const term = xtermRef.current;
    if (!term || !raw.trim()) {
      writePrompt();
      return;
    }

    // Add to history
    historyRef.current.push(raw);
    historyIndexRef.current = historyRef.current.length;

    const parsed = parseCommand(raw);
    if ('error' in parsed) {
      term.writeln(`\r\nError: ${parsed.error}`);
      writePrompt();
      return;
    }

    const snapshot = buildSnapshot();
    const result = executeCommand(snapshot, deviceId, parsed);

    writeOutput(result.outputLines);

    // Handle state mutations for certain commands
    if (device) {
      const dt = device;

      // Static route add
      if (parsed.command === 'ip-route-add' && dt.type === 'router' && result.success) {
        const network = parsed.args.network as string;
        const mask = parsed.args.mask as string;
        const nextHop = parsed.args['next-hop'] as string;
        const ifaceName = dt.interfaces.find(i => {
          if (!i.ipAddress) return false;
          return getInterfaceIP(i.ipAddress) === nextHop ||
            getInterfaceIP(i.ipAddress).split('.').slice(0, 3).join('.') === nextHop.split('.').slice(0, 3).join('.');
        })?.name || 'g0/0';

        const newRoute = { network, mask, nextHop, interfaceName: ifaceName, metric: 1, source: 'static' as const };
        updateDevice(deviceId, {
          routingTable: [...(dt.routingTable || []), newRoute],
        });
      }

      // Static route delete
      if (parsed.command === 'ip-route-del' && dt.type === 'router' && result.success) {
        const network = parsed.args.network as string;
        const mask = parsed.args.mask as string;
        updateDevice(deviceId, {
          routingTable: (dt.routingTable || []).filter(r => !(r.network === network && r.mask === mask && r.source === 'static')),
        });
      }

      // RIP enable
      if (parsed.command === 'router-rip' && dt.type === 'router' && result.success) {
        updateDevice(deviceId, { ripEnabled: true });
      }

      // RIP network add/remove
      if (parsed.command === 'rip-network' && dt.type === 'router') {
        const net = parsed.args.network as string;
        updateDevice(deviceId, { ripNetworks: [...(dt.ripNetworks || []), net] });
      }
      if (parsed.command === 'rip-no-network' && dt.type === 'router') {
        const net = parsed.args.network as string;
        updateDevice(deviceId, { ripNetworks: (dt.ripNetworks || []).filter(n => n !== net) });
      }

      // Clear routes
      if (parsed.command === 'clear-ip-route' && dt.type === 'router' && result.success) {
        updateDevice(deviceId, {
          routingTable: (dt.routingTable || []).filter(r => r.source === 'connected'),
        });
      }
    }

    // Start packet animation if there are events
    if (result.events.length > 0) {
      const path = buildAnimationPath(result.events, snapshot.connections);
      if (path) startAnimation(path);
    }

    writePrompt();
  }, [deviceId, device, buildSnapshot, updateDevice, startAnimation, writeOutput, writePrompt]);

  useEffect(() => {
    if (!termRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0f172a',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        selectionBackground: '#334155',
        black: '#1e293b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e2e8f0',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    fitAddon.fit();

    // Welcome banner
    const name = device?.name || deviceId;
    term.writeln(`\x1b[1;36m╔══════════════════════════════════════╗\x1b[0m`);
    term.writeln(`\x1b[1;36m║   NetSim Lab - ${name.padEnd(17)} ║\x1b[0m`);
    term.writeln(`\x1b[1;36m╚══════════════════════════════════════╝\x1b[0m`);
    term.writeln(`Type "help" for available commands.`);
    term.writeln('');

    term.onData((data) => {
      if (data === '\r') {
        // Enter - execute command line
        term.writeln('');
        const cmd = currentLineRef.current.trim();
        currentLineRef.current = '';
        executeCmd(cmd);
      } else if (data === '\x7f') {
        // Backspace
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\x1b[A') {
        // Up arrow - history
        const hist = historyRef.current;
        if (hist.length > 0 && historyIndexRef.current > 0) {
          historyIndexRef.current--;
          // Clear current line
          term.write('\r\x1b[K');
          writePrompt();
          const cmd = hist[historyIndexRef.current];
          currentLineRef.current = cmd;
          term.write(cmd);
        }
      } else if (data === '\x1b[B') {
        // Down arrow - history
        const hist = historyRef.current;
        if (historyIndexRef.current < hist.length - 1) {
          historyIndexRef.current++;
          term.write('\r\x1b[K');
          writePrompt();
          const cmd = hist[historyIndexRef.current];
          currentLineRef.current = cmd;
          term.write(cmd);
        } else {
          historyIndexRef.current = hist.length;
          term.write('\r\x1b[K');
          writePrompt();
          currentLineRef.current = '';
        }
      } else if (data === '\t') {
        // Tab completion - basic
        const line = currentLineRef.current;
        const completions = getCompletions(line);
        if (completions.length === 1) {
          const suffix = completions[0].slice(line.length);
          currentLineRef.current += suffix;
          term.write(suffix);
        } else if (completions.length > 1) {
          term.writeln('');
          term.writeln(completions.join('  '));
          writePrompt();
          term.write(currentLineRef.current);
        }
      } else if (data >= ' ') {
        // Printable
        currentLineRef.current += data;
        term.write(data);
      }
    });

    // Handle resize
    const observer = new ResizeObserver(() => {
      fitAddon.fit();
    });
    observer.observe(termRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial prompt
    writePrompt();

    return () => {
      observer.disconnect();
      term.dispose();
    };
  }, [deviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={termRef} className="h-full w-full" />;
}

function getCompletions(line: string): string[] {
  const commands = [
    'ping', 'traceroute', 'show ip route', 'show arp', 'show interfaces',
    'show running-config', 'show ip protocols', 'ifconfig',
    'ip route add', 'ip route del', 'router rip', 'network', 'no network',
    'clear arp', 'clear ip route *', 'describe', 'help',
  ];
  return commands.filter(c => c.startsWith(line.toLowerCase()));
}

function buildAnimationPath(
  events: { type: string; fromDevice?: string; fromInterface?: string; toDevice?: string; toInterface?: string; packetId?: string }[],
  connections: Connection[],
): { deviceIds: string[]; connectionIds: string[] } | null {
  const deviceIds: string[] = [];
  const connectionIds: string[] = [];

  for (const e of events) {
    if (e.type === 'packet-forward' && e.fromDevice && e.toDevice) {
      deviceIds.push(e.fromDevice);
      deviceIds.push(e.toDevice);

      // Find direct connection between fromDevice and toDevice
      const directConn = connections.find(c =>
        (c.sourceDeviceId === e.fromDevice && c.targetDeviceId === e.toDevice) ||
        (c.sourceDeviceId === e.toDevice && c.targetDeviceId === e.fromDevice)
      );

      if (directConn) {
        connectionIds.push(directConn.id);
      } else {
        // Look for path through a switch: fromDevice ↔ Switch ↔ toDevice
        for (const c1 of connections) {
          const midDeviceId =
            c1.sourceDeviceId === e.fromDevice ? c1.targetDeviceId :
            c1.targetDeviceId === e.fromDevice ? c1.sourceDeviceId : null;
          if (!midDeviceId) continue;

          const c2 = connections.find(c =>
            c.id !== c1.id &&
            ((c.sourceDeviceId === midDeviceId && c.targetDeviceId === e.toDevice) ||
             (c.targetDeviceId === midDeviceId && c.sourceDeviceId === e.toDevice))
          );
          if (c2) {
            connectionIds.push(c1.id, c2.id);
            break;
          }
        }
      }
    }
  }

  if (connectionIds.length === 0) return null;
  return { deviceIds: [...new Set(deviceIds)], connectionIds };
}
