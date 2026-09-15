import { PRACTICE_ACCESS_DEFAULT, resolvePracticeAccess } from '../../src/practiceAccess';

describe('practice access resolution', () => {
  it('defaults to off', () => {
    expect(PRACTICE_ACCESS_DEFAULT).toBe(false);
    expect(resolvePracticeAccess(undefined, undefined)).toEqual({ enabled: false, source: 'default' });
  });

  it('uses the practitioner config version when it sets a value', () => {
    expect(resolvePracticeAccess({ practiceAccess: { enabled: true } }, undefined)).toEqual({
      enabled: true,
      source: 'scoped',
    });
  });

  it('lets the practitioner config turn access off even when the global turns it on', () => {
    expect(
      resolvePracticeAccess({ practiceAccess: { enabled: false } }, { practiceAccess: { enabled: true } }),
    ).toEqual({ enabled: false, source: 'scoped' });
  });

  it('falls back to the global config when the practitioner config is silent', () => {
    expect(resolvePracticeAccess({}, { practiceAccess: { enabled: true } })).toEqual({
      enabled: true,
      source: 'global',
    });
  });

  it('ignores values that are not booleans', () => {
    const notBoolean = { practiceAccess: { enabled: 'yes' as unknown as boolean } };
    expect(resolvePracticeAccess(notBoolean, undefined)).toEqual({ enabled: false, source: 'default' });
  });
});
