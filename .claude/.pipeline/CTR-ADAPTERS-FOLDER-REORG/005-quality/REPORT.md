# Quality Check - Ticket CTR-ADAPTERS-FOLDER-REORG

**Skill:** ts-quality-checker
**Data:** 2026-05-22T12:19Z
**Veredito final:** GREEN no escopo (heranca documentada do CTR-STORAGE-S3-ADAPTER W0)

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check | 8 errors herdados | Todos em `s3*.test.ts` por imports inexistentes (RED esperado de S3 W0). Zero novos. |
| 2 | Format check | OK | "All matched files use Prettier code style!" |
| 2b | Lint | 106 errors herdados | Todos em `s3*.test.ts`. Mesma origem. |
| 3 | Tests (excl `tests/infra/**`) | 698 / 681 pass / 3 fail / 14 skip | IDENTICO ao pre-reorg. |
| 4 | Build | SKIPPED (Fase 1) | — |

## Diff causado pelo reorg

| Metrica | Pre-reorg | Pos-reorg | Delta |
| :--- | ---: | ---: | ---: |
| Tests | 698 | 698 | 0 |
| Pass | 681 | 681 | 0 |
| Fail | 3 | 3 | 0 |
| Skip | 14 | 14 | 0 |
| Lint errors | 106 | 106 | 0 |
| Tsc errors | 8 | 8 | 0 |

**Zero regressao em todas as colunas.**

## Heranca documentada

Os 8 tsc errors e 106 lint errors estao 100% concentrados em `tests/modules/contracts/adapters/storage/s3*.test.ts` (3 arquivos do W0 do `CTR-STORAGE-S3-ADAPTER`). Esses arquivos importam codigo nao existente:
- `@aws-sdk/client-s3` (pacote nao instalado ainda)
- `#src/modules/contracts/adapters/storage/s3.ts` (arquivo a criar em W1)
- `#src/modules/contracts/adapters/storage/s3-config-aws.ts`
- `#src/modules/contracts/adapters/storage/s3-error-mapper.ts`

Estado RED esperado. Os 3 fails no `pnpm test` sao os 3 mesmos arquivos. Apos o W1 do S3-ADAPTER instalar AWS SDK + criar os 3 sources, **toda** a suite global volta a GREEN limpo.

## Saida integral - Tests (excl infra)

```
i tests 698
i suites 237
i pass 681
i fail 3
i cancelled 0
i skipped 14
i todo 0
i duration_ms 10940.098458
```

## CAs do request

Todos os 8 CAs (CA1..CA8) satisfeitos. Ver REPORT W1 §"CAs do request - verificacao".

## Proximo passo

GREEN no escopo deste ticket. Pipeline pode fechar.

Ordem da fila apos fechar:

1. **`CTR-STORAGE-S3-ADAPTER` W1** — instala `@aws-sdk/client-s3 @aws-sdk/s3-request-presigner`, cria `storage/s3.ts` + `storage/s3-config-aws.ts` + `storage/s3-error-mapper.ts`. Pos W1, gates W3 globais voltam ao verde.
2. **`CTR-STORAGE-MAGALU-CONFIG`** (#3 da frente storage) — config builder Magalu reusando o adapter de #2.
