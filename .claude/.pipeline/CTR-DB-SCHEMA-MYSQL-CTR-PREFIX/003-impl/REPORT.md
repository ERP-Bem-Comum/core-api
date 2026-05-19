# W1 — GREEN Report — CTR-DB-SCHEMA-MYSQL-CTR-PREFIX

**Skill:** `database-engineer` (workflow §"Schema novo do zero" passos 3-6 — DDL com citação)
**Data:** 2026-05-15
**Resultado:** ✅ **14/14 CAs PASS** + **422/422 testes totais** (zero regressão)

---

## Arquivos modificados

| Arquivo | Mudança |
| :--- | :--- |
| `src/modules/contracts/adapters/persistence/schemas/mysql.ts` | Refatoração completa: rename 3 tabelas + 5 CHECKs + adição 3 índices + 2 CHECKs novos |
| `tests/modules/contracts/adapters/persistence/schemas/mysql.test.ts` | Polido na W1 — extração de helper `columnName` para resolver lint `no-base-to-string` |

**Mappers, repos, adapter InMemory:** intocados. Continuam importando `schemas/sqlite.ts` até `CTR-CLEANUP-SQLITE` (#5 do ADR-0020).

---

## Decisões aplicadas (do `000-request.md`)

### D1 — Rename de 3 tabelas com prefixo `ctr_*`

```diff
- mysqlTable('contracts', ...)
+ mysqlTable('ctr_contracts', ...)
- mysqlTable('amendments', ...)
+ mysqlTable('ctr_amendments', ...)
- mysqlTable('contract_homologated_amendments', ...)
+ mysqlTable('ctr_contract_homologated_amendments', ...)
```

### D2 — Rename de 5 CHECKs herdados

Todos os 5 CHECKs existentes ganharam prefix `ctr_`:
- `contracts_original_period_kind_chk` → `ctr_contracts_original_period_kind_chk`
- `contracts_current_period_kind_chk` → `ctr_contracts_current_period_kind_chk`
- `contracts_status_chk` → `ctr_contracts_status_chk`
- `amendments_kind_chk` → `ctr_amendments_kind_chk`
- `amendments_status_chk` → `ctr_amendments_status_chk`

### D3 — Índice F-H2 em `amendments.contract_id`

```ts
index('ctr_amendments_contract_id_idx').on(t.contractId),
```

### D4 — Índice F-M2 em `contracts.status`

```ts
index('ctr_contracts_status_idx').on(t.status),
```

### D5 — Índice F-M2 em `contracts.signed_at`

```ts
index('ctr_contracts_signed_at_idx').on(t.signedAt),
```

### D6 — CHECK F-L1 (bicondicional endedAt ↔ status terminado)

```ts
check(
  'ctr_contracts_ended_at_consistency_chk',
  sql`(${t.endedAt} IS NOT NULL) = (${t.status} IN ('Expired','Terminated'))`,
),
```

Sintaxe `(A) = (B)` é o operador MySQL de bicondicional booleana (retorna 1 se ambos true ou ambos false). Comentário inline explica o porquê.

### D7 — CHECK F-L2 (implicação homologation completeness)

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

Implicação `P ⟹ Q` expressa como `(NOT P) OR Q` (forma DNF padrão; aceita em qualquer CHECK SQL).

---

## Lint fix no caminho

O test `mysql.test.ts` capturava colunas de índice via `idx.config.columns.map(c => String(c.name))` — lint flag `no-base-to-string` porque `c` é tipado como `Column | SQL`. Extração da helper `columnName(col: unknown): string` com type guards explícitos resolveu sem suppress.

---

## Sumário da execução final

```
ℹ tests 422        (408 prévios + 14 novos do schema MySQL)
ℹ pass  422        ✅ TODOS verdes
ℹ fail  0
ℹ skipped 0
ℹ duration_ms 46698
```

### Detalhe dos 14 CAs

| CA | Resultado | Citação ancorando |
| :--- | :---: | :--- |
| CA-1a `ctr_contracts` | ✅ | ADR-0020 §"Convenção" |
| CA-1b `ctr_amendments` | ✅ | ADR-0020 §"Convenção" |
| CA-1c `ctr_contract_homologated_amendments` | ✅ | ADR-0020 §"Convenção" |
| CA-2 índice `contract_id` | ✅ | DB audit F-H2; Refman §1.7.3.2 |
| CA-3 índice `status` | ✅ | DB audit F-M2; Ramakrishnan §8.2 |
| CA-4 índice `signed_at` | ✅ | DB audit F-M2 |
| CA-5a-e CHECKs com prefix | ✅ | ADR-0020 §"Convenção" |
| CA-6 CHECK F-L1 | ✅ | DB audit F-L1 |
| CA-7 CHECK F-L2 | ✅ | DB audit F-L2 |
| CA-8 PK composta | ✅ | preservado |
| CA-9 FK aponta para `ctr_contracts` | ✅ | Drizzle resolve em tempo de inspeção |
| CA-10 UNIQUE `sequential_number` | ✅ | preservado |

---

## Conformidade

| Verificação | Status |
| :--- | :--- |
| TypeScript strict (`tsc --noEmit`) | ✅ Zero erros |
| Prettier (`format:check`) | ✅ All green |
| ESLint (`lint`) | ✅ Zero erros |
| Suite antiga intacta (408 testes) | ✅ Zero regressão |
| Suite nova (14 CAs) | ✅ 14/14 |
| `package.json` intacto | ✅ Zero dep nova |
| ADR-0020 §"Convenção de nomenclatura" | ✅ aplicado (D1, D2) |
| ADR-0018 §"Features proibidas" (zero ENUM nativo) | ✅ preservado |
| DB Audit F-H2, F-M2, F-L1, F-L2 | ✅ todos fechados |

---

## Próximo passo (W2 REVIEW)

Audit read-only via skill `code-reviewer` cobrindo:

- **Bicondicional do CHECK F-L1** está semanticamente correta? `(A) = (B)` é o operador certo?
- **Implicação do CHECK F-L2** cobre todos os caminhos (incluindo `NULL` lógica de 3 valores)?
- **Nomes dos índices** seguem convenção `<tabela>_<colunas>_idx`?
- **Nenhum índice especulativo** (skill `database-engineer` §anti-padrão #3)?
- **`tests/.../mysql.test.ts`** cobre proporcionalmente vs apenas "smoke test"?
