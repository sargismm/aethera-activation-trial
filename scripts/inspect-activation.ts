/**
 * Walk one practitioner's activation path against the local emulator and print what
 * actually happened: each HTTP exchange, then the practice session records that exist.
 *
 * This prints evidence. It does not decide whether anything is ready.
 *
 *   npm run inspect:activation -- --practitioner harbor
 *
 * State it leaves behind: a people/inspect-<practitioner> document and, when a start
 * succeeds, one practiceSessions document per run. "npm run seed" clears both.
 */
import { AddressInfo } from 'node:net';
import { createApp } from '../src/app';
import { closeDb, getDb } from '../src/db';
import { requireEmulator } from '../src/emulator';
import { COLLECTIONS } from '../src/model';
import { FIXTURE, FixturePractitioner } from '../fixtures/baseline';

function readPractitionerArg(argv: string[]): FixturePractitioner {
  const index = argv.indexOf('--practitioner');
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (value && value in FIXTURE) return value as FixturePractitioner;
  const known = Object.keys(FIXTURE).join(', ');
  throw new Error(`Pass --practitioner <id>, one of: ${known}. Got: ${value ?? 'nothing'}`);
}

async function main() {
  const which = readPractitionerArg(process.argv.slice(2));
  const target = await requireEmulator();
  const fixture = FIXTURE[which];
  const personId = `inspect-${which}`;

  const server = createApp(getDb).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const call = async (label: string, method: 'GET' | 'POST', path: string, body?: unknown) => {
    const response = await fetch(base + path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await response.json();
    console.log(`\n${label}\n  ${method} ${path}${body ? ` ${JSON.stringify(body)}` : ''}`);
    console.log(`  HTTP ${response.status}  ${JSON.stringify(json)}`);
    return json;
  };

  try {
    console.log(`Inspecting practitioner "${which}" against ${target.host}:${target.port} (${target.projectId})`);
    console.log(`Synthetic person id: ${personId}`);

    await call('1. Accept invitation', 'POST', '/invitations/accept', {
      token: fixture.invitationToken,
      personId,
    });
    await call('2. Resolve practitioner', 'GET', `/people/${personId}/practitioner`);
    await call('3. Start practice', 'POST', '/practices/start', {
      personId,
      practiceId: fixture.practiceId,
    });

    const sessions = await getDb()
      .collection(COLLECTIONS.practiceSessions)
      .where('personId', '==', personId)
      .get();
    console.log(`\npracticeSessions for ${personId}: ${sessions.size}`);
    for (const doc of sessions.docs) {
      console.log(`  ${doc.id}  ${JSON.stringify(doc.data())}`);
    }
    console.log('\nThis is an inspection of one run, not a readiness check. Reset with "npm run seed".');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main()
  .catch((error: unknown) => {
    console.error(`inspect failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
