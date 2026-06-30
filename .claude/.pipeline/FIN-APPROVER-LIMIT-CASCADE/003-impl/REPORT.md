# W1 — Implementação · FIN-APPROVER-LIMIT-CASCADE

**Skills/agentes:** ts-domain-modeler (escalate, sessão principal) + fastify-server-expert (evento + cascata no save-document + error-mapping).
**Estado:** **GREEN** (US3). Cascata no **create**; cascata no **submit** = follow-up (ver abaixo).

## Implementado

### Domínio (puro)
- `domain/document/approval-policy.ts`: `escalate(netValue, candidates): Result<ApproverAuthority, ApprovalError>` — filtra suficientes (`canApprove && limit !== null && limit >= net`, via **type predicate** no `filter`, sem `as`/`push`); **menor** limite vence (`reduce`, empate estável por ordem). Dois erros (decisão 2): `length <= 1` sem suficiente → `approver-limit-exceeded`; `> 1` → `no-approver-with-sufficient-limit`. `ApprovalError` ganhou `'no-approver-with-sufficient-limit'`.

### Evento de domínio (auditoria — decisão 1)
- `domain/document/events.ts`: novo `ApproverEscalated { type, documentId, indicatedApproverRef: UserRef, effectiveApproverRef: UserRef }` na union `DocumentEvent` + `DOCUMENT_EVENT_TYPES` (anti-drift `exhaustiveStringUnion`). **Excluído da trilha** (`TimelineEventType`/`TIMELINE_EVENT_TYPES`, junto de `DocumentCancelled`) → **vai só ao outbox, sem migration** (CHECK `ck_fin_tl_event_type` intocado).
- `domain/timeline/projection.ts`: guard `projectEntry` excluí `ApproverEscalated` (consequência da exclusão da trilha — necessário p/ `tsc`; regressão zero, validado em `projection.test.ts`).

### Integração (create)
- `application/use-cases/save-document.ts`: quando `checkApprover` falha por **`approver-limit-exceeded`** → `reader.list()` + `escalate`. Sucesso ⇒ **recria** o `Document` (mesmo `id`, `approverRef` = efetivo) e emite `ApproverEscalated` (anexado ao array de eventos do `repo.save`). `approver-not-found`/`approver-missing-permission` **não** escalam (propagam). Falha do `escalate` propaga (`approver-limit-exceeded` ou `no-approver-with-sufficient-limit`); nada é persistido.

### Borda
- `adapters/http/error-mapping.ts`: `'no-approver-with-sufficient-limit'` → mensagem PT-BR, default **422**; slug não vaza.

## Decisões aplicadas (do solicitante)
- **D1 — encaminha + audita:** documento com `approverRef` efetivo + evento `ApproverEscalated` (indicado→efetivo) no outbox. Sem migration.
- **D2 — dois erros:** `approver-limit-exceeded` preservado para "sem cascata possível" (≤1 candidato) — os testes do POLICY **seguem válidos** sem ajuste.

## Testes
- `approval-policy.test.ts`: `checkApprover` (6) + `escalate` (6) — **12/12**.
- `save-document-cascade.test.ts`: CA6 (encaminha + evento), CA7 (>1 sem suficiente → no-approver-with-sufficient-limit), CA8 (suficiente → não escala) — **3/3**.

## Gates (W1 — verde, sessão principal)
- `tsc --noEmit`: **0 erros**.
- `prettier --check .`: **OK** (arquivos do sub-agente + os meus reformatados na principal).
- `eslint .`: **exit 0**.
- `pnpm test` (suíte completa): **3300 / 3282 pass / 0 fail / 18 skip** — zero regressão.

## Follow-up (registrado)
- **Cascata no `submit-draft` (Draft→Open):** não incluída — `Document.submit` re-deriva `approverRef` do draft no domínio, exigindo mudança no agregado para gravar o efetivo. Fica como follow-up; o submit hoje aplica o gate do POLICY (bloqueia `approver-limit-exceeded`, sem cascata).
