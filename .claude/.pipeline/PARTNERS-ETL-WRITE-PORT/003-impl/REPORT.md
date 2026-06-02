# W1 — GREEN · PARTNERS-ETL-WRITE-PORT

**Skill:** ports-and-adapters · **Outcome:** GREEN ✅ · **Data:** 2026-06-02

## Arquivos criados/editados

| Arquivo | Papel |
| --- | --- |
| `src/modules/partners/application/ports/legacy-entity-store.ts` | port genérico `LegacyEntityStore<A, Ref>` (`findByLegacyId` + `provision`) |
| `…/adapters/persistence/repos/legacy-entity-store.in-memory.ts` | InMemory genérico `makeInMemoryLegacyEntityStore<A, Ref>(refOf)` |
| `…/adapters/persistence/repos/partners-etl-store.drizzle.ts` | `createDrizzlePartnersEtlStores(handle, clock)` → os 4 stores Drizzle |
| `src/modules/partners/public-api/etl.ts` | `buildPartnersEtlPort` + `PartnersEtlPort` (sem Fastify) |
| `package.json` | `test:integration:partners` passa a incluir o novo gate |

## Decisões de design (YAGNI)

- **Port genérico `LegacyEntityStore<A, Ref>`** (1 tipo) reusado para as 4 entidades — evita 4 ports quase idênticos. O InMemory é genérico (`refOf` injetado); o Drizzle tem 4 instâncias concretas (tipos de tabela Drizzle não permitem 1 adapter totalmente genérico sem `any`).
- **`provision` recebe o agregado já construído** (rehydrate fica no CORE); só persiste. SELECT FOR UPDATE by `legacy_id` → skip (`already-exists`) ou INSERT `{ ...<x>ToInsert(agg, now), legacyId }` (`created`). **Nunca UPDATE** (D17). `ER_DUP_ENTRY` em `par_<x>_legacy_id_idx` (corrida) → `already-exists`.
- **Sem migration** — `legacy_id INT NULL UNIQUE` já existe nas 4 `par_*` (P2).
- `userProfiles` usa PK `user_ref` (não `id`); `findByLegacyId` rehydrata via `UserRef.rehydrate`.

## Verificação

| Gate | Resultado |
| --- | --- |
| `tsc --noEmit` | ✅ |
| `eslint` (6 arquivos) | ✅ (após `--fix`: `promise-function-async`; manual: `??` no InMemory) |
| Unit `legacy-entity-store.in-memory.test.ts` | ✅ **3/3** |
| Integração `partners-etl-port.integration.test.ts` (`MYSQL_INTEGRATION=1`, Docker :3307) | ✅ **4/4** (suppliers, financiers, collaborators, userProfiles) |

### Prova da integração (regressão zero)

```
MYSQL_PORT=3307 docker compose up -d mysql --wait
MYSQL_PORT=3307 MYSQL_INTEGRATION=1 node --test ... partners-etl-port.integration.test.ts
→ tests 4 · pass 4 · fail 0
```

Cobertura: idempotência por `legacy_id` nas 4 entidades (2× provision = 1 linha), `findByLegacyId` (incl. PK `user_ref`). Container derrubado. Adicionado a `test:integration:partners` (reprodutível).

> 1 ajuste de fixture durante o W1: 2º CPF `527.665.780-09` era inválido (checksum) → trocado pelo válido `111.444.777-35` (o 2º agregado nunca é inserido, só construído).

## Próximo passo

W2 — code review read-only.
