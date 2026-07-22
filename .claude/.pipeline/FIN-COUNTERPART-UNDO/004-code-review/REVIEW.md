# Code Review — Ticket FIN-COUNTERPART-UNDO — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-07-13
**Escopo:** domínio `discard`/`reopen`; `undoReconciliation` estendido; port + adapters `undoCounterpartOrigin`; 4 testes de callers ajustados.

## Issues

### 🔴 Crítica
Nenhuma.

### 🟡 Importante
Nenhuma.

### 🔵 Sugestão

#### Sugestão 1 — Contrapartida reaberta referencia origem Undone
No caso Matched (CA2), a contrapartida volta a `Pending` mas seu `originReconciliationRef` aponta para a conciliação de A que acabou de virar `Undone`. É intencional (CA2 do spec: "volta a Pending... perna B re-conciliável") e coerente com a semântica de correção (o operador re-faz A, gerando nova contrapartida). Sem ação; documentado no domínio.

#### Sugestão 2 — `reopen` sem evento próprio
Reabertura não emite evento (contrato só tem Created/Matched/Discarded). A trilha vem do `ReconciliationUndone` da perna B desfeita no mesmo undo. Consistente com o contrato; documentado.

## O que está bom

- **Atomicidade total:** `undoCounterpartOrigin` desfaz A + trata a contrapartida + (opcional) desfaz B numa única tx (helper `undoLeg` dedup A/B). **Validado no MySQL real: CA1 75/75.**
- **Domínio purista:** `discard`/`reopen` = funções puras + `Result` + `Readonly`; transições explícitas (Pending→Discarded, Matched→Pending); erros EN kebab.
- **Back-compat preservado:** `undoReconciliation` sem contrapartida segue o caminho `undo` original — os testes de undo existentes (CA7/CA8) passam intactos.
- **Regressão zero:** mudança de assinatura transversal ajustada em 4 callers com stubs corretos; 3959 unit + 75 integração verdes.

## Próximo passo
APPROVED → W3 (gate + OrbStack já verdes). Fecha a feature 029 → fecha #269.
