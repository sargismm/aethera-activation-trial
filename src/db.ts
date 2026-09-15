import { App, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { resolveEmulatorTarget } from './config';

let app: App | undefined;
let db: Firestore | undefined;

/**
 * The single way this code base obtains a Firestore client. The target is checked
 * first; the SDK is only initialised once the target is known to be a local emulator
 * and a demo project.
 *
 * No credential is configured, and none is needed: the emulator accepts any caller.
 * The universe domain is set explicitly because the Google client library otherwise
 * asks its auth layer for one, and with no credential loaded that lookup searches for
 * application default credentials and probes the cloud metadata server. Setting it
 * keeps every runtime call on this machine.
 */
export function getDb(): Firestore {
  const target = resolveEmulatorTarget();
  if (!db) {
    app = getApps().find((a) => a.name === 'activation-trial') ??
      initializeApp({ projectId: target.projectId }, 'activation-trial');
    db = getFirestore(app);
    db.settings({ universeDomain: 'googleapis.com' });
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (app) {
    const current = app;
    app = undefined;
    db = undefined;
    await deleteApp(current);
  }
}
