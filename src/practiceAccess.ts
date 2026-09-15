import { PracticeConfig } from './model';

/**
 * What happens when nothing says practice access is on. New behaviour defaults off.
 */
export const PRACTICE_ACCESS_DEFAULT = false;

/**
 * Resolve whether practice access is enabled for one practitioner's config version.
 *
 * Order: the practitioner's own versioned config, then the global config, then the
 * code default. The first layer that sets practiceAccess.enabled to a boolean wins.
 */
export function resolvePracticeAccess(
  scoped: PracticeConfig | undefined,
  global: PracticeConfig | undefined,
): { enabled: boolean; source: 'scoped' | 'global' | 'default' } {
  const scopedValue = scoped?.practiceAccess?.enabled;
  if (typeof scopedValue === 'boolean') {
    return { enabled: scopedValue, source: 'scoped' };
  }
  const globalValue = global?.practiceAccess?.enabled;
  if (typeof globalValue === 'boolean') {
    return { enabled: globalValue, source: 'global' };
  }
  return { enabled: PRACTICE_ACCESS_DEFAULT, source: 'default' };
}
