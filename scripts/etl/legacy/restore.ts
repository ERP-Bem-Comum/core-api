/**
 * restore.ts — ciclo do MySQL 8.4 efêmero (compose.etl.yaml) para o ETL.
 *
 * `node:child_process` via execFile/spawn (NUNCA shell). Sobe o container, restaura
 * o dump por stream (`docker exec -i ... mysql < dump`), cria um usuário SELECT-only
 * e garante teardown (`down -v` + tmpfs → zero persistência). `withLegacyMysql` envolve
 * tudo num try/finally para que o container caia mesmo em falha.
 */

import { execFile, spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';

const COMPOSE_FILE = 'compose.etl.yaml';
const CONTAINER = 'etl-legacy-mysql';
const ROOT_PW = 'etl-ephemeral-local-only';
const DB = 'legacy';

export const READONLY_USER = 'etl_ro';
export const READONLY_PW = 'etl-ro-local';
export const LEGACY_DB = DB;

export type RestoreError =
  | Readonly<{ kind: 'compose-up-failed'; detail: string }>
  | Readonly<{ kind: 'restore-failed'; detail: string }>
  | Readonly<{ kind: 'grant-failed'; detail: string }>;

const detailOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// execFile('docker', ...) envolvido manualmente — Result em vez de throw.
const runDocker = async (
  args: readonly string[],
  timeoutMs: number,
): Promise<Result<void, string>> =>
  new Promise((resolve) => {
    execFile('docker', [...args], { timeout: timeoutMs }, (error) => {
      if (error === null) resolve(ok(undefined));
      else resolve(err(error.message));
    });
  });

const composeUp = async (): Promise<Result<void, RestoreError>> => {
  const r = await runDocker(['compose', '-f', COMPOSE_FILE, 'up', '-d', '--wait'], 180_000);
  return r.ok ? r : err({ kind: 'compose-up-failed', detail: r.error });
};

export const composeDown = async (): Promise<void> => {
  // Best-effort: o tmpfs já garante que nada persiste.
  await runDocker(['compose', '-f', COMPOSE_FILE, 'down', '-v'], 60_000);
};

// Restaura o dump por stream: createReadStream → stdin do `docker exec -i ... mysql`.
// Senha via env MYSQL_PWD no processo (não em argv visível por `ps`). stderr → console.
const restoreDump = async (dumpPath: string): Promise<Result<void, RestoreError>> => {
  const child = spawn(
    'docker',
    ['exec', '-i', '-e', `MYSQL_PWD=${ROOT_PW}`, CONTAINER, 'mysql', '-uroot', DB],
    { stdio: ['pipe', 'ignore', 'inherit'], windowsHide: true },
  );

  return new Promise<Result<void, RestoreError>>((resolve) => {
    child.on('error', (e) => {
      resolve(err({ kind: 'restore-failed', detail: e.message }));
    });
    child.on('close', (code) => {
      if (code === 0) resolve(ok(undefined));
      else resolve(err({ kind: 'restore-failed', detail: `mysql saiu com código ${code ?? -1}` }));
    });
    // stdin é não-null (stdio[0]='pipe'). Stream do dump → stdin do container.
    pipeline(createReadStream(dumpPath), child.stdin).catch((e: unknown) => {
      child.kill('SIGTERM');
      resolve(err({ kind: 'restore-failed', detail: detailOf(e) }));
    });
  });
};

// Usuário SELECT-only (native auth — ver compose.etl.yaml). O reader nunca escreve.
const grantReadonly = async (): Promise<Result<void, RestoreError>> => {
  const sql = `CREATE USER IF NOT EXISTS '${READONLY_USER}'@'%' IDENTIFIED WITH mysql_native_password BY '${READONLY_PW}'; GRANT SELECT ON \`${DB}\`.* TO '${READONLY_USER}'@'%'; FLUSH PRIVILEGES;`;
  const r = await runDocker(
    ['exec', '-e', `MYSQL_PWD=${ROOT_PW}`, CONTAINER, 'mysql', '-uroot', '-e', sql],
    30_000,
  );
  return r.ok ? r : err({ kind: 'grant-failed', detail: r.error });
};

/**
 * Sobe o efêmero, restaura o dump, cria o user SELECT-only e roda `fn` com o ciclo
 * vivo. SEMPRE derruba o container ao final (try/finally), mesmo em erro de `fn`.
 */
export const withLegacyMysql = async <T>(
  dumpPath: string,
  fn: () => Promise<T>,
): Promise<Result<T, RestoreError>> => {
  const up = await composeUp();
  if (!up.ok) return up;
  try {
    const restored = await restoreDump(dumpPath);
    if (!restored.ok) return restored;
    const granted = await grantReadonly();
    if (!granted.ok) return granted;
    return ok(await fn());
  } finally {
    await composeDown();
  }
};
