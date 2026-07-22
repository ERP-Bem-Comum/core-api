# FIN-DASHBOARD-VARIATION — escopo

> Issue #237 (DASH-F6 · Camada 1 · domínio puro, sem dependência). Módulo **financial**. Size **S**.
> Motor de variação para os widgets do Dashboard (#112/#169). FIEL ao legado: **M-1 vs M-2** (P.O.).

## Escopo (in) — `src/modules/financial/domain/dashboard/variation.ts` (domínio puro)

1. **`calculateVariation(currentCents, previousCents): Variation`** — diferença **assinada** em centavos (`current − previous`). `Variation = { absoluteCents: number }` (signed; pode ser negativo — não é `Money`, que é não-negativo).
2. **`calculatePercentage(currentCents, previousCents): Percentage`** — variação percentual. **Div/0 tratado no domínio como união discriminada** (errors-as-values):
   - `previous > 0` → `{ kind: 'value', percent }` (`(current − previous) / previous * 100`).
   - `previous === 0 && current === 0` → `{ kind: 'no-change' }` (formatação da borda: **"0%"**).
   - `previous === 0 && current > 0` → `{ kind: 'new' }` (crescimento infinito; borda: **"+"**).
   - A string "0%"/"+" é **formatação** (CLI/HTTP), não domínio — o domínio devolve a união tipada.
3. **Janelas de período** — `monthWindow(reference, monthsAgo): PeriodWindow` (mês-calendário `monthsAgo` antes da referência, half-open `[start, end)` em UTC; rollover de ano correto) + `comparisonWindows(reference): { m1, m2 }` (M-1 = mês anterior; M-2 = dois meses antes). Puro (referência é INPUT — sem relógio no domínio).

## Fora de escopo

- Formatação PT das strings ("0%"/"+"/"−12,5%") — borda (widget).
- Somar payables por janela / endpoint HTTP — os widgets (#239/#241/#112) consomem `fin_payable_view`.

## Critérios de aceite

- **CA1** `calculateVariation(1000, 800).absoluteCents === 200`; `(800,1000) === -200`; `(0,0) === 0`.
- **CA2** `calculatePercentage(1200,1000)` → `{kind:'value', percent:20}`; `(900,1000)` → `{kind:'value', percent:-10}`.
- **CA3 (div/0)** `calculatePercentage(0,0)` → `{kind:'no-change'}`; `(500,0)` → `{kind:'new'}`.
- **CA4 (janelas)** `comparisonWindows(2026-06-15)` → m1 `[2026-05-01, 2026-06-01)`, m2 `[2026-04-01, 2026-05-01)`; `monthWindow(2026-01-15, 1)` → `[2025-12-01, 2026-01-01)` (rollover).

## Pipeline (agentes por wave)

| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | testes RED | skill **`tdd-strategist`** |
| W1 | domínio puro (VOs + funções) | skill **`ts-domain-modeler`** |
| W2 | audit read-only | skill **`code-reviewer`** (inline — proporcional a 1pt) |
| W3 | gate | skill **`ts-quality-checker`** |

## DoD

Gate W3 verde. Motor de variação puro (variation + percentage c/ div/0 + janelas M-1/M-2), errors-as-values, testes de borda. Camada 1 — consumido pelos widgets (#239/#241/#112).
