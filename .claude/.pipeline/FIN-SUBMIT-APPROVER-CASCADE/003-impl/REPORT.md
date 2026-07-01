# W1 — GREEN · FIN-SUBMIT-APPROVER-CASCADE

Disciplina: **`ts-domain-modeler`** (override no agregado) + **`ports-and-adapters`** (cascata no use-case). Mínimo, sem migration.

## Mudanças

| Arquivo | Mudança |
| :-- | :-- |
| `domain/document/document.ts` | `submit(draft, approverRefOverride?: UserRef)` — `approverRef: approverRefOverride ?? draft.approverRef` no `create`. Param opcional (não quebra chamadas atuais). |
| `application/use-cases/submit-draft.ts` | bloco de cascata espelhando `save-document.ts`: em `approver-limit-exceeded`, `reader.list()` + `escalate` + re-submit com efetivo + `ApproverEscalated` no outbox. `outcome`/`cascadeEvents` alimentam timeline+save. União `SubmitDraftError` ganha `UserRef.UserRefError`. |

## Decisões

- **Só `approver-limit-exceeded` escala** — not-found/missing-permission propagam direto (idêntico ao create).
- **`ApproverEscalated` só ao outbox**, não à timeline (timeline usa `outcome.events[0]` = marco de submissão).
- **Narrow preservado** — `indicatedApproverRef` capturado em const antes dos `await` (evita widening de `UserRef | null`).

## Verificação

- Teste do ticket `submit-draft-cascade.test.ts`: **3/3 GREEN** (CA1/CA2 + CA3 regressão).
- Cluster vizinho (submit-limit, save cascade/limit/base, transitions, draft): **29/29 GREEN** — create intocado, zero regressão.
- `pnpm run typecheck`: **verde** — a assinatura opcional de `submit` não quebrou consumidor.
