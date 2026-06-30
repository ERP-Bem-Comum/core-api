# Code Review — FIN-59a-1-MANUAL-PAYMENT (#223) — Round 1

**Veredito:** APPROVED · **Reviewer:** code-reviewer · **Data:** 2026-06-23

**Escopo:** domínio (op + evento + erros), migration 0020 (CHECK trilha), use-case, testes (domínio +
use-case + integração).

## Análise
- **Modelagem nível-título** (decisão do humano) bem isolada: `payPayableManually` flipa UM payável dentro
  do `ApprovedDocument`, sem nova variante de documento nem coluna nova (o `Payable.status` já é por-linha).
  Relaxa a invariante "payable espelha documento" — documentada no código. Documento segue `Approved`
  (rollup adiado, registrado).
- **Guards corretos**: só `Approved` vira `Pago` (`payable-not-approved`); título inexistente
  (`payable-not-found`). Idempotência negativa provada (não paga 2x).
- **Evento na trilha**: `PayableManuallyPaid` adicionado às listas exaustivas (anti-drift) + migration 0020
  relaxa o CHECK `ck_fin_tl_event_type`. Sem essa migration a trilha rejeitaria a baixa — coberto por teste
  de integração.
- **Use-case** espelha `approve-document`: evento gravado na MESMA tx (atomicidade #127), trilha com actor,
  optimistic lock via `expectedVersion`. Sem `throw`/`class`/`any`; `Result` em toda borda.
- **Motivo opcional** (decisão): `reason?` propagado ao evento só quando presente (exactOptionalPropertyTypes).

## Issues
Nenhuma 🔴/🟡. 🔵 Rollup do documento p/ `Pago` (quando todos os títulos pagos) fica p/ fatia futura —
registrado como não-objetivo. Borda HTTP = #224.

APPROVED → W3 (gate verde).
