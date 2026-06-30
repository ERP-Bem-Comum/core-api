# AUTH-MASS-APPROVE-SETTABLE — request

> Origem: issue #45 ([auth] Aprovador em Massa setável? — conflita com spec 005).
> Decisão do P.O. (2026-06-16) destravou o `needs-decision`. Ver comentário em #45.

## Problema

O front pede que a flag "Aprovador em Massa" (`massApprovalPermission`) seja **setável** na
criação e edição de usuário. Hoje ela é **read-only**, derivada das roles em
`get-user.ts:42-47`, e ausente do body de create/update (`users-schemas.ts`). A spec 005
(pré-2026-06-16) tratava como read-only — já **atualizada** (clarificação 2026-06-16 +
FR-005/FR-015) para refletir a reversão.

## Decisão (escopo fechado)

- **Concessão via role RBAC (atalho):** a flag concede/revoga a role dedicada
  `etl:mass-approver` (constante `MASS_APPROVER_ROLE_NAME`, `provision-legacy-user.ts:37`;
  carrega exatamente `contract:mass-approve`). RBAC segue como fonte única — sem 2º campo.
- **Reuso:** motor `assignRole`/`revokeRole` (idempotentes) + `resolveMassApproverRole`
  (busca-ou-cria a role por name, `provision-legacy-user.ts:67-90`).
- **Escopo:** setável no **create** (`create-user-by-admin`) e no **update**
  (`update-user-profile`).
- **Autorização (fail-closed):** além de `user:create`/`user:update`, o ator precisa de
  `user:assign-role` para setar a flag. Sem ela, a flag é recusada.
- **Idempotência:** setar para o estado atual é no-op (herda de assign/revoke).

## Fora de escopo

- Mudar o catálogo de permissões ou a definição da role (vivem na 006).
- Gestão de `collaboratorId` (FR-017, segue opaco).
- Qualquer outra role além de `etl:mass-approver`.

## Critérios de aceite (testáveis)

- **CA1 — create com flag `true`:** `POST /users` com `massApprovalPermission: true` cria o
  usuário **e** atribui a role `etl:mass-approver`; o `GET` de detalhe reflete
  `massApprovalPermission: true`.
- **CA2 — create sem flag / `false`:** comportamento atual preservado — nenhuma role de
  mass-approve atribuída; detalhe reflete `false`.
- **CA3 — update flag `true`:** `PUT /users/:id` com `true` atribui a role (idempotente se
  já tem); detalhe reflete `true`.
- **CA4 — update flag `false`:** `PUT /users/:id` com `false` revoga a role (idempotente se
  não tem); detalhe reflete `false`.
- **CA5 — flag ausente no update:** não altera o estado atual da permissão (patch parcial,
  FR-009).
- **CA6 — autorização fail-closed:** ator sem `user:assign-role` que tenta setar a flag é
  recusado (`forbidden`), mesmo tendo `user:create`/`user:update`.
- **CA7 — role inexistente:** se `etl:mass-approver` ainda não existe, é criada (busca-ou-cria)
  antes do assign, sem erro.

## Gate W3

`pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` verdes.
Regressão zero — nenhum teste existente de `create-user-by-admin` / `update-user-profile` /
`assign-role` / `revoke-role` pode quebrar.
