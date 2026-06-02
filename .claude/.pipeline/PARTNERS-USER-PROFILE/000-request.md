# PARTNERS-USER-PROFILE — Agregado de perfil de usuário (domínio + aplicação)

> **Size:** M · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · ADR-0006 (cross-módulo via public-api/ID) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 5, D5). Skills: `ts-domain-modeler`, `ports-and-adapters`.

## Contexto

Legado `users` mistura **autenticação** (email/password/roles → módulo `auth`) e **perfil**
(name/cpf/telephone/imageUrl/collaboratorId). D5 (banca): **agregado de perfil SEPARADO** em `partners`,
que referencia `auth.User` **por ID via `UserRef`** (`#src/shared/kernel/user-ref.ts` — branded,
rehydrate-only), nunca importando de `auth/domain/` nem com FK física (ADR-0006/0014).

### Fronteira auth ↔ partners (o que NÃO duplicar)

`auth.User` já cobre `email`/`passwordHash`/`roles`/`status` (`auth/domain/identity/user/types.ts`). O
perfil cobre **só** o que falta: `name`, `cpf`, `telephone`, `avatarUrl`, `collaboratorRef`.

### Decisões de design

- **Identidade = `userRef`** (1:1 com `auth.User`). Sem UUID próprio redundante: o perfil não existe sem
  o user. PK natural = `user_ref`.
- **Sem soft-delete próprio** — o ciclo de vida ativo/inativo é do `auth.User` (`status`); o perfil segue.
- **`cpf` imutável** após criação (identidade fiscal); `name`/`telephone`/`avatarUrl` mutáveis.
- **`collaboratorRef`** opcional — vínculo ao agregado `Collaborator` (mesmo módulo) via `CollaboratorId`.

## Escopo

**Domínio** `src/modules/partners/domain/user-profile/`
1. `types.ts` — `UserProfile` (`userRef`, `name`, `cpf: Cpf`, `telephone`, `avatarUrl: string|null`,
   `collaboratorRef: CollaboratorId|null`); `CreateUserProfileInput`, `UpdateContactInput`, `RehydrateUserProfileInput`.
2. `events.ts` — `UserProfileCreated`, `UserProfileContactUpdated`, `UserProfileCollaboratorLinked` (EN passado, `occurredAt` injetado).
3. `errors.ts` — kebab EN (`user-profile-name-required`, `user-profile-telephone-required`, `invalid-cpf`, …).
4. `user-profile.ts` — `create` (valida name/telephone não-vazios + `Cpf.parse`), `updateContact`
   (name/telephone/avatarUrl; cpf intocado), `linkCollaborator(profile, collaboratorRef)`, `rehydrate` (sem evento).
5. `repository.ts` (port) — `UserProfileRepository`: `findByUserRef`, `findByCpf`, `save`. Erros:
   `'user-profile-repo-unavailable'`, `'user-profile-cpf-duplicate'`.

**Aplicação** `src/modules/partners/application/use-cases/` (curried `(deps) => (cmd)`)
6. `create-user-profile.ts` — gera nada (id = userRef rehydrated), `clock.now()`, `UserProfile.create`,
   guard de `userRef` já existente (`findByUserRef`) e cpf duplicado (`findByCpf`), `save`.
7. `update-user-profile-contact.ts` — `findByUserRef` (not-found) → `UserProfile.updateContact` → `save`.
8. `link-collaborator-to-profile.ts` — `findByUserRef` → `UserProfile.linkCollaborator(collaboratorRef)` → `save`.
9. `get-user-profile.ts` (query) — `UserRef.rehydrate` → `findByUserRef`.
10. `find-user-profile-by-cpf.ts` (query) — `Cpf.parse` → `findByCpf`.

**Adapter** `src/modules/partners/adapters/persistence/repos/user-profile-repository.in-memory.ts`
11. `Map<UserRef, UserProfile>`; `save` recusa cpf duplicado com userRef diferente.

## Fora de escopo

- **`massApprovalPermission`** — D5: vira `Permission` (`'approval:mass-approve'`) no **RBAC do auth**;
  é trabalho do módulo auth, não do perfil. Registrar follow-up no auth (não há campo booleano no perfil).
- **Persistência Drizzle** (`par_user_profiles`, migration, mapper, repo real) — follow-up
  `PARTNERS-USER-PROFILE-PERSISTENCE` (mesmo padrão de fatiamento do collaborator).
- Borda HTTP/CLI (`/users`, `/users/me`, avatar upload multipart); criação do `auth.User` (é do auth).
- ETL de `users` (depende de D6 — senha legada).

## Critérios de aceite

- [ ] `UserProfile.create` exige name/telephone não-vazios e cpf válido; nasce com `collaboratorRef=null`; emite `UserProfileCreated`.
- [ ] `updateContact` altera name/telephone/avatarUrl e **preserva** cpf/userRef; emite `UserProfileContactUpdated`.
- [ ] `linkCollaborator` seta `collaboratorRef`; emite `UserProfileCollaboratorLinked`.
- [ ] `rehydrate` reconstrói com/sem `collaboratorRef`; sem evento.
- [ ] `createUserProfile`: 2º perfil para o mesmo `userRef` → `'create-user-profile-already-exists'`; cpf de outro userRef → `'create-user-profile-cpf-duplicate'`.
- [ ] `updateUserProfileContact`/`linkCollaboratorToProfile`: userRef inexistente → `*-not-found`; userRef malformado → `*-invalid-user-ref`.
- [ ] `getUserProfile` acha por userRef (`null` quando ausente); `findUserProfileByCpf` acha por cpf.
- [ ] Adapter InMemory recusa cpf duplicado (userRef distinto).
- [ ] W3 verde: typecheck + format:check + test + lint. **Zero import de `auth/domain/`** (só `UserRef` do kernel).

## Notas de disciplina

- Domínio puro: `Result<T,E>`, branded, `Readonly`/`immutable`, sem `throw`/`class`. IDs/instantes injetados.
- Cross-módulo: `UserRef` do kernel (não `auth/domain`); `CollaboratorId` do próprio módulo. Sem FK física (ADR-0014).
- Use case curried; tempo via `Clock`; erros kebab EN. Reusa VO `Cpf` do kernel.
