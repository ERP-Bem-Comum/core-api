# W3 — REPORT (gate) · BGP-LEGACY-ID-DUP-ASSERT (#520)

## Veredito: GREEN

- `typecheck` ✅ · `format:check` ✅ · `lint` ✅
- `pnpm test` (unit) → **4357 · pass 4337 · fail 0 · skipped 20** — regressão zero
- Integração (o que importa): CA3 RED→GREEN provado contra MySQL 8.4 real; suíte `budget-plans`
  completa **109/109** contra MySQL real (era 103/6).

W2 APPROVED (fix mais estrito, não afrouxa, molde canônico reusado). Só o módulo budget-plans (ADR-0014).
Fecha o job `budget-plans` do `integration.yml` (#523).
