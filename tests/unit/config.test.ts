import { DEMO_PROJECT_ID, parseHostPort, resolveEmulatorTarget, UnsafeTargetError } from '../../src/config';

describe('emulator target guard', () => {
  it('accepts the local emulator and the demo project', () => {
    expect(resolveEmulatorTarget({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085' })).toEqual({
      projectId: DEMO_PROJECT_ID,
      host: '127.0.0.1',
      port: 8085,
    });
  });

  it('accepts localhost and bracketed IPv6 loopback', () => {
    expect(resolveEmulatorTarget({ FIRESTORE_EMULATOR_HOST: 'localhost:9000' }).host).toBe('localhost');
    expect(resolveEmulatorTarget({ FIRESTORE_EMULATOR_HOST: '[::1]:9000' }).host).toBe('[::1]');
  });

  it('refuses when no emulator host is configured', () => {
    expect(() => resolveEmulatorTarget({})).toThrow(UnsafeTargetError);
  });

  it('refuses a host that is not this machine', () => {
    expect(() => resolveEmulatorTarget({ FIRESTORE_EMULATOR_HOST: 'firestore.googleapis.com:443' })).toThrow(
      /must point at this machine/,
    );
    expect(() => resolveEmulatorTarget({ FIRESTORE_EMULATOR_HOST: '10.0.0.5:8085' })).toThrow(UnsafeTargetError);
  });

  it('refuses a project that is not a demo project', () => {
    expect(() =>
      resolveEmulatorTarget({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085', GCLOUD_PROJECT: 'aethera-prod' }),
    ).toThrow(/Only demo projects/);
  });

  it('rejects malformed host settings', () => {
    expect(() => parseHostPort('127.0.0.1')).toThrow(UnsafeTargetError);
    expect(() => parseHostPort('127.0.0.1:99999')).toThrow(UnsafeTargetError);
  });
});
