# 003 - W1 (GREEN no escopo) - CTR-ADAPTERS-RENAME-PORT-PREFIX

**Skill:** main-session
**Data:** 2026-05-22
**Veredito:** GREEN. Zero regressao causada pelo rename.

## Renomeacoes aplicadas

### Source (4)

| De | Para |
| :--- | :--- |
| `event-delivery/in-memory.ts` | `event-delivery/event-delivery.in-memory.ts` |
| `event-delivery/logger.ts` | `event-delivery/event-delivery.logger.ts` |
| `outbox/in-memory.ts` | `outbox/outbox.in-memory.ts` |
| `storage/in-memory.ts` | `storage/document-storage.in-memory.ts` |

### Tests (4)

| De | Para |
| :--- | :--- |
| `event-delivery/in-memory.test.ts` | `event-delivery/event-delivery.in-memory.test.ts` |
| `event-delivery/logger.test.ts` | `event-delivery/event-delivery.logger.test.ts` |
| `outbox/in-memory.test.ts` | `outbox/outbox.in-memory.test.ts` |
| `storage/in-memory.test.ts` | `storage/document-storage.in-memory.test.ts` |

### Rename antecipado (W0 do CTR-STORAGE-S3-ADAPTER)

`s3.integration.test.ts:36` agora importa `#src/.../storage/document-storage.s3.ts` (novo nome esperado para o adapter S3 quando o W1 daquele ticket entregar). Os 2 utilities (`s3-config-aws.ts`, `s3-error-mapper.ts`) **nao foram renomeados** — sao helpers, nao adapters de port.

## Imports atualizados

- 5 patterns globais via sed batch (paths `adapters/<pasta>/<old>.ts` -> `adapters/<pasta>/<new>.ts`).
- 2 imports relativos manuais em `persistence/repos/{contract,amendment}-repository.in-memory.ts` que apontavam para `'../../outbox/in-memory.ts'` (o sed casava com `adapters/` mas esse path comeca com `../../`).

## Gates (com heranca documentada)

| Gate | Resultado | Comentario |
| :--- | :--- | :--- |
| `pnpm run typecheck` | 8 errors | 100% em `tests/modules/contracts/adapters/storage/s3*.test.ts` (RED esperado de S3 W0). Inclui 1 path atualizado: `document-storage.s3.ts`. |
| `pnpm run format:check` | OK | "All matched files use Prettier code style!" |
| `pnpm test` (excl `tests/infra/**`) | 698 / 681 / 3 / 14 | IDENTICO ao pre-rename. |

## Comparativo de regressao

| Marco | tests | pass | fail | skip | tsc errors |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Pre-rename (pos CTR-ADAPTERS-FOLDER-REORG) | 698 | 681 | 3 | 14 | 8 |
| Pos-rename (agora) | 698 | 681 | 3 | 14 | 8 |
| **Delta** | **0** | **0** | **0** | **0** | **0** |

## CAs do request

| CA | Status |
| :--- | :--- |
| CA1 - 4 source files renomeados | OK |
| CA2 - 4 test files renomeados | OK |
| CA3 - imports atualizados | OK (sed batch + 2 manuais) |
| CA4 - tests identicos | OK (698/681/3/14) |
| CA5 - padrao consistente | OK (apenas adapters; utilities preservadas) |
| CA6 - S3 W0 herdado + path atualizado | OK (`s3.integration.test.ts` aponta para `document-storage.s3.ts`) |
| CA7 - format check | OK |

7/7 satisfeitos.
