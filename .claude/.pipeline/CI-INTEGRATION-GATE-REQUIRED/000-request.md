# CI-INTEGRATION-GATE-REQUIRED — escopo (Fase 2 do #523)

> Size **S** (1 linha de config + 1 op de branch protection). Fecha a **Fase 2** do #523: tornar o gate
> de integração **bloqueante**. Só executar **DEPOIS** de #519/#520/#521/#522 mergeados e o
> `integration.yml` **100% verde** (13 jobs passando + `gate` verde por mérito, não por report-only).

## Pré-condição (verificar ANTES de tocar)

Confirmar que a matriz do `integration.yml` está **toda verde** num run da `dev` — os 4 defeitos foram
corrigidos:

- #519 (`financial`) ✅ · #520 (`budget-plans`) ✅ · #521 (`partners`) ✅ · #522 (`etl`/`etl:orchestrate`).

Se qualquer job ainda estiver vermelho, **NÃO** executar (a Fase 2 nasceria bloqueando merge por defeito
aberto).

## A mudança (código)

Remover **`continue-on-error: true`** do job `integration` (`.github/workflows/integration.yml:37`). Só
isso. Com o flag presente, `needs.integration.result` agrega como `success` mesmo com legs vermelhos
(report-only da Fase 0). Ao removê-lo, um leg vermelho torna `needs.integration.result = failure` → o job
`gate` falha de verdade.

O teste do W0 (`tests/scripts/integration-matrix-workflow.test.ts`) assere `continue-on-error: true` como
invariante da **Fase 0** — esse assert precisa ser **atualizado** (não é mais a fase report-only). Rever o
`it` correspondente para refletir a Fase 2 (ou removê-lo, com justificativa).

## ⚠️ A ordem é crítica (M1 do W2 do #523)

A virada tem dois passos, e a ORDEM importa — **nunca** inverter:

1. **PRIMEIRO** — mergear a remoção do `continue-on-error` (este ticket). O `gate` passa a ser um check
   **preciso** (verde só se todos os legs passarem), mas **ainda não bloqueia** (não é required).
2. **DEPOIS** — marcar o check `integração (gate)` como **required status check** no branch protection de
   `dev` e `main` (op de repo no GitHub, fora de arquivo — ação do humano).

**Por que a ordem:** marcar `gate` como required **enquanto** `continue-on-error: true` existir criaria um
gate **permanentemente verde** (falso-verde), que nunca bloqueia — o furo de gate-integrity que o próprio
#523 combate (CWE-703). Fazer (1) antes de (2) elimina a janela perigosa.

## Critérios de aceite

- [ ] **CA1 (pré-condição)** — matriz do `integration.yml` 100% verde na `dev` antes de tocar.
- [ ] **CA2** — `continue-on-error: true` removido do job `integration`; o `gate` reflete o resultado real
      da matriz (verde só com todos os legs verdes).
- [ ] **CA3** — o teste `integration-matrix-workflow.test.ts` atualizado (o assert de `continue-on-error`
      não vale mais na Fase 2) + gate W3 verde.
- [ ] **CA4 (op humana, documentada)** — marcar `integração (gate)` como required em `dev`/`main` **após** o
      merge do CA2. Registrado como passo pós-merge, não código.

## Rastreio

Fase 2 do #523 · design em `.claude/.planning/ci-integration-gate-523/` · a ressalva de ordem é o M1 do
`004-code-review/REVIEW.md` do ticket `CI-INTEGRATION-MATRIX`.
