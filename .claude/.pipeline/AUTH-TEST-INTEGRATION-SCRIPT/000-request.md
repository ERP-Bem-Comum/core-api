# AUTH-TEST-INTEGRATION-SCRIPT (S) — runner dedicado de integração para o módulo `auth`

## Origem

Descoberto no W3 de `AUTH-DB-REPO-SESSION` (2026-05-28): o script `package.json#test:integration` cobre
**apenas** globs do módulo `contracts` (migrations, mysql-driver, drizzle-mysql, outbox, cli mysql). Os testes
Drizzle de `auth` gated por `MYSQL_INTEGRATION=1` (`*.drizzle.test.ts` + `schema-hardening.test.ts`) ficam
`skipped` no `pnpm test` e **não têm runner dedicado** — ao contrário de `storage` e `notifications`, que já têm
`test:integration:storage` e `test:integration:notifications`.

**Risco:** uma regressão no adapter Drizzle de auth (ou no schema `auth_*`) passa despercebida — o gate padrão
nunca exerce esses testes contra MySQL real. Falso-verde silencioso.

## Escopo

Adicionar **`test:integration:auth`** ao `package.json`, espelhando o `test:integration` de contracts (precisa de
MySQL + secrets), mas apontando para os alvos de auth. Mesmo ciclo: cria secrets test-only → `docker compose up -d
mysql --wait` → roda suites gated com `MYSQL_INTEGRATION=1 --test-concurrency=1` → `docker compose down -v` +
remove secrets (cleanup garantido).

Alvos (4 suites, todas gated por `MYSQL_INTEGRATION=1`):
- `tests/modules/auth/adapters/persistence/refresh-token-repository.drizzle.test.ts`
- `tests/modules/auth/adapters/persistence/user-repository.drizzle.test.ts`
- `tests/modules/auth/adapters/persistence/role-repository.drizzle.test.ts`
- `tests/modules/auth/adapters/persistence/schema-hardening.test.ts`

### Por que script dedicado (não estender `test:integration`)
Padrão estabelecido do projeto (`:storage`, `:notifications` são separados). Isola o boot de auth do de contracts;
evita acoplar dois módulos num runner só (espírito do ADR-0014). Custo: 2 boots de MySQL no futuro CI — aceitável.

## Critérios de aceitação

Teste de tooling (`tests/scripts/test-integration-auth-script.test.ts`, lê `package.json` via `node:fs`):
- **CA1** — `scripts['test:integration:auth']` existe (string não-vazia).
- **CA2** — gate de ambiente: contém `MYSQL_INTEGRATION=1` e `--test-concurrency=1` (isolamento do truncate).
- **CA3** — cobre as 4 suites auth: referencia `refresh-token-repository.drizzle`, `user-repository.drizzle`,
  `role-repository.drizzle` e `schema-hardening`.
- **CA4** — higiene: sobe `docker compose up -d mysql --wait` e faz cleanup (`docker compose down -v` **e**
  `rm -f secrets/mysql_*.txt`).

Validação de comportamento (W1, não no teste unit): rodar `pnpm run test:integration:auth` de fato → 4 suites
verdes contra MySQL 8.4 real (já pré-validado em 29/29 no W3 de AUTH-DB-REPO-SESSION).

## Fora de escopo

- Workflow de CI (`.github/workflows/`) — não existe ainda; quando criado, deve invocar este script. Ticket futuro.
- Agregador `test:integration:all` — não necessário agora.
- Tocar os testes de auth em si (já entregues e verdes).

## Notas

- ADR-0012: `pnpm` sempre. ADR-0020: integração roda contra MySQL único.
- Conexão dos testes: `mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core`; `openAuthMysql({
  applyMigrations: true })` aplica a migration auth no boot.
