/**
 * Integration tests use this in place of describe. When the emulator is not
 * available the block is skipped, so unit tests can still run on any machine.
 */
export const emulatorAvailable = process.env.ACTIVATION_EMULATOR_REACHABLE === '1';

export const describeWithEmulator: jest.Describe = emulatorAvailable ? describe : describe.skip;
