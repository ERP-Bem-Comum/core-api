# W3 — Gate de Qualidade (CORE-OUTBOX-WORKER-GENERIC)

**Resultado:** 🟢 GREEN — disciplina `ts-quality-checker`.

## Gate (`pnpm run`)

| Comando | Resultado |
| :--- | :--- |
| `typecheck` | ✅ sem erros |
| `format:check` | ✅ "All matched files use Prettier code style!" |
| `lint` | ✅ sem erros (corrigidos nos testes: `consistent-type-definitions`, `require-await`, `prefer-includes`) |
| `test` | ✅ **2632 pass** / 0 fail / 18 skip |

## Integração MySQL (não-regressão dos dois workers)

| Comando | Resultado |
| :--- | :--- |
| `test:integration` (contracts) | ✅ **86 pass** — inclui `CA-I1` (worker entrega 5 eventos reais) e `CA-I2` (2 workers paralelos SKIP LOCKED sem duplicar) |
| `test:integration:partners` | ✅ **38 pass** — exercita o worker/outbox do partners contra MySQL (cobre o worker sem teste unit) |

## Política de regressão zero

Os erros de lint apareceram **nos testes novos** (regras `require-await`/`consistent-type-definitions`/
`prefer-includes` não estão na lista relaxada de `tests/**`). Corrigidos na causa (fakes sem `async`
ocioso; `interface` em vez de `type`; `String#includes`) — não suprimidos. Comportamento do worker
genérico inalterado e comprovado pela integração nos dois módulos.

## Resultado

Duplicação eliminada: workers de contracts/partners 214/213 → 57/56 linhas; lógica única em
`src/shared/outbox/` (worker 175 + types 146). O worker do `financial` (feature 014) nascerá sobre
este genérico, sem copiar. Comportamento idêntico (SKIP LOCKED, retry, DLQ, backoff, AbortSignal).
