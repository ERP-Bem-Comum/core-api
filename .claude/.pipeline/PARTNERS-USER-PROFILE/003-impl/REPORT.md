# W1 — GREEN · PARTNERS-USER-PROFILE

**Skills:** ts-domain-modeler + ports-and-adapters · **Resultado:** GREEN (domínio 8/8, app 10/10; partners 217/217)

## Arquivos criados

**Domínio** `src/modules/partners/domain/user-profile/`
- `types.ts` — `UserProfile` (`userRef` como identidade, `name`, `cpf`, `telephone`, `avatarUrl`,
  `collaboratorRef`); inputs de create/update/rehydrate.
- `events.ts` — `UserProfileCreated`/`ContactUpdated`/`CollaboratorLinked`.
- `errors.ts` — `user-profile-name-required`/`-telephone-required`/`invalid-cpf`.
- `user-profile.ts` — `create`/`updateContact`/`linkCollaborator`/`rehydrate` (cpf imutável; sem soft-delete).
- `repository.ts` (port) — `findByUserRef`/`findByCpf`/`save`; erros repo-unavailable/cpf-duplicate.

**Adapter** `adapters/persistence/repos/user-profile-repository.in-memory.ts` — `Map<UserRef, UserProfile>`.

**Aplicação** `application/use-cases/` — `create-user-profile`, `update-user-profile-contact`,
`link-collaborator-to-profile`, `get-user-profile`, `find-user-profile-by-cpf`.

## Decisões de design

- **Identidade = `userRef`** (1:1 com auth.User); sem UUID próprio. **Zero import de `auth/domain/`** —
  só `UserRef` do shared kernel (ADR-0006). Sem FK física (ADR-0014).
- **`collaboratorRef`** via `CollaboratorId` (mesmo módulo), opcional, setado por `linkCollaborator`.
- **`cpf` imutável** após create; `name`/`telephone`/`avatarUrl` mutáveis via `updateContact`.
- **Sem soft-delete** — ciclo de vida segue o `auth.User`.

## Confirmação GREEN

```
domínio:   8/8     app: 10/10     suíte partners: 217/217
```
