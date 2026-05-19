# Estado do Ticket CTR-DEFECTS-MEDIUM

| Wave | Status |
| :--- | :--- |
| W0 — RED | ✅ done |
| W1 — GREEN | ✅ done — 227/227 testes |
| W2 — REVIEW | ✅ APPROVED (zero throw fora de boundary, Result respeitado, regex NBSP via ` `) |
| W3 — QUALITY | ✅ ALL GREEN (format + typecheck + lint + test) |

## 🎉 Ticket FECHADO — 4 defeitos corrigidos

| # | Defeito | Implementação |
| :- | :--- | :--- |
| **#7** | Period aceita `start === end` e ano < 2000 | `Period.create` rejeita `period-zero-duration`; `MIN_YEAR = 2000` aplicado em `create` e `createIndefinite` com `period-year-out-of-range` |
| **#9** | Contract permite `originalValue.cents === 0` | check explícito `=== 0` em `Contract.create` → `contract-original-value-zero` |
| **#10** | `formatMoney` espalha `1e+23` / NBSP no terminal | `Intl.NumberFormat('pt-BR', 'BRL')` + regex `/ /g` para normalizar NBSP — Unicode escape evita lint `no-irregular-whitespace` |
| **#11** | `createAmendment` TermChange não fail-fast | validação contra `currentPeriod.end` + Indefinite no use case (antes de `Amendment.create`); erros `create-amendment-term-change-not-extending` e `create-amendment-cannot-extend-indefinite` |

**+7 testes novos** cobrindo todos os fixes. Sem regressão nos 220 da rodada anterior.

## Notas técnicas

- **Defeito #10 — NBSP**: ESLint `no-irregular-whitespace` proíbe NBSP literal no source. Solução: `const NBSP_REGEX = / /g;` (escape Unicode no regex literal, NBSP só existe em runtime).
- **Defeito #7 — período zero**: 1 teste pré-existente que aceitava `start === end` foi invertido para rejeitar (não havia justificativa de negócio para período de 0 instantes).
- **Defeito #11 — fail-fast**: validação duplicada no use case e na homologação é proposital — protege contra estados inconsistentes em qualquer ponto do ciclo.
