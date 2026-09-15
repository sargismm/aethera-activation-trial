import { closeDb, getDb } from '../src/db';
import { requireEmulator } from '../src/emulator';
import { seedBaseline } from '../fixtures/seed';

async function main() {
  const target = await requireEmulator();
  const count = await seedBaseline(getDb(), target);
  console.log(
    `Seeded ${count} baseline documents into ${target.projectId} at ${target.host}:${target.port}. ` +
      'Earlier people and practice sessions were cleared.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(`seed failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
