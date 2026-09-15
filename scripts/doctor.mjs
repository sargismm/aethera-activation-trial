#!/usr/bin/env node
/**
 * Check the local toolchain before anything else. Prints one line per check and a
 * next step for anything that needs attention. Uses no credentials and makes no
 * network calls beyond this machine.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const MIN_NODE_MAJOR = 22;
const MIN_JAVA_MAJOR = 21;
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8085;

let problems = 0;
const ok = (msg) => console.log(`  ok    ${msg}`);
const warn = (msg) => console.log(`  note  ${msg}`);
const fail = (msg, next) => {
  problems += 1;
  console.log(`  FAIL  ${msg}\n        next: ${next}`);
};

function portOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(1000, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

async function emulatorAnswers(host, port) {
  try {
    const response = await fetch(`http://${host}:${port}/`, { signal: AbortSignal.timeout(1500) });
    const text = await response.text();
    return response.ok && text.trim() === 'Ok';
  } catch {
    return false;
  }
}

console.log('Aethera activation trial: doctor\n');

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= MIN_NODE_MAJOR) ok(`Node ${process.versions.node}`);
else fail(`Node ${process.versions.node} is older than ${MIN_NODE_MAJOR}`, 'install Node 24 LTS (see .nvmrc)');

const javaRun = spawnSync('java', ['-version'], { encoding: 'utf8' });
const javaOutput = `${javaRun.stdout ?? ''}${javaRun.stderr ?? ''}`;
const javaMatch = /version "(\d+)(?:\.(\d+))?/.exec(javaOutput);
if (!javaMatch) {
  fail('Java was not found on PATH', `install a JDK ${MIN_JAVA_MAJOR} or newer (the Firestore emulator runs on Java)`);
} else {
  const major = javaMatch[1] === '1' ? Number(javaMatch[2]) : Number(javaMatch[1]);
  if (major >= MIN_JAVA_MAJOR) ok(`Java ${major}`);
  else fail(`Java ${major} is older than ${MIN_JAVA_MAJOR}`, `install a JDK ${MIN_JAVA_MAJOR} or newer and put it first on PATH`);
}

const bin = path.join('node_modules', '.bin', process.platform === 'win32' ? 'firebase.cmd' : 'firebase');
const cliPackage = path.join('node_modules', 'firebase-tools', 'package.json');
if (!existsSync('node_modules')) {
  fail('node_modules is missing', 'run "npm ci"');
} else if (!existsSync(bin) || !existsSync(cliPackage)) {
  fail('the local Firebase CLI is missing from node_modules', 'run "npm ci" again');
} else {
  // Read the version from the installed package. Running the CLI here would let it
  // fetch its own notices from the network, and this check stays on this machine.
  const { version } = JSON.parse(readFileSync(cliPackage, 'utf8'));
  ok(`Firebase CLI ${version} (local to this repository)`);
}

const hostSetting = process.env.FIRESTORE_EMULATOR_HOST;
if (!hostSetting) {
  warn(`FIRESTORE_EMULATOR_HOST is not set in this shell. Seed and inspect need it: export FIRESTORE_EMULATOR_HOST=${EMULATOR_HOST}:${EMULATOR_PORT}`);
} else if (!/^(127\.0\.0\.1|localhost):\d+$/.test(hostSetting)) {
  fail(`FIRESTORE_EMULATOR_HOST is "${hostSetting}"`, `point it at this machine: export FIRESTORE_EMULATOR_HOST=${EMULATOR_HOST}:${EMULATOR_PORT}`);
} else {
  ok(`FIRESTORE_EMULATOR_HOST=${hostSetting}`);
}

if (await portOpen(EMULATOR_HOST, EMULATOR_PORT)) {
  if (await emulatorAnswers(EMULATOR_HOST, EMULATOR_PORT)) ok(`Firestore emulator is answering on ${EMULATOR_HOST}:${EMULATOR_PORT}`);
  else fail(`port ${EMULATOR_PORT} is in use by something that is not the Firestore emulator`, `find it with "lsof -i :${EMULATOR_PORT}" and stop it`);
} else {
  warn(`Firestore emulator is not running on ${EMULATOR_HOST}:${EMULATOR_PORT}. Start it with "npm run emulators" when you need it.`);
}

console.log(problems ? `\n${problems} problem(s) found.` : '\nToolchain looks ready.');
process.exitCode = problems ? 1 : 0;
