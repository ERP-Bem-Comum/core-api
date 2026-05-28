# Quality Check - Ticket CTR-ADAPTERS-CLEANUP-EVENT-BUS

**Skill:** ts-quality-checker
**Data:** 2026-05-22T12:03Z
**Veredito final:** GREEN no escopo deste ticket (com herança documentada do RED do CTR-STORAGE-S3-ADAPTER W0)

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check | FAIL (herdado) | 2 errors em `s3.integration.test.ts` por imports de modulos inexistentes (RED esperado do CTR-STORAGE-S3-ADAPTER W0). Zero erros causados por este cleanup. |
| 2 | Format check | OK | "All matched files use Prettier code style!" |
| 2b | Lint | FAIL (herdado) | 106 errors nos 3 arquivos `s3*.test.ts` (tipos `any` implicitos por imports quebrados). Mesma origem. |
| 3 | Tests (excl `tests/infra/**`) | OK no escopo | 698 / 681 pass / 3 fail / 14 skip. 3 fails sao os 3 arquivos s3*.test.ts em estado RED esperado. Zero regressao causada pelo cleanup. |
| 4 | Build | SKIPPED (Fase 1) | — |

---

## Heranca documentada

Este ticket compartilha o repo com `CTR-STORAGE-S3-ADAPTER` (W0 done, W1 pending). O W0 daquele ticket escreveu 3 test files que importam codigo nao existente — comportamento intencional de RED.

A suite global e os gates tsc/lint vêem **toda** a arvore de codigo. Portanto, enquanto CTR-STORAGE-S3-ADAPTER nao tiver W1 concluido, gates W3 globais de qualquer ticket em paralelo refletirao o RED daquele.

**Diff causado por este cleanup: 0 errors.** Antes e depois, mesmos numeros (698/681/3/14, 106 lint errors).

### Saida integral - Tests (excl infra)

```
i tests 698
i suites 237
i pass 681
i fail 3
i cancelled 0
i skipped 14
i todo 0
i duration_ms 11105.948084
```

3 fails: `s3-config-aws.test.ts`, `s3-error-mapper.test.ts`, `s3.integration.test.ts` — todos do W0 do CTR-STORAGE-S3-ADAPTER. Nenhum no escopo deste cleanup.

### Saida integral - typecheck

```
tests/modules/contracts/adapters/storage/s3.integration.test.ts(100,18): error TS7006: Parameter 'k' implicitly has an 'any' type.
tests/modules/contracts/adapters/storage/s3.integration.test.ts(105,45): error TS7006: Parameter 'Key' implicitly has an 'any' type.
```

Ambos os erros sao no arquivo do W0 do CTR-STORAGE-S3-ADAPTER. Imports de `@aws-sdk/client-s3` (nao instalado) e `#src/.../s3.ts` (inexistente) viram `any` implicito.

### Saida integral - lint

```
106 problems (106 errors, 0 warnings)
```

Todos os 106 errors sao nos 3 arquivos `tests/modules/contracts/adapters/storage/s3*.test.ts`. Mesma origem.

---

## CAs do request - verificacao final

| CA | Status |
| :--- | :--- |
| CA1 - delete | OK |
| CA2 - mysql.ts comentario | OK |
| CA3 - storage/in-memory.ts comentario | OK |
| CA4 - zero regressao na suite | OK (diff = 0 vs estado pre-cleanup) |
| CA5 - typecheck zero novos erros causados pelo cleanup | OK |
| CA6 - QA-REPORT.md nao tocado | OK |

6/6 satisfeitos.

---

## Proximo passo

GREEN no escopo deste ticket. Pipeline pode fechar.

Apos fechar, ordem da fila:

1. **`CTR-ADAPTERS-FOLDER-REORG`** (S, proximo) — move arquivos por port. Como tambem nao introduz funcionalidade nova, gates herdados continuarao FAIL no nivel global mas com a mesma analise (diff=0 causado pelo reorg).
2. **`CTR-STORAGE-S3-ADAPTER` W1** — sai do RED, instala AWS SDK, cria os 3 sources. Apos esse W1, suite global volta a ALL GREEN.
