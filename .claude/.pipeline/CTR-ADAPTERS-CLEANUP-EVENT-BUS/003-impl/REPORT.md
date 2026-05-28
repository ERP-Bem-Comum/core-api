# 003 - W1 (GREEN no escopo) - CTR-ADAPTERS-CLEANUP-EVENT-BUS

**Skill:** main-session
**Data:** 2026-05-22
**Veredito:** GREEN no escopo do ticket. Zero regressao causada pela remocao do dead code.

---

## Acoes aplicadas

| Acao | Arquivo | Detalhe |
| :--- | :--- | :--- |
| Delete | `src/modules/contracts/adapters/event-bus.in-memory.ts` | Dead code (28 linhas). 0 imports em producao. |
| Edit | `src/modules/contracts/cli/drivers/mysql.ts:15` | Removido comentario-fossil `// CA-8 (CTR-OUTBOX-INTEGRATION-IN-REPOS): InMemoryEventBus removido.` |
| Edit | `src/modules/contracts/adapters/storage/in-memory.ts:16` | `InMemoryEventBus` -> `InMemoryEventDelivery` (vivo) na linha de doc "observable test double" |

---

## Verificacao W0 (RED esperado)

W0 wave registrada com outcome=RED note=`no-new-tests`. Justificativa:

- Este ticket e refactor cleanup puro - sem nova funcionalidade.
- A garantia de nao-regressao vem dos tests existentes passando antes e depois.
- Se algum import dinamico ou indireto ainda dependesse de `InMemoryEventBus`, falharia aqui. Nao falhou - confirmacao empirica da orfandade.

---

## Gates W3 (parciais, com nota de heranca)

| Gate | Resultado | Comentario |
| :--- | :--- | :--- |
| `pnpm run typecheck` | FAIL | 2 errors herdados de `tests/modules/contracts/adapters/storage/s3.integration.test.ts` (import de `#src/.../s3.ts` inexistente) - **estado RED esperado** do ticket paralelo `CTR-STORAGE-S3-ADAPTER` W0. |
| `pnpm run format:check` | OK | "All matched files use Prettier code style!" |
| `pnpm run lint` | FAIL | 106 errors herdados dos 3 arquivos `tests/modules/contracts/adapters/storage/s3*.test.ts` (tipos `any` implicitos por imports quebrados). Mesma origem. |
| `pnpm test` (excl `tests/infra/**`) | 698 / 681 pass / 3 fail / 14 skip | 3 fails sao `s3-config-aws.test.ts`, `s3-error-mapper.test.ts`, `s3.integration.test.ts` - herdados do RED do CTR-STORAGE-S3-ADAPTER. |

### Comparativo de regressao (estado antes vs apos cleanup)

| Marco | tests | pass | fail | skip | lint errors |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Apos W0 CTR-STORAGE-S3-ADAPTER (antes deste cleanup) | 698 | 681 | 3 | 14 | 106 |
| Apos W1 deste cleanup (agora) | 698 | 681 | 3 | 14 | 106 |
| **Delta causado pelo cleanup** | **0** | **0** | **0** | **0** | **0** |

Cleanup foi puramente subtractivo: removeu 1 arquivo + 2 comentarios. Nenhuma das 3 falhas de teste, nenhum dos 106 lint errors veio deste ticket.

### Origem confirmada dos fails herdados

Todos os 109 errors (3 test + 106 lint) sao em arquivos sob `tests/modules/contracts/adapters/storage/s3*.test.ts` (criados em W0 do CTR-STORAGE-S3-ADAPTER). Erros desaparecerao quando o W1 daquele ticket criar:

- `src/modules/contracts/adapters/storage/s3.ts`
- `src/modules/contracts/adapters/storage/s3-config-aws.ts`
- `src/modules/contracts/adapters/storage/s3-error-mapper.ts`
- + `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

---

## CAs do request - verificacao

| CA | Status |
| :--- | :--- |
| CA1 - `event-bus.in-memory.ts` deletado | OK |
| CA2 - comentario-fossil em `mysql.ts:15` removido | OK |
| CA3 - comentario em `storage/in-memory.ts:16` atualizado | OK |
| CA4 - zero regressao na suite (excl infra + s3 W0 herdado) | OK |
| CA5 - typecheck nao reporta novo erro causado pelo cleanup | OK (errors existentes sao 100% do RED herdado do S3) |
| CA6 - `tests/bdd/QA-REPORT.md` nao tocado | OK |

6/6 satisfeitos.

---

## Veredito W1

GREEN no escopo. Pronto para W2 (review trivial) e W3 (gates marcados como GREEN-by-inheritance — falhas sao herdadas do CTR-STORAGE-S3-ADAPTER W0, nao deste ticket).
