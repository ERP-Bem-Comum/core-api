# W0 — Testes (RED) · FIN-APPROVER-LIMIT-OPTIN

**Skill:** tdd-strategist
**Data:** 2026-06-30T22:42Z
**Estado:** **RED** — `checkApprover` ainda é fail-closed (`limit null → exceeded`).

## Mudança de semântica (issue #299)
`limit === null` deixa de ser fail-closed (recusa) e passa a ser **opt-in** (sem limite = aprova).
Os testes que codificavam o fail-closed foram atualizados para a nova regra → RED contra o código atual.

## Casos atualizados/adicionados
- `approval-policy.test.ts` **CA3** (`checkApprover`): `authority(true, null)` agora espera **`ok`** (antes: `approver-limit-exceeded`).
- `save-document-approver-limit.test.ts` **CA6 (#299)**: aprovador `payable:approve` + `approverRef` + papel **sem** limite (`limit null`) → documento **criado** (antes recusava). Comentário do CA8 corrigido.

## Evidência RED
```
ℹ tests 16 · pass 14 · fail 2
✖ CA3 (#299): canApprove sem limite (limit null) → ok   (recebe approver-limit-exceeded)
✖ CA6 (#299): aprovador sem limite → cria o documento   (recebe recusa)
```

## API alvo (W1)
- `checkApprover` (`approval-policy.ts`): remover o ramo `if (authority.limit === null) return err('approver-limit-exceeded')`; enforçar só `if (limit !== null && net > limit)`.

## Fora de escopo (registrado)
- `escalate` (cascata) mantém `c.limit !== null` no filtro — coerência diverge da nova semântica, mas só atua pós-go-live. Follow-up via issue.
