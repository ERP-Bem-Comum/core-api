# W0 — RED — CTR-DB-DRIVER-MYSQL

**Wave:** W0 (RED)
**Owner:** test-writer (Gabriel + Claude)
**Data:** 2026-05-15
**Status:** ✅ COMPLETED — RED válido via erro de compilação (4 TS2307)

---

## Arquivos entregues

| Arquivo | Descrição | LoC |
| :--- | :--- | :--- |
| `tests/modules/contracts/adapters/persistence/mysql-driver.test.ts` | CA-1 (dep), CA-2 (exports), CA-5..CA-8 (runtime) | 130 |
| `tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts` | CA-3/4 (exports), CA-9/10 (suites contratuais), CA-11/12 (constraints), CA-13/14 (CLI lifecycle) | 200 |

Os 14 CAs declarados em `000-request.md` ficam cobertos. Sem CA órfão; sem teste sem CA.

---

## Como o RED se manifesta

`pnpm run typecheck`:

```
tests/modules/contracts/adapters/persistence/mysql-driver.test.ts:
  Cannot find module '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts'

tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts:
  Cannot find module '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts'
  Cannot find module '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle-mysql.ts'
  Cannot find module '#src/modules/contracts/adapters/persistence/repos/amendment-repository.drizzle-mysql.ts'
```

A suite **nem compila** — o que é exatamente o sinal RED para "API pretendida não existe". CA-2/3/4 (exports) falham por inexistência do módulo. CA-1 (package.json#mysql2) também falha porque ESLint/TS não conseguem rodar a check.

Quando o W1 implementar:
- `drivers/mysql-driver.ts` exportando `openMysql`, `MysqlHandle`, `MysqlConnectOptions`, `MysqlDriverError` → CA-2 verde.
- `repos/contract-repository.drizzle-mysql.ts` exportando `createDrizzleMysqlContractRepository` → CA-3 verde.
- `repos/amendment-repository.drizzle-mysql.ts` exportando `createDrizzleMysqlAmendmentRepository` → CA-4 verde.
- `package.json#dependencies.mysql2 = "^3.x"` → CA-1 verde.

CA-5..CA-14 (funcionais) ficam GREEN sob `MYSQL_INTEGRATION=1` quando os adapters reais estiverem implementados.

---

## Decisões de implementação dos testes

### D-T1: Reuso de `runContractRepositoryContract` + `runAmendmentRepositoryContract`

Em vez de duplicar cenários, consumimos as **mesmas** suítes contratuais que `drizzle-sqlite.test.ts` consome. Qualquer divergência semântica entre Drizzle/SQLite e Drizzle/MySQL falha automaticamente — não há cenário "MySQL-only" para round-trip.

### D-T2: Handle compartilhado + truncate per-test (não pool-per-test)

Abrir um pool MySQL por teste seria caro (~500ms+ apenas connect). Solução: um `before()` top-level abre o handle uma vez; cada `make()` do factory faz `DELETE FROM` nas 3 tabelas (em ordem de FK reversa) antes de retornar o repo. Resultado: mesma garantia de isolamento que `:memory:` do SQLite, mas com 1 pool reusado para toda a suite.

### D-T3: CA-11 e CA-12 — constraints específicas do MySQL real

A suite contratual cobre o comportamento esperado do repo abstrato. Mas existem 2 invariantes que **só fazem sentido contra o DB real**:
- **CA-11 (UNIQUE sequential_number)**: o domínio nunca produz dois contratos com mesmo `sequentialNumber` em ambiente bem comportado, mas o adapter precisa rejeitar o caso. SQLite valida via `UNIQUE` constraint; MySQL idem. Teste insere 2 contratos com `sequentialNumber` colidindo e exige falha no 2º save.
- **CA-12 (upsert por id mantém integridade)**: o repo usa `onDuplicateKeyUpdate` (Drizzle MySQL). Teste sobrescreve mesmo `id` com `title` diferente; espera ler o novo título — proof de que o upsert atualizou e não criou row duplicada.

CA-12 também silenciosamente exercita a **transação atômica** declarada em D4 do request: a chamada `repo.save(c)` inclui `delete` + reinsert da junction table, tudo dentro de um `db.transaction(...)`.

### D-T4: CA-13 e CA-14 — buildMysqlContext lifecycle

Cobertos no mesmo arquivo `drizzle-mysql.test.ts` (não em arquivo separado da CLI) porque dependem do handle MySQL real. CA-13 valida shape do `CliContext` retornado; CA-14 valida que `shutdown()` fecha o pool sem throw. **Não** exercita comandos da CLI — isso é ticket #7.

### D-T5: Connection string fixa

Usamos `mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core` no test. A senha bate com o secret que `pnpm test:integration` (entregue em #3) escreve em `secrets/mysql_root_password.txt`. Documentado inline.

### D-T6: Opt-in via `MYSQL_INTEGRATION=1`

Padrão estabelecido no ticket #3. Todos os 10 CAs funcionais (CA-5 a CA-14) iniciam com:
```ts
if (!integrationEnabled()) { t.skip('MYSQL_INTEGRATION≠1'); return; }
```
em vez de `assert.fail(...)`. Em `pnpm test` default, todos os 10 fazem skip silencioso.

---

## CAs do `000-request.md` × testes

| CA | Test | Camada |
| :--- | :--- | :--- |
| CA-1 | `mysql-driver.test.ts:CA-1` | package.json check |
| CA-2 | `mysql-driver.test.ts:CA-2a/b` | import + shape |
| CA-3 | `drizzle-mysql.test.ts:CA-3` | import + shape |
| CA-4 | `drizzle-mysql.test.ts:CA-4` | import + shape |
| CA-5 | `mysql-driver.test.ts:CA-5` | runtime |
| CA-6 | `mysql-driver.test.ts:CA-6` | runtime |
| CA-7 | `mysql-driver.test.ts:CA-7` | runtime |
| CA-8 | `mysql-driver.test.ts:CA-8` | migrator idempotente |
| CA-9 | `drizzle-mysql.test.ts:runContractRepositoryContract` | suite contratual |
| CA-10 | `drizzle-mysql.test.ts:runAmendmentRepositoryContract` | suite contratual |
| CA-11 | `drizzle-mysql.test.ts:CA-11` | UNIQUE constraint |
| CA-12 | `drizzle-mysql.test.ts:CA-12` | upsert por id |
| CA-13 | `drizzle-mysql.test.ts:CA-13` | buildMysqlContext shape |
| CA-14 | `drizzle-mysql.test.ts:CA-14` | shutdown lifecycle |

---

## Próximo passo

Avançar para **W1 — GREEN**:
1. Instalar `mysql2@^3.11.0` via `pnpm add`.
2. Criar `src/.../drivers/mysql-driver.ts` com `openMysql`.
3. Criar `src/.../repos/contract-repository.drizzle-mysql.ts` e `amendment-repository.drizzle-mysql.ts`.
4. Refatorar `src/.../cli/drivers/mysql.ts` (deixa de ser stub).
5. Atualizar `context.ts` (CliContextError) e `main.ts` (exit codes).
6. Atualizar `package.json#scripts.test:integration` glob para incluir as novas suítes.
