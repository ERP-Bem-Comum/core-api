# W0 — Testes (RED) · FIN-APPROVER-LIMIT-CASCADE

**Skill:** tdd-strategist (terreno mapeado por Explore)
**Data:** 2026-06-30T21:42Z
**Estado:** **RED** — `escalate` e a cascata no `save-document` ainda não existem.

## Arquivos (W0)

1. `tests/modules/financial/domain/document/approval-policy.test.ts` — **estendido** com o describe `escalate` (US3 cascata), CA1–CA5 + dois erros.
2. `tests/modules/financial/application/use-cases/save-document-cascade.test.ts` — **novo**, integração (memory, `cascadeReader` com `list()` multi-aprovador): CA6/CA7/CA8.

## Casos (mapeados ao 000-request)

### Domínio — `escalate(netValue, candidates): Result<ApproverAuthority, ApprovalError>`
- **CA1** único suficiente → encaminha a ele.
- **CA2** múltiplos suficientes → o de **menor** limite.
- **CA3** ignora `canApprove:false` e `limit:null`.
- **CA4a** nenhum suficiente **e** `length > 1` → `no-approver-with-sufficient-limit`.
- **CA4b** nenhum suficiente **e** `length <= 1` (só o indicado / vazio) → `approver-limit-exceeded` (preserva POLICY).
- **CA5** empate de limite ≥ líquido → estável por ordem de entrada.

### Integração — `saveDocument` (líquido 77500)
- **CA6** indicado A (50000) insuficiente + B (100000) suficiente → criado com `approverRef` **efetivo** = B + evento **`ApproverEscalated`** no outbox (`indicatedApproverRef=A`, `effectiveApproverRef=B`).
- **CA7** A (50000) + D (60000), ambos insuficientes (>1) → `no-approver-with-sufficient-limit`, não persiste.
- **CA8** indicado A (100000) suficiente → não escala, `approverRef=A`, **sem** evento.

## Evidência RED

```
✖ approval-policy.test.ts  ('test failed' — load error: escalate inexistente; + ApprovalError sem 'no-approver-with-sufficient-limit')
✖ CA6 — não escala (saveDocument bloqueia/não emite ApproverEscalated)
✖ CA7 — recebe 'approver-limit-exceeded' (POLICY), espera 'no-approver-with-sufficient-limit'
ℹ tests 4 · pass 1 (CA8 trivial) · fail 3
```

- **Domínio:** o arquivo não carrega — `import { escalate }` aponta para símbolo inexistente (padrão idiomático). Os 6 casos CA1–CA5 ficam RED.
- **CA6/CA7 (use-case):** RED por assertion — hoje o gate do POLICY bloqueia (`approver-limit-exceeded`) em vez de escalar. CA8 passa trivial (comportamento US1 preservado, sem cascata necessária).

## API alvo (W1)

- `approval-policy.ts`: `escalate(netValue, candidates): Result<ApproverAuthority, ApprovalError>` (dois erros) + `ApprovalError` ganha `'no-approver-with-sufficient-limit'`.
- `events.ts`: evento novo `ApproverEscalated { type, documentId, indicatedApproverRef, effectiveApproverRef }` na union `DocumentEvent` + `DOCUMENT_EVENT_TYPES` (anti-drift) + **excluído da trilha** (`TimelineEventType` Exclude, como `DocumentCancelled`) → **sem migration** (outbox-only).
- `save-document.ts`: ao `checkApprover` falhar por limite → `reader.list()` + `escalate`; acha ⇒ recria o input com `approverRef` efetivo + emite `ApproverEscalated`; não acha ⇒ propaga o erro conforme `escalate`.
- `error-mapping.ts`: `no-approver-with-sufficient-limit` → 422 PT.
- `submit-draft.ts`: cascata no submit é ponto de design (Document.submit re-deriva `approverRef` do draft) — avaliar no W1; pode ficar como follow-up se exigir mudar o domínio.
