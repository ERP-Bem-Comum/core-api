---
name: drizzle-schema-author
description: >
  Modelagem aplicada de schemas Drizzle 0.45.x em `mysql-core` para o core-api.
  Define `mysqlTable`, colunas, índices (`index`, `uniqueIndex`), `primaryKey`,
  `foreignKey`, `check`, generated columns e exporta `$inferSelect`/`$inferInsert`
  respeitando integralmente ADR-0020 (MySQL como dialeto único, lista normativa de
  features permitidas/proibidas), ADR-0014 (isolamento por prefixo `ctr_*`/`fin_*`)
  e ADR-0018 (mapeamentos canônicos: UUID em varchar(36), Money em bigint cents,
  Period decomposto, sem JSON, sem ENUM, sem AUTO_INCREMENT em PK de domínio).
  SKILL CANÔNICA para `src/modules/*/adapters/persistence/schemas/*.ts`.
---

# drizzle-schema-author

## Persona

Você é **modelador(a) de schema Drizzle/MySQL** focado em **uma tarefa** — produzir o arquivo `schemas/mysql.ts` certo para o módulo, com tipos de coluna corretos, índices justificados, FKs nomeadas, CHECKs de defesa em profundidade, e geração de SQL auditada.

> **Fronteira:** edita apenas `src/modules/<modulo>/adapters/persistence/schemas/*.ts`. Não toca repos, mappers, domain ou ports. Quem invoca: [`drizzle-orm-expert`](../../agents/drizzle-orm-expert.md) (via [`contratos-orchestrator`](../../agents/contratos-orchestrator.md)).

---

## Source of Truth (citar sempre)

| Tópico                          | Reference local                                                                                                           |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------ |
| Tipos de coluna MySQL           | [`handbook/reference/drizzle/column-types/mysql.mdx`](../../../handbook/reference/drizzle/column-types/mysql.mdx)         |
| Declaração de schema SQL-like   | [`handbook/reference/drizzle/sql-schema-declaration.mdx`](../../../handbook/reference/drizzle/sql-schema-declaration.mdx) |
| Multi-schema / isolation        | [`handbook/reference/drizzle/schemas.mdx`](../../../handbook/reference/drizzle/schemas.mdx)                               |
| Índices e constraints           | [`handbook/reference/drizzle/indexes-constraints.mdx`](../../../handbook/reference/drizzle/indexes-constraints.mdx)       |
| Generated columns               | [`handbook/reference/drizzle/generated-columns.mdx`](../../../handbook/reference/drizzle/generated-columns.mdx)           |
| Custom types (raro)             | [`handbook/reference/drizzle/custom-types.mdx`](../../../handbook/reference/drizzle/custom-types.mdx)                     |
| `getTableConfig`/`$inferSelect` | [`handbook/reference/drizzle/goodies.mdx`](../../../handbook/reference/drizzle/goodies.mdx)                               |
| Get-started MySQL               | [`handbook/reference/drizzle/get-started-mysql.mdx`](../../../handbook/reference/drizzle/get-started-mysql.mdx)           |
| Limitações / pegadinhas         | [`handbook/reference/drizzle/gotchas.mdx`](../../../handbook/reference/drizzle/gotchas.mdx)                               |

### ADRs vinculantes

- [ADR-0013](../../../handbook/architecture/adr/0013-mysql-database-engine.md) — MySQL 8.4 + InnoDB.
- [ADR-0014](../../../handbook/architecture/adr/0014-mysql-database-isolation.md) — Isolamento por prefixo (`ctr_*`, `fin_*`, `outbox`).
- [ADR-0015](../../../handbook/architecture/adr/0015-mysql-outbox-pattern.md) — Outbox no mesmo schema do módulo.
- [ADR-0018](../../../handbook/architecture/adr/0018-persistence-dual-dialect-drizzle.md) — Mapeamentos canônicos (UUID/Money/Period).
- [ADR-0020](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) — Lista normativa de features SQL permitidas/proibidas.

Quando handbook e código divergem, **handbook vence**. Quando ADR e handbook divergem, **ADR vence**.

---

## Princípios

1. **Um schema por módulo.** `src/modules/<modulo>/adapters/persistence/schemas/mysql.ts`. Não fragmentar por entidade.
2. **Prefixo no nome físico.** `mysqlTable('ctr_contracts', ...)`. Sempre. Mesmo se óbvio.
3. **Nome físico ≠ nome TS.** TS exporta `contracts`; SQL tem `ctr_contracts`. Drizzle faz o mapeamento.
4. **Cada decisão de coluna tem fonte citável.** Em comentário no `.ts`: por que `varchar(16)`? Por que `bigint(mode: 'number')`? Por que esse índice?
5. **Defesa em profundidade nos `check`.** Invariantes do domínio já validados pelos smart constructors podem ser re-afirmados como `CHECK` — não substituem domain validation.
6. **Índices são justificados por query alvo**, não por intuição. Cada `index(...)` documenta o WHERE/JOIN/ORDER BY que ele cobre.
7. **`$inferSelect` e `$inferInsert` são contrato.** Os mappers consomem esses tipos; não exportá-los é dívida.

---

## Mapeamentos canônicos (ADR-0018 + ADR-0020)

| Conceito de domínio        | Coluna Drizzle                                                                       | Por quê                                                 |
| :------------------------- | :----------------------------------------------------------------------------------- | :------------------------------------------------------ |
| **ID (UUID v4)**           | `varchar('id', { length: 36 }).primaryKey().notNull()`                               | Legibilidade; sem `int auto-inc` em PK de domínio       |
| **Money (cents)**          | `bigint('valor_cents', { mode: 'number' }).notNull()`                                | `decimal` desperdiça; JSON proibido                     |
| **Currency** (se aplica)   | `char('currency', { length: 3 }).notNull()`                                          | ISO-4217 fixo                                           |
| **Period (Fixed)**         | `*_start datetime(fsp:3)`, `*_end datetime(fsp:3)`, `*_kind varchar(16)`             | Decomposto; sem JSON                                    |
| **Period (Indefinite)**    | `*_end = NULL` + `*_kind = 'Indefinite'`                                             | Sem flag boolean redundante                             |
| **Timestamp UTC**          | `datetime('created_at', { mode: 'date', fsp: 3 }).notNull()`                         | `timestamp` MySQL tem tz implícito                      |
| **Enum de domínio**        | `varchar('status', { length: 16 }).notNull()` + `check(..., sql\`status IN (...)\`)` | `mysqlEnum` proibido (ADR-0018/0020)                    |
| **Soft FK (cross-modulo)** | `varchar(36)` **sem `references()`**; valida no outbox                               | Cross-módulo via evento, não FK física (ADR-0014)       |
| **FK intra-módulo**        | `foreignKey({...}).onDelete('restrict').onUpdate('restrict')`                        | Padrão; `cascade` somente com justificativa documentada |
| **Texto livre curto**      | `varchar(255)`                                                                       | Limite explícito                                        |
| **Texto livre longo**      | `varchar(1000)` (até ~1k chars) ou `text` (justificar)                               | `text` exige índice prefixed                            |

### Proibido sem ADR

- `json('...')` colunas, `JSON_EXTRACT` — [ADR-0020](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).
- `mysqlEnum(...)` — usar `varchar` + `check`.
- `serial`/`int().autoincrement()` em PK de domínio.
- `decimal(...)` para Money.
- `point`, `geometry` (tipos espaciais).
- Stored procedures, triggers — não emitidos pelo Drizzle Kit, mas vetar em SQL manual também.

---

## Convenção de nomes (ADR-0020 §"Convenção")

| Artefato    | Padrão                              | Exemplo                                |
| :---------- | :---------------------------------- | :------------------------------------- |
| Tabela      | `<prefixo>_<entidade_plural_snake>` | `ctr_contracts`, `ctr_amendments`      |
| Coluna      | `snake_case`                        | `original_value_cents`, `signed_at`    |
| Índice      | `<tabela>_<colunas>_idx`            | `ctr_amendments_contract_id_idx`       |
| Único       | `<tabela>_<colunas>_uniq`           | `ctr_contracts_sequential_number_uniq` |
| FK          | `<tabela>_<col>_fk`                 | `ctr_amendments_contract_id_fk`        |
| CHECK       | `<tabela>_<descricao>_chk`          | `ctr_contracts_status_chk`             |
| PK composta | `<tabela>_pk`                       | `outbox_events_pk`                     |

**Nomes explícitos sempre** — Drizzle gera nomes automáticos caso você omita, mas ficam ilegíveis em `SHOW CREATE TABLE` e em migrations. Para auditoria de prod, o nome importa.

---

## Workflow (modelar tabela do zero)

1. **Confirmar o domínio.** Ler o tipo TS do agregado/VO em `src/modules/<modulo>/domain/`. O schema é espelho da forma persistível do agregado, não um modelo livre.
2. **Listar queries-alvo.** Quais `findById`, `findBy<X>`, `listBy<Y>` o repo expõe? Cada query alvo decide um índice.
3. **Listar invariantes do domínio** que valem re-afirmar como `CHECK` (defesa em profundidade). Exemplo: `status IN ('Pending', 'Homologated')`.
4. **Esboçar o `mysqlTable(...)`** com cada coluna + comentário sustentando o tipo escolhido (citar ADR/handbook).
5. **Adicionar índices, FKs, CHECKs** no callback `(t) => [...]`.
6. **Exportar tipos:**
   ```ts
   export type ContractRow = typeof contracts.$inferSelect;
   export type NewContractRow = typeof contracts.$inferInsert;
   ```
7. **Rodar `pnpm db:generate`.**
8. **Auditar o SQL emitido** em `migrations/mysql/NNNN_*.sql`:
   - Conferir tipos (`varchar(36)` vs `varchar(255)` etc).
   - Conferir nomes (todos batem com a convenção?).
   - **Inserir manualmente** `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` em todo `CREATE TABLE` novo.
   - **Inserir manualmente** `COLLATE utf8mb4_bin` em qualquer coluna UUID nova (PK, FK, refs).
   - Limitação documentada em `schemas/mysql.ts` (ver código atual: `Drizzle 0.45.x não expõe charset/collate em table-level`).
9. **Rodar testes** (`pnpm test` + `pnpm test:integration` se aplicável).
10. **Atualizar `STATE.md`** do ticket: o que foi modelado, quais ADRs sustentam.

---

## Template canônico (espelho do código atual de Contracts)

```ts
// src/modules/<modulo>/adapters/persistence/schemas/mysql.ts
// Schema MySQL — alinhado com ADR-0020 (MySQL como único dialeto).
//
// Convenção de nomes (ADR-0020 §"Convenção"):
//   - Tabelas: prefixo `<modulo>_*` dentro do database `core`.
//   - Índices: `<tabela>_<col>_idx`.
//   - FKs: `<tabela>_<col>_fk`.
//   - CHECKs: `<tabela>_<descricao>_chk`.
//
// ⚠️ CHARSET/COLLATE — aplicado em SQL manual (limitação Drizzle 0.45.x)
//   Drizzle não expõe `charset`/`collate` em table-level. Insira manualmente
//   na migration gerada:
//     - Por tabela: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
//     - Em UUIDs (id, FKs UUID): `COLLATE utf8mb4_bin`

import {
  bigint,
  check,
  datetime,
  foreignKey,
  index,
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const contracts = mysqlTable(
  'ctr_contracts',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    sequentialNumber: varchar('sequential_number', { length: 16 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    // Money cents: ADR-0018 §"Mapeamentos canônicos" — bigint cents, nunca decimal/JSON
    originalValueCents: bigint('original_value_cents', { mode: 'number' }).notNull(),
    signedAt: datetime('signed_at', { mode: 'date', fsp: 3 }).notNull(),
    endedAt: datetime('ended_at', { mode: 'date', fsp: 3 }), // nullable: status terminal
  },
  (t) => [
    // CHECK: defesa em profundidade (domain valida primeiro)
    check('ctr_contracts_status_chk', sql`${t.status} IN ('Active','Expired','Terminated')`),
    // Índice: query "listar contratos ativos" (status mais seletivo + WHERE comum)
    index('ctr_contracts_status_idx').on(t.status),
    // Índice: queries temporais por data de assinatura
    index('ctr_contracts_signed_at_idx').on(t.signedAt),
  ],
);

export const amendments = mysqlTable(
  'ctr_amendments',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    contractId: varchar('contract_id', { length: 36 }).notNull(),
    // ... demais colunas
  },
  (t) => [
    // FK intra-módulo — onDelete restrict é o padrão; documentar exceção
    foreignKey({
      name: 'ctr_amendments_contract_id_fk',
      columns: [t.contractId],
      foreignColumns: [contracts.id],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    // Índice: query findByContractId (cobertura da FK)
    index('ctr_amendments_contract_id_idx').on(t.contractId),
  ],
);

// Tipos do schema — consumidos pelos mappers
export type ContractRow = typeof contracts.$inferSelect;
export type NewContractRow = typeof contracts.$inferInsert;
export type AmendmentRow = typeof amendments.$inferSelect;
export type NewAmendmentRow = typeof amendments.$inferInsert;
```

---

## Heurísticas rápidas

- **Coluna nullable na `$inferInsert` mas obrigatória no domínio** ⇒ revisitar `.notNull()`.
- **`unique()` em coluna isolada** ⇒ ok para PK alternada; em compostos use `uniqueIndex('..._uniq').on(t.a, t.b)`.
- **FK sem índice** ⇒ MySQL cria automaticamente, mas declare explicitamente para auditoria (`ctr_x_y_idx`).
- **3+ colunas no WHERE da query alvo** ⇒ índice composto na ordem **mais seletiva → menos seletiva**.
- **`text` em vez de `varchar(N)` sem motivo** ⇒ rejeitar; `text` requer índice prefixed em MySQL e perde no buffer pool.
- **`datetime` sem `fsp: 3`** ⇒ rejeitar; padrão do projeto é milissegundo.
- **Coluna que recebe JSON serializado** ⇒ `varchar(N)` ou `text` com tamanho declarado, **nunca** `json()`.

---

## Checklist de qualidade

- [ ] Arquivo é único por módulo (`schemas/mysql.ts`).
- [ ] Toda tabela tem prefixo do módulo (`ctr_*`, `fin_*`, `outbox`).
- [ ] Toda coluna não-óbvia tem comentário citando ADR/handbook.
- [ ] Toda FK tem nome explícito + `onDelete`/`onUpdate` documentado.
- [ ] Todo índice tem nome explícito + comentário com a query alvo.
- [ ] Todo CHECK tem nome explícito + sustenta um invariante do domínio.
- [ ] `$inferSelect` e `$inferInsert` exportados.
- [ ] Zero `json`, `mysqlEnum`, `serial`, `decimal`-para-Money, `timestamp`-para-instante UTC.
- [ ] SQL emitido por `pnpm db:generate` revisado linha-a-linha.
- [ ] CHARSET/COLLATE inserido manualmente nas tabelas e colunas UUID novas.
- [ ] Testes (`tests/.../schema-*.test.ts` se aplicável) passando.

---

## Anti-padrões

| ❌ Errado                                                             | ✅ Certo                                                                                  |
| :-------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| `mysqlEnum('status', ['A', 'B'])`                                     | `varchar('status', { length: 16 })` + `check(..., sql\`... IN ('A','B')\`)`               |
| `json('payload')`                                                     | `varchar('payload', { length: <N> })` ou `text('payload')` com tamanho documentado        |
| `int('id').autoincrement().primaryKey()` (em entidade de domínio)     | `varchar('id', { length: 36 }).primaryKey()` (UUID v4 gerado no domínio)                  |
| `decimal('value', { precision: 18, scale: 2 })`                       | `bigint('value_cents', { mode: 'number' })`                                               |
| `timestamp('created_at')`                                             | `datetime('created_at', { mode: 'date', fsp: 3 })`                                        |
| Tabela sem prefixo do módulo: `mysqlTable('contracts', ...)`          | `mysqlTable('ctr_contracts', ...)`                                                        |
| Índice sem nome: `index().on(t.status)`                               | `index('ctr_contracts_status_idx').on(t.status)`                                          |
| FK sem nome e sem onDelete: `foreignKey({ columns, foreignColumns })` | `foreignKey({ name, columns, foreignColumns }).onDelete('restrict').onUpdate('restrict')` |
| Schema fragmentado: `contracts.ts`, `amendments.ts`                   | `mysql.ts` único por módulo                                                               |
| Esquecer `$inferSelect`/`$inferInsert`                                | Exportá-los — mappers dependem disso                                                      |
| Tocar `meta/_journal.json` manualmente                                | Regenerar via `pnpm db:generate`                                                          |

---

## Como esta skill se relaciona com outras

```
ts-domain-modeler   (modela o tipo do agregado em domain/)
       ▼
drizzle-schema-author ◄── você está aqui  (espelha o agregado em schemas/mysql.ts)
       │
       ▼
drizzle-orm-expert  (audita o output, escreve os repos e mappers)
       │
       ▼
mysql-database-expert (audita índice/FK/CHECK do ponto de vista MySQL puro)
```

---

## Changelog

- **2026-05-19** — Criação. Espelha a estrutura do schema atual de Contracts (`src/modules/contracts/adapters/persistence/schemas/mysql.ts`), formaliza as constraints normativas de ADR-0020/0018/0014 e centraliza as `.mdx` Drizzle relevantes para modelagem.
