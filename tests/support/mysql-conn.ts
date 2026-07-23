// MYSQL-TEST-PORT-HELPER (Parte B da #500) — fonte ÚNICA da connection-string do MySQL de teste.
//
// A porta vem de `MYSQL_PORT` (default 3306), para o MySQL de teste rodar numa porta livre ao lado do
// dev na 3306 (coexistência). Antes, 69 arquivos fixavam `127.0.0.1:3306` no código. Host NÃO é
// parametrizável (fora de escopo — só a porta resolve a coexistência).
//
// ⚠️ Guarda de porta vazia/branca: `?? '3306'` sozinho deixa passar '' e produz "...:/core". Aqui,
// string vazia/branca cai no default.

import process from 'node:process';

export const MYSQL_TEST_HOST = '127.0.0.1';
export const MYSQL_TEST_DEFAULT_PORT = '3306';

type TestEnv = Readonly<Record<string, string | undefined>>;

export type MysqlTestConnOptions = Readonly<{
  user?: string; // default 'root'
  password?: string; // default 'rootpw-migration-test-only'
  database?: string; // default 'core'
  env?: TestEnv; // default process.env — injetável para determinismo nos testes
}>;

const resolvePort = (env: TestEnv): string => {
  const raw = (env['MYSQL_PORT'] ?? '').trim();
  return raw === '' ? MYSQL_TEST_DEFAULT_PORT : raw;
};

// `mysql://<user>:<password>@127.0.0.1:<port>/<database>`
export const mysqlTestConnectionString = (opts: MysqlTestConnOptions = {}): string => {
  const user = opts.user ?? 'root';
  const password = opts.password ?? 'rootpw-migration-test-only';
  const database = opts.database ?? 'core';
  const port = resolvePort(opts.env ?? process.env);
  return `mysql://${user}:${password}@${MYSQL_TEST_HOST}:${port}/${database}`;
};

// Precedência preservada: `MYSQL_TEST_URL` sobrepõe a conn derivada (o que 2 arquivos já faziam).
export const mysqlTestUrl = (env: TestEnv = process.env): string =>
  env['MYSQL_TEST_URL'] ?? mysqlTestConnectionString({ env });
