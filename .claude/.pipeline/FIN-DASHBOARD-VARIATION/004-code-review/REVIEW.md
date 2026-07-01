# W2 — REVIEW · FIN-DASHBOARD-VARIATION (#237)

Skill: **`code-reviewer`** (inline — proporcional a 1pt, domínio puro trivial). **Veredicto: APPROVED.**

| Regra | Resultado |
| :-- | :-- |
| Domínio puro | OK — sem class/throw/any; `Readonly<>`; sem I/O; referência de período é INPUT (sem relógio). |
| Errors-as-values | OK — div/0 é união discriminada (`no-change`/`new`), não exceção; formatação "0%"/"+" fica na borda. |
| Discriminated union | OK — `Percentage` cobre `value`/`no-change`/`new` (exaustivo no consumidor via `kind`). |
| Corretude | OK — `Variation.absoluteCents` assinado (≠ Money); `monthWindow` half-open `[start,end)` UTC c/ rollover via `Date.UTC`; `comparisonWindows` M-1/M-2 fiel ao legado. |
| Naming/idioma | OK — EN; funções claras; comentários PT do "porquê". |

Nada a corrigir. Testes CA1-CA4 cobrem variação assinada, percentual finito, div/0 e janelas (incl. rollover de ano).
