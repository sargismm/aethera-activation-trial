/**
 * Sandbox connection settings. The only project this code will ever talk to is
 * the demo project below, and only through a Firestore emulator on this machine.
 */
export const DEMO_PROJECT_ID = 'demo-aethera-trial';
export const DEFAULT_EMULATOR_HOST = '127.0.0.1:8085';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export interface EmulatorTarget {
  projectId: string;
  host: string;
  port: number;
}

export class UnsafeTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeTargetError';
  }
}

/**
 * Split "host:port" into its parts. Accepts bracketed IPv6 such as "[::1]:8085".
 */
export function parseHostPort(value: string): { host: string; port: number } {
  const trimmed = value.trim();
  const match = /^(\[[^\]]+\]|[^:]+):(\d+)$/.exec(trimmed);
  if (!match) {
    throw new UnsafeTargetError(
      `FIRESTORE_EMULATOR_HOST must look like "127.0.0.1:8085", got "${value}".`,
    );
  }
  const port = Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new UnsafeTargetError(`FIRESTORE_EMULATOR_HOST has an invalid port: "${value}".`);
  }
  return { host: match[1], port };
}

/**
 * Decide whether the environment points at a safe, local emulator. Throws before
 * any SDK client exists, so a bad setting can never reach a cloud project.
 */
export function resolveEmulatorTarget(env: NodeJS.ProcessEnv = process.env): EmulatorTarget {
  const hostSetting = env.FIRESTORE_EMULATOR_HOST;
  if (!hostSetting) {
    throw new UnsafeTargetError(
      'FIRESTORE_EMULATOR_HOST is not set. This sandbox only runs against the local ' +
        `Firestore emulator. Start it with "npm run emulators", then run: ` +
        `export FIRESTORE_EMULATOR_HOST=${DEFAULT_EMULATOR_HOST}`,
    );
  }
  const { host, port } = parseHostPort(hostSetting);
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new UnsafeTargetError(
      `FIRESTORE_EMULATOR_HOST must point at this machine (127.0.0.1 or localhost), got "${host}".`,
    );
  }
  const projectId = env.GCLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT || DEMO_PROJECT_ID;
  if (!projectId.startsWith('demo-')) {
    throw new UnsafeTargetError(
      `Refusing project "${projectId}". Only demo projects (ids starting with "demo-") are allowed.`,
    );
  }
  return { projectId, host, port };
}
