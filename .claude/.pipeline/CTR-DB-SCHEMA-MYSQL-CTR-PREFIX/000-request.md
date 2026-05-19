# Ticket CTR-DB-SCHEMA-MYSQL-CTR-PREFIX: Schema MySQL — prefixo `ctr_*`, índices e CHECKs

> Documentação PT, identificadores EN (regra invariante).
> Segundo de 8 tickets derivados de [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).

## Contexto

[ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) §"Convenção de nomenclatura" determinou que tabelas do módulo Contracts ganham **prefixo `ctr_`** dentro do database `core`:

- `contracts` → `ctr_contracts`
- `amendments` → `ctr_amendments`
- `contract_homologated_amendments` → `ctr_contract_homologated_amendments`

Justificativa: ADR-0014 isola por database (`core` ≠ `legacy`), mas o prefixo deixa **explícito** qual módulo é dono mesmo em listagens (`SHOW TABLES FROM core`). Quando módulos futuros chegarem (`fin_*` para Financeiro), a convenção já está enraizada.

Em paralelo, o **DB audit consolidado** (relatório de "pente fino" do projeto, 2026-05-15) identificou findings que se materializam neste ticket:

- **F-H2** Critical: índice ausente em `amendments.contract_id` — toda query "lista aditivos do contrato X" faz full table scan
- **F-M2** Medium: índices ausentes em `contracts.status` e `contracts.signed_at` — relatórios/dashboards farão scan
- **F-L1** Low: redundância `endedAt` vs `status='Terminated'` sem CHECK forçando consistência
- **F-L2** Low: trio `homologatedAt/By/signedDocumentRef` de amendments tem dependência funcional implícita não enforced

Este ticket consolida tudo em **uma única passada no `schemas/mysql.ts`**: rename + índices + CHECKs compostos.

**`schemas/sqlite.ts` NÃO é tocado** — vai ser removido em `CTR-CLEANUP-SQLITE` (ticket #5 do ADR-0020). Manter o SQLite no estado atual evita conflito com a suite de testes que ainda roda contra `:memory:` SQLite até o cleanup.

## Princípio condutor

> **O schema MySQL é a fonte de verdade do estado vigente.** Cada decisão estrutural (nome de tabela, índice, CHECK constraint) é ancorada por uma necessidade real do domínio ou audit — não há "índice especulativo" (skill `database-engineer` §anti-padrões #3) nem "CHECK por convenção" sem invariante de negócio.

## Escopo

```
src/modules/contracts/adapters/persistence/schemas/mysql.ts   # Atualizar — rename + índices + CHECKs

tests/modules/contracts/adapters/persistence/schemas/
└── mysql.test.ts                                              # CRIAR — valida config via drizzle getTableConfig
```

## Fora de escopo

- **`schemas/sqlite.ts`** — não tocar. Vai pro `CTR-CLEANUP-SQLITE` (#5).
- **`drizzle.config.ts`** apontando MySQL + migration gerada — `CTR-DB-MIGRATION-MYSQL` (#3).
- **`mysql2` driver wired** — `CTR-DB-DRIVER-MYSQL` (#4).
- **Smart constructors `Title`/`Objective`/`Description`/`AmendmentNumber` enforçando limites de tamanho** — finding F-H1 do audit. Isso é mudança de **domínio**, fica em ticket separado `CTR-VO-STRING-LIMITS` (modelagem via skill `ts-domain-modeler`).
- **Charset/collation per-table** — server.cnf já enforça (D2 do ticket anterior). Drizzle 0.45.x não expõe API limpa para charset por tabela; documentar como deferido a "se necessário, customizar SQL na migration manualmente".
- **Mappers domain ↔ row** — continuam importando `schemas/sqlite.ts` até o cleanup. Troca para `schemas/mysql.ts` é parte do `CTR-CLEANUP-SQLITE`.

## Decisões de design

Cada decisão com **citação ancorando** (ADR, skill, audit finding).

### D1. Prefixo `ctr_` em todas as 3 tabelas

| Antes | Depois |
| :--- | :--- |
| `mysqlTable('contracts', ...)` | `mysqlTable('ctr_contracts', ...)` |
| `mysqlTable('amendments', ...)` | `mysqlTable('ctr_amendments', ...)` |
| `mysqlTable('contract_homologated_amendments', ...)` | `mysqlTable('ctr_contract_homologated_amendments', ...)` |

**Citação:** ADR-0020 §"Convenção de nomenclatura (decisão #2 de Gabriel)".

### D2. Renomear CHECKs existentes com prefixo

CHECKs herdam o prefixo da tabela para manter consistência (`SHOW CREATE TABLE` legível):

| Antes | Depois |
| :--- | :--- |
| `contracts_original_period_kind_chk` | `ctr_contracts_original_period_kind_chk` |
| `contracts_current_period_kind_chk` | `ctr_contracts_current_period_kind_chk` |
| `contracts_status_chk` | `ctr_contracts_status_chk` |
| `amendments_kind_chk` | `ctr_amendments_kind_chk` |
| `amendments_status_chk` | `ctr_amendments_status_chk` |

### D3. Índice em `amendments.contract_id` — fecha F-H2 (Critical)

**Citação:** MySQL 8.4 Refman §1.7.3.2 "FOREIGN KEY Constraints" — *"InnoDB requires that foreign key columns be indexed; if you create a table with a foreign key constraint but no index on a given column, an index is created."*

MySQL **cria o índice automaticamente** para FKs (ao contrário do SQLite, que não cria). Mas o audit F-H2 pediu o índice **explícito no schema** para garantir consistência semântica e clareza. Drizzle:

```ts
import { index } from 'drizzle-orm/mysql-core';

export const amendments = mysqlTable(
  'ctr_amendments',
  { /* colunas */ },
  (t) => [
    index('ctr_amendments_contract_id_idx').on(t.contractId),
    // ... outros checks
  ],
);
```

### D4. Índice em `contracts.status` — fecha F-M2 parcial

**Citação:** Ramakrishnan & Gehrke §8.2 (livro da vaca) — *"without an appropriate index, a selection on a non-key attribute forces a file scan"*.

Padrão de query previsto: dashboard "contratos vigentes" filtra `WHERE status = 'Active'`. Cardinalidade baixa (3 valores) mas o subset Active é pequeno em uma base madura (~5-20% após anos de uso). Índice composto `(status, signed_at)` é candidato natural, mas adicionar agora seria especulativo — fica com índice simples até padrão de query consolidar.

```ts
index('ctr_contracts_status_idx').on(t.status),
```

### D5. Índice em `contracts.signed_at` — fecha F-M2 parcial

Padrão de query previsto: relatórios temporais (`WHERE signed_at BETWEEN ...`). Índice simples; composto fica adiado.

```ts
index('ctr_contracts_signed_at_idx').on(t.signedAt),
```

### D6. CHECK composto `endedAt ↔ status='Terminated'` — fecha F-L1

**Invariante de negócio:** ADR (módulo Contratos handbook §StatusContrato) — contrato é `Terminated` se e somente se tem `endedAt`. Caminho atual: domínio garante via `terminate(contract, at)`; banco não tem garantia.

**Adicionar bicondicional:**

```ts
check(
  'ctr_contracts_terminated_iff_ended_at_chk',
  sql`(${t.status} = 'Terminated') = (${t.endedAt} IS NOT NULL)`,
),
```

A expressão `(A) = (B)` em MySQL retorna `1` se ambos são true ou ambos false (bicondicional). Defesa em profundidade — domínio não pode escapar pela borda.

> **Nota:** `Expired` também tem `endedAt`. Olhando o agregado `Contract` em `domain/contract/contract.ts`, **tanto `expire()` quanto `terminate()`** populam `endedAt`. Revisar: o CHECK deveria ser `endedAt IS NOT NULL ⟺ status IN ('Expired', 'Terminated')`? Sim.

**Versão final:**

```ts
check(
  'ctr_contracts_ended_at_consistency_chk',
  sql`(${t.endedAt} IS NOT NULL) = (${t.status} IN ('Expired', 'Terminated'))`,
),
```

### D7. CHECK composto homologation completeness — fecha F-L2

**Invariante de negócio:** Amendment com `status='Homologated'` tem **obrigatoriamente** `homologatedAt`, `homologatedBy` e `signedDocumentRef`. Caminho atual: domínio garante via `homologate(amendment, by, at)`; banco não tem garantia.

**Adicionar implicação via OR lógica:**

```ts
check(
  'ctr_amendments_homologation_completeness_chk',
  sql`
    ${t.status} <> 'Homologated'
    OR (
      ${t.homologatedAt} IS NOT NULL
      AND ${t.homologatedBy} IS NOT NULL
      AND ${t.signedDocumentRef} IS NOT NULL
    )
  `,
),
```

Equivalente lógico de `status='Homologated' ⟹ (homologatedAt AND homologatedBy AND signedDocumentRef)`.

### D8. Charset/collation per-table — **deferido**

Drizzle 0.45.x não expõe API estável para charset/collation por `mysqlTable`. O `server.cnf` (D2 do ticket #1) já enforça `utf8mb4` + `utf8mb4_unicode_ci` como **default global do servidor**, e o init script `01-databases-and-users.sh` redundantemente força no `CREATE DATABASE core`.

**Decisão:** não tentar customizar via `sql.raw()` neste ticket. Confiar no default do server.cnf. Se for necessário no futuro (ex.: shared MySQL com outras orgs e charset divergente), abrir ADR/ticket dedicado.

### D9. Limites de string via CHECK — **deferido para `CTR-VO-STRING-LIMITS`**

F-H1 do audit pediu enforcement de tamanho. Hoje o schema MySQL já tem `VARCHAR(N)` com N definido (255, 1000, 32, 16). O MySQL **rejeita** insert com string > N (`STRICT_ALL_TABLES` no sql_mode amplifica — vira erro, não truncamento silencioso). Está coberto pelo lado do DB.

O que falta é **validação no domínio** (smart constructor de `Title` etc.). Isso é mudança em `src/modules/contracts/domain/shared/` — fora deste ticket de schema.

## Critérios de aceite (CA)

Validados em `tests/modules/contracts/adapters/persistence/schemas/mysql.test.ts` usando `getTableConfig` de `drizzle-orm/mysql-core`.

### Nome de tabela (CA-1)

- [ ] **CA-1a** `getTableConfig(contracts).name === 'ctr_contracts'`
- [ ] **CA-1b** `getTableConfig(amendments).name === 'ctr_amendments'`
- [ ] **CA-1c** `getTableConfig(contractHomologatedAmendments).name === 'ctr_contract_homologated_amendments'`

### Índices (CA-2 a CA-4)

- [ ] **CA-2** índice `ctr_amendments_contract_id_idx` existe em `amendments` e cobre `contract_id` (F-H2)
- [ ] **CA-3** índice `ctr_contracts_status_idx` existe em `contracts` e cobre `status` (F-M2)
- [ ] **CA-4** índice `ctr_contracts_signed_at_idx` existe em `contracts` e cobre `signed_at` (F-M2)

### CHECKs herdados (CA-5)

- [ ] **CA-5a** CHECK `ctr_contracts_original_period_kind_chk` existe
- [ ] **CA-5b** CHECK `ctr_contracts_current_period_kind_chk` existe
- [ ] **CA-5c** CHECK `ctr_contracts_status_chk` existe
- [ ] **CA-5d** CHECK `ctr_amendments_kind_chk` existe
- [ ] **CA-5e** CHECK `ctr_amendments_status_chk` existe

### CHECKs novos (CA-6 a CA-7)

- [ ] **CA-6** CHECK `ctr_contracts_ended_at_consistency_chk` existe e enforça `endedAt IS NOT NULL ⟺ status IN ('Expired','Terminated')` (F-L1)
- [ ] **CA-7** CHECK `ctr_amendments_homologation_completeness_chk` existe e enforça `status='Homologated' ⟹ (homologatedAt AND homologatedBy AND signedDocumentRef)` (F-L2)

### Constraints estruturais (CA-8 a CA-10)

- [ ] **CA-8** PK de `ctr_contract_homologated_amendments` é composta `(contract_id, amendment_id)`
- [ ] **CA-9** FK `ctr_amendments.contract_id → ctr_contracts.id` existe
- [ ] **CA-10** Unique constraint `ctr_contracts.sequential_number` existe

## Plano de waves

| Wave | Entregas |
| :--- | :--- |
| **W0 RED** | `mysql.test.ts` com os 14 CAs falhando (tabelas ainda com nomes antigos, índices ausentes, CHECKs F-L1/F-L2 ausentes) |
| **W1 GREEN** | `schemas/mysql.ts` refactor: rename + 3 índices + 2 CHECKs novos. 14/14 CAs verdes. |
| **W2 REVIEW** | Audit via skill `code-reviewer`: nomes de CHECK consistentes, bicondicionais lógicas corretas, sem índice especulativo |
| **W3 QUALITY** | 4 gates verdes + suite completa (zero regressão; mappers continuam funcionando porque importam `schemas/sqlite.ts` até o cleanup) |

## Conformidade

- ADR-0020 §"Convenção de nomenclatura" → D1, D2
- ADR-0014 §"Charset/Collation" → D8 (deferido, coberto pelo server.cnf)
- DB Audit F-H2 → D3
- DB Audit F-M2 → D4, D5
- DB Audit F-L1 → D6
- DB Audit F-L2 → D7
- DB Audit F-H1 → D9 (deferido, coberto pelo MySQL `STRICT_ALL_TABLES`)
- Skill `database-engineer` §anti-padrões #3 ("índice especulativo") → todos os índices são justificados por padrão de query previsto
- Skill `database-engineer` §casos especiais #1 ("schema novo do zero" — Passo 6: índices só depois de mapear queries reais) → cumprido

## Dependências novas

**Nenhuma.** Drizzle ORM já está no `package.json`; usamos `getTableConfig` que é parte do `drizzle-orm/mysql-core` já instalado.

## Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Mappers em `mappers/contract.mapper.ts` etc. importam de `schemas/sqlite.ts` — rename do MySQL não afeta os mappers | Verificar antes de W1 que nenhum import quebra; confirmar em W3 com suite completa verde |
| `getTableConfig` API pode mudar entre versões do Drizzle | Pinning de versão `drizzle-orm@^0.45.2` no `package.json` — release minor não quebra API documentada |
| CHECK composto bicondicional usa `(A) = (B)` — sintaxe MySQL-específica | Comentar inline; aceitável porque ADR-0020 estabeleceu MySQL como único dialeto |
| MySQL `STRICT_ALL_TABLES` em prod converte truncation em erro — VARCHAR(N) com N pequeno demais quebra inserts legítimos | Limites atuais (255/1000/32/16) já estão calibrados para domínio. Audit não pediu aumentar. |

## Tickets sucessores

3. `CTR-DB-MIGRATION-MYSQL` — `drizzle.config.ts` aponta MySQL + primeira migration gerada
4. `CTR-DB-DRIVER-MYSQL` — wire `mysql2` + resolver F-C1 + F-C2
5. `CTR-CLEANUP-SQLITE` — remover `schemas/sqlite.ts`, ajustar mappers/repos para importar de `schemas/mysql.ts`
6. `CTR-DOCKERFILE-MYSQL` — Dockerfile sem `better-sqlite3` toolchain C++
7. `CTR-CLI-MYSQL-SMOKE` — `--driver mysql` + E2E real
8. `CTR-DOCS-UPDATE-FOR-ADR-0020` — `CLAUDE.md` + 8 SKILL.md
9. `CTR-COMPOSE-POLISH` (futuro) — I-2 do W2 review #1 + S-1..S-4

## Referências

- [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) — MySQL único, convenção `ctr_*`
- [ADR-0014](../../../../handbook/architecture/adr/0014-mysql-database-isolation.md) — Isolamento por database, charset
- [DB Audit Report] — findings F-H1, F-H2, F-M2, F-L1, F-L2 (sessão "pente fino" 2026-05-15)
- [Skill `database-engineer`](../../skills/database-engineer/SKILL.md) — workflow + anti-padrões
- [Drizzle ORM — MySQL Core](https://orm.drizzle.team/docs/sql-schema-declaration#tables) — `mysqlTable`, `index`, `check`
- MySQL 8.4 Refman §1.7.3.2 — FK constraints + auto-index
- Ramakrishnan & Gehrke §8.2 — índice vs file scan
