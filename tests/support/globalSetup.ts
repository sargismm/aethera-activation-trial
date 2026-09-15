import { resolveEmulatorTarget } from '../../src/config';
import { isPortOpen } from '../../src/emulator';

/**
 * Runs once before the suite. Decides whether the integration tests can talk to the
 * emulator and records the answer for tests/support/emulator.ts to read.
 *
 * Skipping keeps "npm test" useful on a machine with no emulator, but it must never
 * be how a gate passes. When ACTIVATION_REQUIRE_EMULATOR is set, which the
 * activation gate always does, a missing emulator ends the run instead.
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
  if (reachable) return;

  if (process.env.ACTIVATION_REQUIRE_EMULATOR === '1') {
    throw new Error(
      'This run requires the Firestore emulator and cannot skip the integration ' +
        `tests: ${reason}`,
    );
  }
  console.log(`\n[setup] Firestore emulator not available, integration tests will be skipped: ${reason}\n`);
}
