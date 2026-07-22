# FIN-APPROVER-LIMIT-POLICY — escopo

> Ticket 2/3 da feature 028 (`specs/028-fin-approver-limit/`). Módulo **financial**. Size **M**.
> US1 (Phase 3, MVP) do `tasks.md`. **Depende de** FIN-APPROVER-LIMIT-AUTH (mergeado, PR #294):
> consome `ApproverAuthorityReadPort` via `auth/public-api/read.ts`. **Bloqueia** o ticket CASCADE.

## Objetivo

Recusar o lançamento de um documento cujo **aprovador indicado** tem alçada (limite monetário do
papel) **< valor líquido**; aceitar quando **≥**. Validação aplicada no **create** e no **submit**
(Draft→Open #91), somente quando há `approverRef` **e** `netValue !== null`. Regra é **função pura**
no domínio do `financial`; o dado da alçada vem do `auth` via port (ACL — reconstrói `Money` de
`limitCents` na fronteira).

## Escopo (in)

1. **Port** (`application/ports/approver-authority-reader.ts`): `ApproverAuthority { userId, canApprove, limit: Money | null }` + `ApproverAuthorityReadError = 'approver-authority-unavailable'` + `ApproverAuthorityReader { get(userId), list() }`.
2. **Domínio** (`domain/document/approval-policy.ts`): `checkApprover(netValue: Money, authority: ApproverAuthority | null): Result<void, ApprovalError>` — **puro**. `ApprovalError = 'approver-not-found' | 'approver-missing-permission' | 'approver-limit-exceeded'` (o `'no-approver-with-sufficient-limit'` da cascata é do ticket CASCADE).
3. **Adapter do reader** (composition do financial): constrói via `buildAuthUserReadPort` e mapeia `ApproverAuthorityView.limitCents → Money` (`Money.fromCents`); falha de leitura do auth → `approver-authority-unavailable`.
4. **Integração nos use-cases**: `save-document.ts` (create) e `save-draft.ts` (submit Draft→Open) — após resolver `approverRef` e ter `netValue !== null`, `reader.get(approverRef)` → `checkApprover`. Erro propaga como `Result`.
5. **Borda**: mapear `approver-not-found` / `approver-missing-permission` / `approver-limit-exceeded` → **4xx PT** (dicionário em `cli/formatters` / error-mapping) sem vazar erro interno.

## Fora de escopo

- **Cascata** (`escalate`, `no-approver-with-sufficient-limit`) → ticket **CASCADE** (US3).
- Qualquer alteração no `auth` (alçada já entregue pelo AUTH/PR #294) ou no modelo de `Document` além de ler `netValue`/`approverRef` já existentes.
- Gestão da alçada na borda de papéis (foi US2 do AUTH).

## Critérios de aceite (tabela-verdade `checkApprover`)

- **CA1** `authority === null` → `err('approver-not-found')`.
- **CA2** `canApprove === false` → `err('approver-missing-permission')`.
- **CA3** `canApprove && limit === null` → `err('approver-limit-exceeded')` (sem alçada bloqueia, FR-008).
- **CA4** `canApprove && limit < netValue` → `err('approver-limit-exceeded')`.
- **CA5** `canApprove && limit >= netValue` → `ok(undefined)` (inclui o caso `limit === netValue`).
- **CA6** (integração) `POST /financial/documents` com aprovador de alçada **< líquido** → **4xx PT** sem vazar interno; com alçada **≥ líquido** → criado.
- **CA7** (integração) submit Draft→Open com aprovador de alçada insuficiente → recusado; suficiente → transiciona.
- **CA8** create/submit **sem `approverRef`** ou com **`netValue === null`** (Draft sem líquido) → **não** valida alçada (passa).
- **CA9** falha de leitura do auth (port) → `approver-authority-unavailable` mapeado para 4xx PT (degrada sem vazar interno).

## Definition of Done

Gate W3 verde (`typecheck` + `format:check` + `lint` + `test`) + `test:integration:financial` verde no
MySQL real (x99) cobrindo CA6/CA7. `checkApprover` 100% pela tabela-verdade (CA1–CA5) em teste de
domínio puro.
