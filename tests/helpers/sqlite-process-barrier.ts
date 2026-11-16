import { fork, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

const STARTUP_MS = 15_000;
const IPC_MS = 10_000;
const TOTAL_MS = 60_000;
const GRACEFUL_MS = 5_000;

export function waitForMessage(child: ChildProcess, expected: string, timeoutMs = IPC_MS): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms waiting for child message '${expected}'`)), timeoutMs);
    const onMessage = (message: any) => {
      if (message?.type === 'error') { cleanup(); reject(new Error(`Child error while waiting for '${expected}': ${message.message}`)); }
      else if (message?.type === expected) { cleanup(); resolve(message); }
    };
    const onExit = (code: number | null) => { cleanup(); reject(new Error(`Child exited (${code}) while waiting for '${expected}'`)); };
    const cleanup = () => { clearTimeout(timer); child.off('message', onMessage); child.off('exit', onExit); };
    child.on('message', onMessage); child.on('exit', onExit);
  });
}

export async function startWorker(databasePath: string): Promise<ChildProcess> {
  const child = fork(path.join(process.cwd(), 'tests/helpers/sqlite-worker.cjs'), [databasePath], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  try { await waitForMessage(child, 'ready', STARTUP_MS); return child; }
  catch (error) { child.kill(); throw error; }
}

export async function withDeadline<T>(label: string, work: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + TOTAL_MS;
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([work(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} exceeded ${TOTAL_MS}ms total deadline`)), TOTAL_MS); })]);
  } finally { if (timer) clearTimeout(timer); if (Date.now() > deadline) throw new Error(`${label} exceeded deadline`); }
}

export async function stopWorker(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try { child.send({ type: 'exit' }); await Promise.race([once(child, 'exit'), new Promise((_, reject) => setTimeout(() => reject(new Error('Graceful child shutdown exceeded 5s')), GRACEFUL_MS))]); }
  catch { child.kill(); await Promise.race([once(child, 'exit'), new Promise((_, reject) => setTimeout(() => reject(new Error('Forced child shutdown exceeded 5s')), GRACEFUL_MS))]); }
}