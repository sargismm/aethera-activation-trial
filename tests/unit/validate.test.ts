import { isValidId, missingOrInvalid } from '../../src/validate';

describe('request validation', () => {
  it('accepts plain ids', () => {
    expect(isValidId('person-123')).toBe(true);
    expect(isValidId('INV_CEDAR')).toBe(true);
  });

  it('rejects empty, oversized and path-like ids', () => {
    expect(isValidId('')).toBe(false);
    expect(isValidId('a'.repeat(65))).toBe(false);
    expect(isValidId('people/other')).toBe(false);
    expect(isValidId(42)).toBe(false);
  });

  it('lists every missing or invalid field', () => {
    expect(missingOrInvalid({ token: 'INV-1' }, ['token', 'personId'])).toEqual(['personId']);
    expect(missingOrInvalid(undefined, ['token'])).toEqual(['token']);
  });
});
