# W1 — Implementação · FIN-APPROVER-LIMIT-OPTIN

**Skill:** ts-domain-modeler (sessão principal). **Estado:** **GREEN**.

## Implementado
- `src/modules/financial/domain/document/approval-policy.ts` (`checkApprover`): removido o ramo
  fail-closed `if (authority.limit === null) return err('approver-limit-exceeded')`. Agora o teto só
  é enforçado quando `limit !== null` (`if (limit !== null && net > limit) → exceeded`). `limit null`
  = sem limite configurado = **aprova** (regra binária da P.O., #299).

## Testes
- `approval-policy.test.ts` CA3 → `ok`; `save-document-approver-limit.test.ts` CA6 (#299) aprovador
  sem limite → cria. Demais casos (CA4/CA5 alçada finita, cascata, submit, rota) intocados e verdes.

## Gates (sessão principal)
- `tsc`: 0 erros · `prettier --check .`: OK · `eslint .`: exit 0.
- `pnpm test`: **3305 / 3287 pass / 0 fail / 18 skip** — zero regressão.

## Follow-up
- `escalate` mantém `c.limit !== null` no filtro (candidato sem limite ignorado na cascata) —
  diverge da nova semântica, mas só atua pós-go-live (alçadas finitas). Registrar via issue.
