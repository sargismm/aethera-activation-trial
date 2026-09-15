import { resolveEmulatorTarget } from '../../src/config';
import { isPortOpen } from '../../src/emulator';

/**
 * Runs once before the suite. Decides whether the integration tests can talk to the
 * emulator and records the answer for tests/support/emulator.ts to read.
 */
export default async function globalSetup(): Promise<void> {
  let reachable = false;
  let reason = '';
  try {
    const target = resolveEmulatorTarget();
    reachable = await isPortOpen(target.host, target.port);
    if (!reachable) reason = `nothing is listening on ${target.host}:${target.port}`;
  } catch (error) {
    reason = error instanceof Error ? error.message : String(error);
  }
  process.env.ACTIVATION_EMULATOR_REACHABLE = reachable ? '1' : '0';
  if (!reachable) {
    console.log(`\n[setup] Firestore emulator not available, integration tests will be skipped: ${reason}\n`);
  }
}
