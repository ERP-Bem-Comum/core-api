# W1 — GREEN · FIN-DASHBOARD-VARIATION (#237)

Skill: **`ts-domain-modeler`**. Domínio puro.

## Mudança
`src/modules/financial/domain/dashboard/variation.ts` (novo):
- `Variation` (VO, `absoluteCents` assinado) + `calculateVariation`.
- `Percentage` (união discriminada `value`/`no-change`/`new`) + `calculatePercentage` (div/0 como valor, não exceção).
- `PeriodWindow` + `monthWindow(reference, monthsAgo)` (half-open UTC, rollover via `Date.UTC`) + `comparisonWindows` (M-1/M-2).

## Verificação
`tests/.../dashboard/variation.test.ts` **4/4 GREEN** (CA1-CA4). `typecheck`+`format`+`lint` verdes; suíte **3300 pass / 0 fail**.
