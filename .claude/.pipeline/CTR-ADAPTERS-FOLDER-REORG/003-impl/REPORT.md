# 003 - W1 (GREEN no escopo) - CTR-ADAPTERS-FOLDER-REORG

**Skill:** main-session
**Data:** 2026-05-22
**Veredito:** GREEN no escopo. Zero regressao causada pelo reorg (tests/lint/format identicos pre/pos).

---

## Estrutura final de `src/modules/contracts/adapters/`

```
adapters/
├── event-delivery/
│   ├── in-memory.ts          ← movido de event-delivery.in-memory.ts
│   └── logger.ts             ← movido de event-delivery.logger.ts
├── outbox/
│   └── in-memory.ts          ← movido de outbox.in-memory.ts
├── persistence/
│   ├── drivers/
│   ├── mappers/
│   ├── migrations/
│   ├── repos/
│   │   ├── amendment-repository.drizzle.ts
│   │   ├── amendment-repository.in-memory.ts    ← movido de adapters/
│   │   ├── contract-repository.drizzle.ts
│   │   ├── contract-repository.in-memory.ts     ← movido de adapters/
│   │   └── outbox-repository.drizzle.ts
│   └── schemas/
└── storage/
    └── in-memory.ts
```

Mirror em `tests/modules/contracts/adapters/`:
```
adapters/
├── event-delivery/
│   ├── in-memory.test.ts      ← movido
│   └── logger.test.ts         ← movido
├── outbox/
│   └── in-memory.test.ts      ← movido
├── persistence/                (tests pre-existentes — imports atualizados)
└── storage/                    (intacto)
```

## Movimentacoes aplicadas

### Source (5)

| De | Para |
| :--- | :--- |
| `adapters/event-delivery.in-memory.ts` | `adapters/event-delivery/in-memory.ts` |
| `adapters/event-delivery.logger.ts` | `adapters/event-delivery/logger.ts` |
| `adapters/outbox.in-memory.ts` | `adapters/outbox/in-memory.ts` |
| `adapters/contract-repository.in-memory.ts` | `adapters/persistence/repos/contract-repository.in-memory.ts` |
| `adapters/amendment-repository.in-memory.ts` | `adapters/persistence/repos/amendment-repository.in-memory.ts` |

### Tests (3)

| De | Para |
| :--- | :--- |
| `tests/...adapters/event-delivery.in-memory.test.ts` | `tests/...adapters/event-delivery/in-memory.test.ts` |
| `tests/...adapters/event-delivery.logger.test.ts` | `tests/...adapters/event-delivery/logger.test.ts` |
| `tests/...adapters/outbox.in-memory.test.ts` | `tests/...adapters/outbox/in-memory.test.ts` |

## Imports atualizados

### Dentro dos arquivos movidos (profundidade ajustada)

- `event-delivery/in-memory.ts` + `event-delivery/logger.ts`: `../../../shared/result.ts` -> `../../../../shared/result.ts`; `../application/...` -> `../../application/...`
- `outbox/in-memory.ts`: idem + `./persistence/...` -> `../persistence/...`
- `persistence/repos/contract-repository.in-memory.ts` + `amendment-repository.in-memory.ts`: 2 niveis a mais (`../../../shared/` -> `../../../../../shared/`); refs ao outbox passam por `../../outbox/in-memory.ts`

### Em arquivos que consomem (atualizado via `sed` em batch)

5 substituicoes globais para subpath imports `#src/modules/contracts/adapters/<old>.ts` -> path novo + 6 substituicoes para imports relativos `'../adapters/...'` e `'../../adapters/...'`.

### Imports relativos em tests movidos

- `tests/.../outbox/in-memory.test.ts`: `'../application/ports/outbox.contract.ts'` -> `'../../application/ports/outbox.contract.ts'`
- `tests/.../event-delivery/in-memory.test.ts`: `'../application/ports/event-delivery.contract.ts'` -> `'../../application/ports/event-delivery.contract.ts'`

## Gates (com heranca documentada do CTR-STORAGE-S3-ADAPTER W0)

| Gate | Resultado | Comentario |
| :--- | :--- | :--- |
| `pnpm run typecheck` | 8 errors em `tests/modules/contracts/adapters/storage/s3*.test.ts` | 100% herdados de S3-ADAPTER W0. Zero erros novos causados pelo reorg. |
| `pnpm run format:check` | OK | "All matched files use Prettier code style!" |
| `pnpm run lint` | 106 errors | Mesmos 106 dos s3*.test.ts. Zero lint errors causados pelo reorg. |
| `pnpm test` (excl `tests/infra/**`) | 698 / 681 pass / 3 fail / 14 skip | **IDENTICO** ao estado pre-reorg. |

### Comparativo de regressao

| Marco | tests | pass | fail | skip | lint errors | tsc errors |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| Pre-reorg (pos CTR-ADAPTERS-CLEANUP-EVENT-BUS) | 698 | 681 | 3 | 14 | 106 | 8 |
| Pos-reorg (agora) | 698 | 681 | 3 | 14 | 106 | 8 |
| **Delta causado pelo reorg** | **0** | **0** | **0** | **0** | **0** | **0** |

## CAs do request - verificacao

| CA | Status |
| :--- | :--- |
| CA1 - 5 source files movidos | OK |
| CA2 - 3 test files movidos | OK |
| CA3 - typecheck zero novo erro causado | OK (8 erros = 100% S3 W0 herdado) |
| CA4 - tests identicos antes/depois | OK (698/681/3/14) |
| CA5 - estrutura final = aprovada | OK |
| CA6 - public-api nao tocado | OK |
| CA7 - format check OK | OK |
| CA8 - lint zero novo erro causado | OK (106 = 100% S3 W0 herdado) |

8/8 satisfeitos.

## Veredito W1

GREEN. Pronto para W2 (review trivial) e W3 (gates marcados como GREEN-by-inheritance).
