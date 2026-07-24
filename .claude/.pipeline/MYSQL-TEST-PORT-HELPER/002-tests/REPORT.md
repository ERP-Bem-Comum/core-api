# MYSQL-TEST-PORT-HELPER — W0 (RED)

> Parte B da #500 · `tdd-strategist` · 2026-07-22. `src/` intocado; 69 não migrados (é W1).

## Testes (2 novos)
| Arquivo | Tipo | CAs |
| :-- | :-- | :-- |
| `tests/support/mysql-conn.test.ts` | comportamental (import estático do helper inexistente) | CA2,3,4,5 + endurecimento + overrides |
| `tests/cleanup/mysql-test-port-single-source.test.ts` | estrutural (varre tests/) | CA1,6,7 |

## Prova do RED
Baseline 4337/4318/0 → **4345 / 4321 pass / 5 fail / 19 skip**. `pass` **subiu** (regressão zero).
5 fails (RED): helper ausente (import) + CA1 (68 offenders fora da allowlist) + CA7 ×3 (runner tem
`MYSQL_PORT ?? '3306'` + conn inline + não usa o helper). **3 passes = guardas de regressão intencionais**
(pin da allowlist por `deepEqual`; CA6 ×2 do caso protegido) — começam verdes, o W1 **mantém** verdes.
Reconferido no fio principal: src intocado, 8 tests / 3 pass / 5 fail.

## Assinatura do helper (para o W1) — `tests/support/mysql-conn.ts`
```ts
export const MYSQL_TEST_HOST = '127.0.0.1';
export const MYSQL_TEST_DEFAULT_PORT = '3306';
export const mysqlTestConnectionString: (opts?: { user?; password?; database?; env? }) => string;
  // mysql://{user='root'}:{password='rootpw-migration-test-only'}@127.0.0.1:{MYSQL_PORT||3306}/{database='core'}
  // guarda: MYSQL_PORT vazio/branco → default 3306 (NÃO usar `?? '3306'` só → ':/core')
export const mysqlTestUrl: (env?) => string;  // env.MYSQL_TEST_URL ?? connectionString  (precedência)
```
Congelado (CA2): `mysqlTestConnectionString({ env:{} })` === `mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core`.

## Allowlist pinada (4, por deepEqual — justificativa por entrada)
1. `tests/support/mysql-conn.ts` (a fonte). 2. `mysql-conn.test.ts` (pina a string CA2). 3. `mysql-test-port-single-source.test.ts` (o needle). 4. 🚨 `sync-permissions.drizzle-mysql.test.ts` (**caso protegido** — o literal está num comentário que explica a ausência DELIBERADA de default; dar default apagaria o RBAC do dev — CA6). `tests/reports/CA-*` excluídos (forenses).

## CA4 — decisão: split
`ECONNREFUSED` real (porta sem MySQL) é runtime → **W3/integração** (flaky no puro). O testável sem banco
— e onde mora o risco — é **não haver fallback à 3306**: `MYSQL_PORT` setado → conn na porta pedida,
**jamais** contém `3306` (CA3 + CA4-unit com 9999). O puro protege a invariante barata; o W3 fecha a cara.

## Próximo passo (W1)
`nodejs-fs-scripter`: criar o helper + migrar os 68 (literal → `mysqlTestConnectionString`; os 2 com
`MYSQL_TEST_URL ?? '<literal>'` → `mysqlTestUrl()`) + runner consome o helper (remove `ETL_TEST_MYSQL_PORT`
+ conn inline). GREEN: offenders=0, guardas CA6 seguem verdes.
