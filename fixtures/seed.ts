import { Firestore } from 'firebase-admin/firestore';
import { EmulatorTarget } from '../src/config';
import { clearEmulator } from '../src/emulator';
import { BASELINE } from './baseline';

/**
 * Reset the emulator to the baseline: clear every document, then write BASELINE.
 * Safe to run any number of times.
 */
export async function seedBaseline(db: Firestore, target: EmulatorTarget): Promise<number> {
  await clearEmulator(target);
  const batch = db.batch();
  for (const [path, data] of Object.entries(BASELINE)) {
    batch.set(db.doc(path), data);
  }
  await batch.commit();
  return Object.keys(BASELINE).length;
}
