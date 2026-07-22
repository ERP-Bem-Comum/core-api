# FIN-APPROVER-LIMIT-OPTIN — escopo

> Issue #299 — **go-live blocker (P1)**. Módulo **financial**. Size **S**. Bug fix da feature 028.
> **Reverte o FR-008 fail-closed** da 028 (decisão original do clarify) por decisão da **P.O.**
> (lekadecastro): a regra de aprovação é **binária** (`payable:approve`), alçada é **opt-in**.

## Problema (go-live blocker)

`checkApprover` (`src/modules/financial/domain/document/approval-policy.ts:28`) é **fail-closed**:
`limit === null → approver-limit-exceeded`. Como **todos os papéis nascem com
`approval_limit_cents = NULL`**, o efeito é que **toda aprovação com aprovador indicado é recusada**
no go-live (validado e2e: documento R$ 500 + aprovador válido → recusado). Quebra a aprovação que já
funcionava antes da 028.

## Correção (mínima, conforme #299)

Tornar a alçada **opt-in**: `limit === null` = **sem limite configurado → permite** (não bloqueia).
Enforçar o limite **só quando `limit !== null`**:

```ts
if (authority === null) return err('approver-not-found');              // CA1 (mantém)
if (!authority.canApprove) return err('approver-missing-permission');  // CA2 (mantém — regra binária)
if (authority.limit !== null && Money.greaterThan(netValue, authority.limit))
  return err('approver-limit-exceeded');                               // CA4 só quando há limite
return ok(undefined);                                                  // limit null = sem limite = aprova
```

Remove o **CA3 fail-closed** (`limit === null → exceeded`).

## Escopo (in)

1. **Domínio** `checkApprover`: remover o ramo `limit === null → exceeded`; manter o enforcement só com `limit !== null`.
2. **Testes**: atualizar `approval-policy.test.ts` (CA3 do `checkApprover` passa de `exceeded` → `ok`); revisar comentários enganosos em `save-document-approver-limit.test.ts` (o reader "que bloquearia" não bloqueia mais por `limit null`).

## Fora de escopo

- **`escalate` (cascata):** a issue pede só o `checkApprover`. O `escalate` ainda filtra
  `c.limit !== null` (candidato sem limite é ignorado na cascata) — coerência diverge da nova
  semântica, mas só atua **pós-go-live** (exige alçadas finitas configuradas). **Registrar como
  follow-up** (issue), não consertar neste blocker.
- Mudança de schema/migration (a coluna `approval_limit_cents NULL` já serve para "sem limite").
- Frontend (já implementa a regra binária — dropdown lista só `payable:approve`).

## Critérios de aceite

- **CA1** `authority === null` → `approver-not-found` (mantém).
- **CA2** `!canApprove` → `approver-missing-permission` (mantém — regra binária).
- **CA3 (NOVO)** `canApprove && limit === null` → **`ok`** (sem limite = aprova). *(antes: exceeded — fail-closed)*
- **CA4** `canApprove && limit !== null && net > limit` → `approver-limit-exceeded` (enforça só com limite).
- **CA5** `canApprove && limit !== null && limit >= net` → `ok`.
- **CA6** (integração) documento com aprovador `payable:approve` e papel **sem** `approval_limit_cents` → **criado** (não recusado).

## Definition of Done

Gate W3 verde (`typecheck` + `format:check` + `lint` + `test`). Atualizar a spec 028 (FR-008) e a
issue #289 não é obrigatório aqui, mas o PR referencia #299. Zero regressão nos demais testes da 028.
