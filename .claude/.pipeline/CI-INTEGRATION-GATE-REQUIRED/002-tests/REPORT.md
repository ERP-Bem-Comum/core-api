# W0 — REPORT (RED) · CI-INTEGRATION-GATE-REQUIRED (#523 Fase 2)

## Pré-condição CA1 — satisfeita

`integration.yml` 100% verde na `dev` após os merges de #519/#520/#521/#522 (o run do #544 fechou 14
success = 13 jobs + gate). A Fase 0 (report-only) cumpriu o papel; agora o gate pode bloquear.

## RED — o teste da estrutura, invariante invertido

`integration-matrix-workflow.test.ts` CA3 reescrito: de `assert.match(/continue-on-error: true/)` (Fase 0)
para `assert.doesNotMatch(/continue-on-error: true/)` (Fase 2). Contra o workflow ATUAL (que ainda tem o
flag na linha 37):

```
ℹ tests 14 · pass 12 · fail 1
✖ o job da matrix NÃO tem continue-on-error (fase report-only encerrada)  operator: doesNotMatch
```

RED pelo motivo certo: o flag ainda existe. GREEN quando o W1 removê-lo.

## Premissa W1

Remover `continue-on-error: true` do job `integration` (`integration.yml:37`) + atualizar os comentários
que descrevem a Fase 0 (linhas ~124-126 e o cabeçalho do teste). NÃO adicionar `|| true`. A marcação do
`gate` como required é op de branch protection (pós-merge, humano).
