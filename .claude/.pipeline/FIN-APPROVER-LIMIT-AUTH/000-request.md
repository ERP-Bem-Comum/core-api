# FIN-APPROVER-LIMIT-AUTH — escopo

> Ticket 1/3 da feature 028 (`specs/028-fin-approver-limit/`). Módulo **auth**. Size **M**.
> Foundational (Phase 2) + US2 (Phase 4) do `tasks.md`. **Bloqueia** os tickets POLICY e CASCADE.

## Objetivo

Tornar a **alçada de aprovação** (limite monetário) um atributo do **papel (RBAC)** e expô-la, de forma read-only, pela `public-api` do auth — **autocontido** (FR-007a): reaproveita o agregado `Role` existente, sem reformular o RBAC e sem dependência em #45/spec 005.

## Escopo (in)

1. **Domínio:** `Role.approvalLimit: Money | null` + erro `role-approval-limit-invalid`; `setApprovalLimit`; `create`/`rehydrate` aceitam `approvalLimitCents`.
2. **Persistência:** coluna `auth_role.approval_limit_cents BIGINT NULL` + migration (`db:generate`, ALTER ADD INSTANT, sem hint); mapper persiste/rehidrata.
3. **public-api (leitura):** `ApproverAuthorityView { userId, canApprove, limitCents }`; `getApproverAuthority(userId)` e `listApproversWithAuthority()` (autoridade efetiva = MAX dos papéis com `payable:approve`).
4. **Borda (US2):** `POST/PATCH /api/v1/roles` aceitam `approvalLimitCents` (Zod int ≥0 nullable optional).

## Fora de escopo

- Regra `alçada ≥ líquido` e cascata (tickets POLICY/CASCADE, módulo financial).
- Qualquer toque em `mass-approver-role` (#45) ou no modelo de papéis além da coluna nova.

## Critérios de aceite

- **CA1** `Role.create({..., approvalLimitCents: 100000})` → `approvalLimit.cents === 100000`.
- **CA2** `approvalLimitCents` ausente/`null` → `approvalLimit === null` (papel sem alçada).
- **CA3** `approvalLimitCents < 0` → `err('role-approval-limit-invalid')`.
- **CA4** `setApprovalLimit(role, n|null)` atualiza/zera; `<0` → erro.
- **CA5** `rehydrate` preserva a alçada persistida.
- **CA6** (integração) `getApproverAuthority(user com papel payable:approve + limite)` → `{ canApprove:true, limitCents }`; MAX entre papéis; sem permissão → `canApprove:false`; sem limite → `limitCents:null`; inexistente → `ok(null)`.
- **CA7** (integração) `listApproversWithAuthority()` retorna os aprovadores com `payable:approve` + limites.
- **CA8** (borda) `POST/PATCH /roles` aceitam e refletem `approvalLimitCents`; `<0`/não-int → 400.

## Definition of Done

Gate W3 verde (`typecheck` + `format:check` + `lint` + `test`) + `test:integration:auth` verde no MySQL real.
