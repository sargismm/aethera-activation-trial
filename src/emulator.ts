import net from 'node:net';
import { EmulatorTarget, resolveEmulatorTarget } from './config';

/**
 * True when something accepts TCP connections on the configured emulator port.
 */
export function isPortOpen(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  const bareHost = host.replace(/^\[|\]$/g, '');
  return new Promise((resolve) => {
    const socket = net.connect({ host: bareHost, port });
    const finish = (open: boolean) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

/**
 * Resolve the safe target and confirm the emulator is answering. Throws with a next
 * step instead of letting the SDK retry against a closed port for a minute.
 */
export async function requireEmulator(): Promise<EmulatorTarget> {
  const target = resolveEmulatorTarget();
  if (!(await isPortOpen(target.host, target.port))) {
    throw new Error(
      `Nothing is listening on ${target.host}:${target.port}. Start the emulator in another ` +
        'terminal with "npm run emulators" and wait for "All emulators ready".',
    );
  }
  return target;
}

/**
 * Remove every document in the emulator's database for the demo project. This goes
 * through the emulator's own reset endpoint, which exists only on the emulator.
 */
export async function clearEmulator(target: EmulatorTarget): Promise<void> {
  const url =
    `http://${target.host}:${target.port}/emulator/v1/projects/${target.projectId}` +
    '/databases/(default)/documents';
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Emulator reset failed: HTTP ${response.status} from ${url}`);
  }
}
