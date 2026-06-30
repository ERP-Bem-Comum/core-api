# Code Review — Ticket FIN-APPROVER-LIMIT-CASCADE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-30T21:57Z
**Escopo revisado:**

- `domain/document/approval-policy.ts` (`escalate` + erro novo)
- `domain/document/events.ts` (`ApproverEscalated` + anti-drift + exclusão da trilha)
- `domain/timeline/projection.ts` (guard)
- `application/use-cases/save-document.ts` (cascata + recriação + evento)
- `adapters/http/error-mapping.ts`
- testes: `approval-policy.test.ts` (escalate), `save-document-cascade.test.ts`

---

## Issues encontradas

### 🔴 Crítica

Nenhuma.

### 🟡 Importante (identificada e **corrigida** nesta passada)

#### Issue 1 — `save-document.ts` — duplicação do input de `Document.create` (≈25 campos) → CORRIGIDA

**Categoria:** clareza/manutenção (DRY).
**Problema:** a cascata recriava o `Document` repetindo literalmente os ~25 campos do `create` original — risco real de drift (precedente: `paymentDetail` #273 exigiu tocar o create; com a duplicação exigiria lembrar de 2 lugares).
**Correção aplicada (coordenador, antes do W3):** extraído `const createInput = {...} satisfies Parameters<typeof Document.create>[0]`; o `create` usa `createInput` e a cascata reusa `{ ...createInput, approverRef: efetivo }` (mesmo `id`). Typecheck verde, 15/15 testes do `save-document` verdes após a extração.

### 🔵 Sugestão

Nenhuma pendente.

---

## O que está bom

- **`escalate` puro e idiomático.** Filtro com **type predicate** (`c is ApproverAuthority & { limit: Money }`) refina o tipo sem `as`/`push`; `reduce` escolhe o menor limite com empate estável. Dois erros conforme decisão 2 — `approver-limit-exceeded` para "sem cascata possível" (≤1) preserva o POLICY (os testes do POLICY seguem válidos, confirmado).
- **Evento `ApproverEscalated` correto.** Adicionado à union + `DOCUMENT_EVENT_TYPES` (anti-drift `exhaustiveStringUnion` — sem isso `tsc` quebraria) e **excluído da trilha** (`TimelineEventType`), indo só ao outbox → **sem migration** (CHECK `ck_fin_tl_event_type` intocado). O guard de `projectEntry` foi atualizado coerentemente (com comentário) — ajuste necessário e bem justificado.
- **Cascata bem escopada.** Só `approver-limit-exceeded` aciona o `escalate`; `approver-not-found`/`approver-missing-permission` propagam direto (não faz sentido escalar). O efetivo é reidratado (`UserRef.rehydrate`) e o documento recriado com o mesmo `id`; o evento carrega `indicatedApproverRef` ≠ `effectiveApproverRef` (auditoria, decisão 1). Falha da cascata não persiste nada.
- **Borda sem vazamento.** `no-approver-with-sufficient-limit` → 422 (default), mensagem PT-BR, slug não vaza.
- **Testes proporcionais.** Domínio `escalate` 6/6 (menor limite, ignora inválidos, dois erros, empate); integração `save-document-cascade` 3/3 (encaminha + evento; >1 sem suficiente → erro; suficiente → não escala). Fakes injetados (não mocks).

---

## Próximo passo

- **APPROVED** → **W3** (gate `typecheck` + `format:check` + `lint` + `test`). A refatoração da Issue 1 entra no gate.
- Follow-up registrado no `003-impl/REPORT.md`: cascata no `submit-draft` (re-derivação do `approverRef` no `Document.submit`).
