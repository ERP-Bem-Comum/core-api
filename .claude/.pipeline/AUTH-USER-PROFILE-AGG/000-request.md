# AUTH-USER-PROFILE-AGG — Extensão do agregado `User` (perfil + enable)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (Foundational, task T011/T012) · **Branch:** `005-gestao-usuarios`

## Contexto

O agregado `User` (`src/modules/auth/domain/identity/user/`) é hoje `ActiveUser | DisabledUser` sobre
`UserCore { id, email, passwordHash, roles }`. Não tem `name` nem campos de perfil; tem `disable` mas
**não** `enable`. Esta feature estende o domínio (VOs `Cpf`/`Telephone`/`ProfilePhotoRef` já existem).

## Escopo (ticket abrangente: domínio + mapper + schema + migration)

> **Correção de escopo:** ao implementar, o typecheck mostrou que estender `UserCore` quebra o
> `user.mapper.ts` (constrói `ActiveUser`/`DisabledUser`). Pela política de regressão zero e pela
> decisão de fatiamento ("ticket AGG abrangente incl. mapper/schema/migration"), este ticket inclui:
> schema `auth_user` (+5 colunas nullable), `user.mapper.ts` (reidratação + insert), e a migration `0004`.

- **`UserCore`** ganha campos de perfil **nullable**: `name: string | null`, `cpf: Cpf | null`,
  `telephone: Telephone | null`, `photo: ProfilePhotoRef | null`, `collaboratorId: string | null`.
- **`register`** passa a preencher esses campos como `null` (assinatura de input inalterada — não quebra
  `register-user`/OIDC).
- **`updateProfile(user, patch, at)`** (novo): aplica patch parcial de `name`/`cpf`/`telephone`/
  `collaboratorId` (campo ausente = mantém); retorna `{ user, event: UserProfileUpdated }`. Aceita `User`
  (active ou disabled — admin pode editar inativo).
- **`setPhoto(user, ref | null, at)`** (novo): define/remove `photo`; `{ user, event: UserProfileUpdated }`.
- **`enable(user, at)`** (novo): `DisabledUser → ActiveUser` (`status='active'`); `{ user, event: UserEnabled }`.
- Eventos novos: `UserProfileUpdated`, `UserEnabled` (payload só metadados — `userId`, `occurredAt`).

Fora de escopo: `UserCreated`/create-user-by-admin (US3), mapper/schema/migration (tickets `AUTH-USER-SCHEMA-PROFILE`/mapper), use cases.

## Critérios de aceite (viram `it()` no W0)

- **CA1**: `register` cria `ActiveUser` com perfil vazio (todos os campos de perfil `null`); eventos/anteriores intactos.
- **CA2**: `updateProfile` aplica `name`/`cpf`/`telephone`/`collaboratorId` e emite `UserProfileUpdated` (sem PII no payload).
- **CA3**: `updateProfile` com patch parcial (só `name`) preserva os demais campos.
- **CA4**: `setPhoto(user, ref)` define `photo`; `setPhoto(user, null)` remove; emite `UserProfileUpdated`.
- **CA5**: `enable(disabledUser, at)` retorna `ActiveUser` + `UserEnabled`.
- **CA6**: comportamentos existentes (`register`/`disable`/`changePassword`/`assignRole`) permanecem GREEN (não-regressão).

## Invariantes

- Domínio puro: `Result`/funções, sem `throw`/classe, `at: Date` injetado. Eventos sem segredo/PII.
- Campos de perfil nullable; obrigatoriedade fica no use case `create-user-by-admin` (US3).
