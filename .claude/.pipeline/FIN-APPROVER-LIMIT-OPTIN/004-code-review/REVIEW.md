# Code Review — FIN-APPROVER-LIMIT-OPTIN — Round 1

**Veredito:** APPROVED
**Reviewer:** code-reviewer · **Data:** 2026-06-30T22:46Z
**Escopo:** `approval-policy.ts` (`checkApprover`) + testes (`approval-policy.test.ts`, `save-document-approver-limit.test.ts`).

## Issues
- 🔴/🟡: nenhuma.
- 🔵 (registrada): `escalate` ainda filtra `c.limit !== null` — a nova semântica (`null` = sem limite = aprova) deveria valer também na cascata, senão um aprovador sem limite é ignorado como destino de cascata. Só impacta pós-go-live (alçadas finitas). **Follow-up** (issue), fora do escopo do blocker.

## O que está bom
- **Corrige exatamente o blocker** (issue #299): remove o fail-closed; `limit null = aprova`. Regra
  binária preservada (CA2 `!canApprove → missing-permission`); enforcement do teto preservado só
  quando há limite (CA4/CA5). Mudança mínima e legível.
- **Sem regressão**: os casos de alçada finita (CASCADE, submit, rota) seguem verdes; suíte 3287 pass.
- **Testes refletem a inversão**: CA3 (domínio) e CA6 (use-case end-to-end do go-live) provam que
  aprovador `payable:approve` sem limite cria o documento. Comentário enganoso do CA8 corrigido.
- **Rastreabilidade**: comentário no código cita #299 e a origem (decisão da P.O.); reverte o FR-008
  fail-closed da 028 de forma documentada.

## Próximo passo
- **APPROVED** → W3 (gate já verde na sessão principal). Abrir issue de follow-up do `escalate`.
