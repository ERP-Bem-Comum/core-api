# W3 — QUALITY — CTR-DB-MIGRATION-MYSQL

**Wave:** W3 (QUALITY)
**Skill:** `pnpm test` + Docker integration + ts-quality-checker
**Data:** 2026-05-15
**Status:** ✅ COMPLETED — 14/14 CAs GREEN no `test:integration`, todos os gates clean

---

## Sumário

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ exit 0 (sem erros) |
| `pnpm run lint` | ✅ exit 0 (sem warnings) |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm test` (default, sem Docker required) | ✅ 431 pass / 0 fail / 5 skipped (CA-10..14 opt-out via env) |
| `pnpm test:integration` (com Docker MySQL real) | ✅ 14 pass / 0 fail — TODOS os CAs do ticket |

---

## CAs do `000-request.md` — status final

| CA | Camada | Status | Anchor |
| :--- | :--- | :---: | :--- |
| CA-1 | drizzle.mysql.config.ts existe | ✅ | `drizzle.mysql.config.ts` |
| CA-2 | package.json script | ✅ | `package.json#scripts.db:generate:mysql` |
| CA-3 | migration `0000_*.sql` existe | ✅ | `migrations/mysql/0000_superb_inhumans.sql` |
| CA-4 | 3 tabelas ctr_* | ✅ | regex sobre SQL |
| CA-5 | 3 índices declarados | ✅ | regex sobre SQL |
| CA-6 | 7 CHECKs (5 + F-L1 + F-L2) | ✅ | regex sobre SQL |
| CA-7 | FK contract_id | ✅ | regex sobre SQL |
| CA-8 | UNIQUE sequential_number | ✅ | regex sobre SQL |
| CA-9 | PK composta | ✅ | regex sobre SQL |
| CA-10 | apply migration retorna exit 0 | ✅ | `docker exec` + `sed` + `mysql` |
| CA-11 | 3 tabelas em `INFORMATION_SCHEMA.tables` | ✅ | E2E query |
| CA-12 | 7 CHECKs em `INFORMATION_SCHEMA.check_constraints` | ✅ | E2E query |
| CA-13 | INSERT viola F-L1 é rejeitado | ✅ | erro 3819 / "check constraint violated" |
| CA-14 | INSERT viola F-L2 é rejeitado | ✅ | erro 3819 / "check constraint violated" |

---

## Bugs descobertos no W3 + correções aplicadas

O W2 do reviewer havia identificado a Suggestion **S-1** ("CA-10..14 fazem `assert.fail` quando Docker indisponível — torna o teste frágil"). Ao tentar exercitar os CAs funcionais pela primeira vez no W3, descobri **3 bugs reais bloqueantes** que invalidavam a aplicação da migration mesmo com Docker up.

### Bug #1 — `mysql` CLI default tenta socket Unix inexistente

**Sintoma:**
```
ERROR 2002 (HY000): Can't connect to local MySQL server through socket '/var/run/mysqld/mysqld.sock' (2)
```

**Diagnóstico:** o `mysql` CLI sem `-h` ou `--protocol=tcp` tenta socket Unix. Container oficial `mysql:8.4` não expõe o socket nesse path; só TCP em `127.0.0.1:3306`.

**Correção:** introduzir constante `MYSQL_CLI_FLAGS = '--protocol=tcp -h 127.0.0.1 -uroot -p"…"'` e reutilizar em `dockerExecRoot()` e `applyMigration()`.

**Arquivo:linha:** `tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts:118-129`

### Bug #2 — `--> statement-breakpoint` quebra o `mysql` CLI

**Sintoma:**
```
ERROR 1064 (42000) at line 26: You have an error in your SQL syntax;
near '--> statement-breakpoint
CREATE TABLE `ctr_contract_homologated_amendments`'
```

**Diagnóstico:** drizzle-kit emite `--> statement-breakpoint` como sentinel semântico entre statements. O `drizzle-orm/mysql2/migrator` (ticket #4, ainda não wired) sabe interpretar; o `mysql` CLI lê literalmente como SQL inválido.

A primeira tentativa de filtragem (`grep -v '^--> statement-breakpoint'`) cobria **linhas standalone** mas falhava em ocorrências **no final de linhas após `;`**, como:
```sql
ALTER TABLE ... ON UPDATE no action;--> statement-breakpoint
```

**Correção:** trocar `grep -v` por `sed -e 's|--> statement-breakpoint||g'`, que remove TODAS as ocorrências (standalone E inline) sem dependência de posição.

**Arquivo:linha:** `tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts:131-144`

### Bug #3 — Schema (ticket #2) gerava nomes de FK > 64 chars

**Sintoma:**
```
ERROR 1059 (42000) at line 58: Identifier name
'ctr_contract_homologated_amendments_contract_id_ctr_contracts_id_fk' is too long
```

**Diagnóstico:** drizzle-kit forma nomes de FK como `<table>_<col>_<reftable>_<refcol>_fk`. Para a junction table `ctr_contract_homologated_amendments` (já com 35 chars), isso gerava nomes de 67 e 69 chars — ambos acima do limite **64** do MySQL para identificadores.

Esse bug estava **latente** no schema entregue no ticket #2 (`CTR-DB-SCHEMA-MYSQL-CTR-PREFIX`) e só apareceu agora porque é a primeira vez que se aplica a migration contra um MySQL real. Ele não foi detectado pelos testes via `getTableConfig` do ticket #2 porque o limite de 64 chars só é validado pelo **server** MySQL, não pelo schema TS.

**Correção:** no `schemas/mysql.ts`, substituir o atalho `.references(() => ...)` por `foreignKey({ name, columns, foreignColumns })` explícito com nomes curtos:
- `ctr_chom_amends_contract_fk` (27 chars)
- `ctr_chom_amends_amendment_fk` (28 chars)

Após a mudança, deletei `0000_lyrical_machine_man.sql` e o `meta/` antigo, e regenerei: o novo arquivo é `0000_superb_inhumans.sql` (rebaseline).

**Arquivos modificados:**
- `src/modules/contracts/adapters/persistence/schemas/mysql.ts:23-32` (import `foreignKey`)
- `src/modules/contracts/adapters/persistence/schemas/mysql.ts:147-167` (junction table com FK explícita)

**Por que esse fix não é "code drift" do ticket #2:** o schema **declarado** continua tendo as duas FKs com a mesma semântica (`contract_id → ctr_contracts.id`, `amendment_id → ctr_amendments.id`). Só os **nomes das constraints** mudaram de "default longo" para "explícito curto". Constraint name é metadado para `SHOW CREATE TABLE`/`INFORMATION_SCHEMA`, não afeta clustering, FK enforcement, nem a query plan. Decisão consciente, documentada em comentário inline (`schemas/mysql.ts:151-154`).

---

## Decisão arquitetural — `MYSQL_INTEGRATION=1` opt-in

Endereçando a S-1 do reviewer ("`assert.fail` vs `t.skip` quando Docker indisponível"), apliquei uma decisão mais ambiciosa: **tornar os CAs funcionais opt-in via env var `MYSQL_INTEGRATION=1`**.

### Motivação

Durante o W3 descobri que ter `mysql.test.ts` (migration) e `mysql-compose.test.ts` (ticket #1) **ambos** gerenciando o lifecycle do compose causa interferência mútua — o `docker compose down -v` de um teste destrói o ambiente do outro quando rodados em paralelo no `pnpm test`.

### Solução implementada

1. **Test migration ficou PASSIVO**: não invoca mais `composeUp`/`composeDown`. Assume um container `core-api-mysql` healthy externo. Se não estiver presente OU se `MYSQL_INTEGRATION≠1`, todos os CA-10..14 fazem `t.skip()`.
2. **Novo target `pnpm test:integration`** orquestra: cria secrets dummy → `docker compose up -d mysql --wait` → `MYSQL_INTEGRATION=1 node --test 'tests/.../migrations/*.test.ts'` → cleanup (`compose down -v` + remove secrets). Atômico, idempotente, e isolado dos demais testes.
3. **`pnpm test` default**: ignora os 5 CAs funcionais (skip), mantém os 9 estruturais sempre verdes. Permite que desenvolvedor sem Docker rode `pnpm test` sem ruído.

### Benefícios

- **CI**: `pnpm test` é rápido e determinístico (sem dependência de Docker daemon); `pnpm test:integration` é o gate de aceitação completo.
- **Dev local**: `pnpm test` funciona offline; quem quer validar a migration roda `pnpm test:integration`.
- **Isolamento**: zero conflito com `mysql-compose.test.ts` (que continua gerindo seu próprio lifecycle para testar o compose itself).

**Arquivos modificados:**
- `package.json:19-20` (novos scripts `test` e `test:integration`)
- `tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts:201-232` (before com opt-in env var)
- `tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts:235-385` (CAs com `(t)` parameter e `t.skip()`)

---

## Artefatos finais entregues (ticket inteiro)

| Arquivo | Tipo | Razão |
| :--- | :--- | :--- |
| `drizzle.mysql.config.ts` | novo | Config Drizzle para MySQL paralelo ao SQLite. |
| `tsconfig.json` (+1 entry) | modificado | `drizzle.mysql.config.ts` incluído no project. |
| `package.json` (+2 scripts) | modificado | `db:generate:mysql` + `test:integration`. |
| `src/modules/contracts/adapters/persistence/schemas/mysql.ts` | modificado | FKs explícitas na junction table (fix bug #3). |
| `src/modules/contracts/adapters/persistence/migrations/mysql/0000_superb_inhumans.sql` | novo (gerado) | Migration MySQL completa. |
| `src/modules/contracts/adapters/persistence/migrations/mysql/meta/_journal.json` | novo (gerado) | Journal do drizzle-kit. |
| `src/modules/contracts/adapters/persistence/migrations/mysql/meta/0000_snapshot.json` | novo (gerado) | Snapshot baseline. |
| `tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts` | novo | 14 CAs (9 estruturais + 5 funcionais opt-in). |

---

## Suggestions do W2 — status

| # | Suggestion | Status |
| :-- | :--- | :---: |
| S-1 | `assert.fail` vs `t.skip` em CA-10..14 sem Docker | ✅ Resolvido neste W3 (opt-in `MYSQL_INTEGRATION=1`) |
| S-2 | `tsconfig.json` include para satisfazer typescript-eslint | ⏸ Não-blocker; manter como está |
| S-3 | Nome aleatório `0000_*.sql` do drizzle-kit | ⏸ Mantido (D5 do request explícito) |
| S-4 | `meta/0000_snapshot.json` committed | ⏸ Behavior esperado; mantido |
| S-5 | Forma `(A) = (B)` em F-L1 vs forma expandida | ⏸ Não-blocker; documentação inline já cobre |
| S-6 | Escape do helper `dockerExecRoot` via shell | ⏸ Não-blocker; SQLs literais controlados |

Apenas S-1 era acionável no W3; foi endereçada. As demais ficam para follow-ups conforme triagem do reviewer.

---

## Conclusão

Ticket pronto para commit. Conteúdo do commit semântico sugerido:

```
feat(contracts/persistence): MySQL migration via drizzle-kit + harness E2E

- drizzle.mysql.config.ts e script pnpm db:generate:mysql
- migration 0000_superb_inhumans.sql (3 tables, 3 indexes, 3 FKs, 7 CHECKs)
- FKs explícitas na junction table (fix nomes > 64 chars do MySQL)
- 14 CAs cobertos: 9 estruturais (regex) + 5 funcionais E2E (docker exec)
- pnpm test:integration orquestra compose + suite com isolamento total
- MYSQL_INTEGRATION=1 opt-in em CA-10..14 (resolve S-1 do review)

Pipeline: W0→W1→W2→W3 (1 review round, APPROVED)
Closes ticket CTR-DB-MIGRATION-MYSQL (#3 da sequência ADR-0020).
```

Aguardando aprovação do usuário para commit.
