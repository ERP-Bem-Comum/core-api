# FIN-APPROVER-LIMIT-CASCADE — escopo

> Ticket 3/3 (último) da feature 028 (`specs/028-fin-approver-limit/`). Módulo **financial**. Size **S→M**.
> US3 (Phase 5) do `tasks.md`. **Depende de** FIN-APPROVER-LIMIT-POLICY (mergeado, PR #295): reusa
> `approval-policy.ts` (`checkApprover`/`ApproverAuthority`) e o `ApproverAuthorityReader`.

## Objetivo

Quando o **aprovador indicado** tem alçada **insuficiente** (líquido > limite), em vez de bloquear,
**encaminhar ao próximo aprovador com alçada suficiente** (FR-009, cascata). Cadeia derivada dos
papéis aprovadores ordenados por alçada; escolhe o de **menor** limite ≥ líquido. Se nenhum aprovador
tem alçada suficiente → erro `no-approver-with-sufficient-limit`.

## Escopo (in) — atualizado pelas decisões do solicitante (2026-06-30)

1. **Domínio `escalate`** (`domain/document/approval-policy.ts`): `escalate(netValue, candidates): Result<ApproverAuthority, ApprovalError>` — **puro**. Filtra `c.canApprove && c.limit !== null && c.limit >= netValue`; **menor** `limit` vence (empate: estável por ordem de entrada). **Dois erros** (decisão 2): nenhum suficiente **e** `candidates.length <= 1` (só o indicado, sem cascata possível) ⇒ `approver-limit-exceeded`; `candidates.length > 1` e nenhum suficiente ⇒ `no-approver-with-sufficient-limit`.
2. **Integração** (`save-document.ts` + `submit-draft.ts`): `checkApprover` falha por limite → `reader.list()` + `escalate`. Acha ⇒ documento criado/submetido com `approverRef` **efetivo** (encaminhado) **+ registro de auditoria do encaminhamento** (decisão 1). Não acha ⇒ propaga `approver-limit-exceeded` ou `no-approver-with-sufficient-limit` conforme (1).
3. **Auditoria do encaminhamento (decisão 1 — escopo NOVO):** registrar **indicado original vs. efetivo**. Mecanismo preferido (a confirmar no W1): **evento de domínio** `ApproverEscalated { documentId, indicatedApproverRef, effectiveApproverRef, occurredAt }` publicado no outbox + entrada na trilha (Time Travel), **sem migration** (o `Document.approverRef` guarda o efetivo; o indicado vive no evento/trilha). Alternativa (mais invasiva): coluna `indicated_approver_ref` no documento. Princípio: auditoria mínima sem reformar o schema.
4. **Borda** (`error-mapping.ts`): `no-approver-with-sufficient-limit` → 422 PT (default), sem vazar slug.

## Decisões do solicitante (registradas)

- **Decisão 1 — "Encaminha mas mantém registro":** o documento prossegue com o aprovador efetivo, mas o encaminhamento (indicado → efetivo) é **auditado** (evento/trilha). Amplia o escopo: tamanho passa de **S para M**.
- **Decisão 2 — "Manter ambos os erros":** `approver-limit-exceeded` permanece para o caso **sem cascata possível** (lista de candidatos ⊆ {indicado}); `no-approver-with-sufficient-limit` só quando há **>1** candidato e nenhum suficiente.

**Impacto nos testes do POLICY:** com a decisão 2, o caso "alçada insuficiente, lista só com o
indicado" **mantém** `approver-limit-exceeded` → os testes `save-document-approver-limit`/
`submit-draft-approver-limit` do POLICY **seguem válidos** (o fake `list()` retorna `[indicado]`,
`length <= 1`). Novos casos cobrem a cascata (>1 candidato).

## Fora de escopo

- Mudança no `auth` ou no modelo de alçada (entregue no AUTH).
- Notificação/auditoria do encaminhamento (quem foi o indicado vs. o efetivo) — não há FR nesta fatia.

## Critérios de aceite

- **CA1** (domínio) `escalate(net, [A(1k), B(10k)])` com `net=5k` → `ok(B)` (menor limite ≥ líquido; A insuficiente, B suficiente, B é o único ≥).
- **CA2** (domínio) múltiplos suficientes → retorna o de **menor** limite (ex.: `[B(10k), C(6k)]`, net=5k → C).
- **CA3** (domínio) candidato sem permissão (`canApprove:false`) ou sem alçada (`limit:null`) é ignorado.
- **CA4a** (domínio, decisão 2) nenhum suficiente **e** `candidates.length > 1` → `err('no-approver-with-sufficient-limit')`.
- **CA4b** (domínio, decisão 2) nenhum suficiente **e** `candidates.length <= 1` (só o indicado) → `err('approver-limit-exceeded')`.
- **CA5** (domínio) empate de limite ≥ líquido → estável por ordem de entrada.
- **CA6** (integração) documento indicado a aprovador insuficiente, com outro suficiente na lista → **criado** com `approverRef` efetivo (encaminhado) **+ evento/trilha `ApproverEscalated`** (decisão 1).
- **CA7** (integração) >1 candidato, nenhum suficiente → **422 PT** (`no-approver-with-sufficient-limit`) sem vazar interno; lista só com o indicado → **422 PT** (`approver-limit-exceeded`, comportamento POLICY preservado).
- **CA8** (integração) aprovador indicado **suficiente** → não escala (comportamento US1 preservado; sem evento de encaminhamento).
- **CA9** (auditoria, decisão 1) o registro do encaminhamento expõe `indicatedApproverRef` ≠ `effectiveApproverRef`.

## Definition of Done

Gate W3 verde (`typecheck` + `format:check` + `lint` + `test`). `escalate` 100% pela tabela
(CA1–CA5) em teste de domínio puro; cascata coberta no use-case/rota em memory (CA6–CA8). Testes do
POLICY afetados ajustados (regressão zero).
