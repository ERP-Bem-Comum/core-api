# W1 — Implementação GREEN · PAR-GRID-CONTRACT-COUNT

> Skill: `ports-and-adapters` + borda HTTP · Outcome: **GREEN** (5/5 testes W0) · Sem regressão

## Estratégia

`contractCount` adicionado **apenas ao item de grid** (`*ListItemSchema = *DetailSchema.extend(...)`),
não ao detalhe (`GET /:id` fora das CAs) — evita regressão nos testes de detalhe e mantém o escopo
da #105. Cada grid enriquece **só a página** (≤ pageSize) via `getContractCounts(refs)` **batch**
(uma leitura `WHERE contractor_ref IN (...)`), eliminando N+1 na borda paginada.

## Mudanças

### Base (port + adapters + composition)

- `application/ports/contract-count-store.ts` — novo método `getCounts(refs): Result<ReadonlyMap<string,number>, E>`
  (map só com refs presentes; ausentes → 0 no chamador, CA2).
- `adapters/persistence/repos/contract-count-store.in-memory.ts` — `getCounts` + parâmetro `seed`
  (pré-popula contagens no driver memory). Factory mantém compat com o worker (`seed = []` default).
- `adapters/persistence/repos/contract-count-store.drizzle.ts` — `getCounts` via `inArray` (read-model
  `par_contract_count_view`), boundary `try/catch → Result`.
- `adapters/http/composition.ts` — `PartnersSeed.contractCounts`, `Pools.contractCountStore` (InMemory
  semeado p/ memory; `createDrizzleContractCountStore(readerHandle)` p/ mysql), `PartnersHttpDeps.getContractCounts`.

### Borda HTTP (4 grids)

| Grid | Schema | DTO | Handler |
| :--- | :--- | :--- | :--- |
| collaborators | `collaboratorListItemSchema` + paginated | `collaboratorToListItemDto` | `plugin.ts` GET /collaborators |
| suppliers | `supplierListItemSchema` + paginated | `supplierToListItemDto` | `supplier-plugin.ts` GET /suppliers |
| financiers | `financierListItemSchema` + paginated | `financierToListItemDto` | `financier-plugin.ts` GET /financiers |
| acts | `actListItemSchema` + paginated | `actToListItemDto` | `act-plugin.ts` GET /acts |

Erro do store na leitura do grid → `503` (`contract-count-store-unavailable`).

## Conformidade arquitetural

- **ADR-0006:** a contagem vem **só** do read-model do `partners`; nenhum handler toca `contracts`.
- **ports-and-adapters:** port é `type Readonly`; dois adapters (InMemory + Drizzle); exception→Result no adapter.
- **ADR-0020:** `getCounts` usa `SELECT ... WHERE IN` (permitido); sem features proibidas.

## Verificação

```
grids-contract-count.routes.test.ts → tests 5 · pass 5 · fail 0   (GREEN)
suíte partners HTTP (tests/.../http/*.test.ts) → tests 215 · pass 215 · fail 0   (sem regressão)
pnpm run typecheck → verde
```

## Próxima wave

W2 (code-review, read-only, max 3 rounds) — auditar adesão a ADR-0006, padrão ports/adapters, N+1,
idioma EN/PT por camada.

## Adendo — Round 2 (sugestões do W2)

**Sugestão 1 (assimetria DTO):** `contractCount` promovido ao `*DetailSchema` canônico dos 4 grids;
`*ToDetailDto(record, contractCount)` recebe a contagem; `*ListItemSchema`/`*ToListItemDto` removidos.
Lista e detalhe voltam a compartilhar o mesmo DTO. `GET /:id` resolve via `getContractCounts([ref])`.
**Verde:** grids-contract-count 12/12 · partners HTTP 222/222 · typecheck/lint/format verdes.
