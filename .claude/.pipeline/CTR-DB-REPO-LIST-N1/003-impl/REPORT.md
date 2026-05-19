# W1 — GREEN (Refactor)

## Skill aplicada

`database-engineer` (modelagem aplicada — JOIN aplicativo via `inArray` + agrupamento em Map).

---

## Mudanças em `src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts`

### 1. Import — adicionado `inArray`

```diff
- import { eq } from 'drizzle-orm';
+ import { eq, inArray } from 'drizzle-orm';
```

### 2. `list()` — H1 endereçado (1+N → 1+1)

Antes (linhas 136-150):

```ts
list: async () =>
  safe('list', async () => {
    const rows = await db.select().from(schema.contracts);
    const results: Contract[] = [];
    for (const row of rows) {
      const homologatedRows = await db
        .select({ amendmentId: schema.contractHomologatedAmendments.amendmentId })
        .from(schema.contractHomologatedAmendments)
        .where(eq(schema.contractHomologatedAmendments.contractId, row.id));
      const r = buildContract(row, homologatedRows);
      if (!r.ok) throw new Error(r.error);
      results.push(r.value);
    }
    return results as readonly Contract[];
  }),
```

Depois:

```ts
list: async () =>
  safe('list', async () => {
    // Audit §H1 — antipadrão N+1 substituído por 1+1 queries.
    const rows = await db.select().from(schema.contracts);
    if (rows.length === 0) return [] as readonly Contract[];

    const contractIds = rows.map((r) => r.id);
    const links = await db
      .select({
        contractId: schema.contractHomologatedAmendments.contractId,
        amendmentId: schema.contractHomologatedAmendments.amendmentId,
      })
      .from(schema.contractHomologatedAmendments)
      .where(inArray(schema.contractHomologatedAmendments.contractId, contractIds));

    const byContract = new Map<string, string[]>();
    for (const link of links) {
      const arr = byContract.get(link.contractId) ?? [];
      arr.push(link.amendmentId);
      byContract.set(link.contractId, arr);
    }

    const results: Contract[] = [];
    for (const row of rows) {
      const homologatedIds = (byContract.get(row.id) ?? []).map((amendmentId) => ({
        amendmentId,
      }));
      const r = buildContract(row, homologatedIds);
      if (!r.ok) throw new Error(r.error);
      results.push(r.value);
    }
    return results as readonly Contract[];
  }),
```

**Complexidade:** 1 SELECT em `ctr_contracts` + 1 SELECT em `ctr_contract_homologated_amendments` com `WHERE contract_id IN (?, ?, ...)`. Memória O(M+N) (M = contratos, N = total de links). Sem cartesiano (preferido a `leftJoin`).

**Curto-circuito**: se `rows.length === 0`, retorna `[]` sem a 2ª query — evita gerar `WHERE contract_id IN ()` (sintaxe inválida em alguns dialetos; mysql2 também não gosta).

### 3. `persistContract` junction — M4 endereçado (N → 1)

Antes (linhas 84-88):

```ts
for (const amendmentId of homologatedAmendmentIds) {
  await tx
    .insert(schema.contractHomologatedAmendments)
    .values({ contractId: row.id, amendmentId });
}
```

Depois:

```ts
// Audit §M4 — insert em batch (`VALUES (r1), (r2), ...`).
if (homologatedAmendmentIds.length > 0) {
  await tx.insert(schema.contractHomologatedAmendments).values(
    homologatedAmendmentIds.map((amendmentId) => ({
      contractId: row.id,
      amendmentId,
    })),
  );
}
```

**Round-trips:** 1 independente do tamanho de `homologatedAmendmentIds`. Skip se vazio (mysql2 rejeita `values([])`).

---

## Decisões aplicadas (do `000-request.md`)

| Decisão | Implementação | Citação |
| :-- | :-- | :-- |
| D1 — `inArray` + Map (não JOIN) | `.where(inArray(schema...contractId, contractIds))` + `Map<string, string[]>` | Audit §H1 — exemplo literal do `out.push(...)`. |
| D2 — `values([...])` batch | `.values(homologatedAmendmentIds.map(...))` | Audit §M4 + ADR-0020 §SQL permitido. |
| D3 — Regression guards estruturais | CA-13.1, CA-13.2, CA-14 em `contract-repository.shape.test.ts` | precedente: `tests/cleanup/sqlite-removal.test.ts`. |
| D4 — Preservar `safe()` + `buildContract` | inalterados; só a coleta de `amendmentIds` mudou | YAGNI. |
| **Curto-circuito `rows.length === 0`** (não estava no `000-request.md`, surgiu durante a impl) | retorna `[]` antes da 2ª query | evita `inArray([])` mal-formado. |

---

## Resultados

```
$ pnpm run typecheck
EXIT=0  (sem diagnósticas)

$ pnpm test
ℹ tests 454 | pass 441 | fail 0 | skipped 13 | duration_ms 38113
EXIT=0

$ pnpm run format:check
All matched files use Prettier code style!  EXIT=0

$ pnpm run lint
EXIT=0  (sem erros)
```

**Delta de testes vs baseline pré-ticket** (CTR-DB-DRIVER-POOL-TUNING W3):

| Métrica | Antes | Agora | Δ |
| :-- | :-- | :-- | :-- |
| Total | 451 | 454 | **+3** (CA-13.1, CA-13.2, CA-14) |
| Pass | 438 | 441 | **+3** (todos os novos verdes) |
| Fail | 0 | 0 | 0 |
| Skipped | 13 | 13 | 0 |

---

## Impacto observável

| Cenário | Antes | Depois | Impacto |
| :-- | :-- | :-- | :-- |
| `list()` com 1.000 contratos, 5 aditivos cada | 1 + 1.000 queries (5.000 amendment ids) | 2 queries (5.000 rows na junction) | **~500× menos round-trips** |
| `persistContract` com 50 aditivos homologados | 1 (delete) + 50 (insert) = 51 stmts/save | 1 (delete) + 1 (insert batch) = 2 stmts/save | **~25× menos round-trips** |
| `save` com 0 aditivos | 1 (delete) + 0 = 1 | 1 (delete) + 0 (skip) = 1 | igual ✓ |
| Suíte contratual (`list`, idempotência, etc.) | passa | passa | nenhum ✓ |

---

## Critério de saída do GREEN

- [x] `list()` faz 1+1 queries (verificado por CA-13.2 + leitura visual).
- [x] `for ... of rows` com `await db.select()` interno removido (CA-13.2 verde).
- [x] `persistContract` junction em `values([...])` batch (CA-14 verde).
- [x] Skip do batch se `homologatedAmendmentIds.length === 0`.
- [x] `inArray` importado.
- [x] Suíte contratual `runContractRepositoryContract` continua passando.
- [x] `typecheck`, `test`, `format:check`, `lint` todos verdes.

**Pronto para W2.**
