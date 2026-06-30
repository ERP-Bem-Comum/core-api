# AUTH-GET-USER — Detalhe do usuário (US2): use case + rota HTTP

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US2, tasks T024–T027) · **Branch:** `005-gestao-usuarios`

## Escopo

US2 (ver detalhe). **Reusa** `UserReader.findById` (já reidrata o perfil via mapper) — **sem** adapter
Drizzle novo nem migration. Compõe `massApprovalPermission` (read-only) a partir das `roles` do usuário.

- **Use case** `application/use-cases/get-user.ts` — `getUser(deps)({ id })` → `Result<UserDetail, GetUserError>`.
- **Rota** `GET /api/v1/users/:id` adicionada ao `users-plugin.ts` (params Zod + response) — padrão validado na US1.
- Wiring: `getUser` em `AuthHttpDeps`/`UsersHttpDeps`.

## Read model

```ts
export type UserDetail = Readonly<{
  id: string;
  name: string | null;
  email: string;
  cpf: string | null;          // dígitos normalizados
  telephone: string | null;
  imageUrl: string | null;     // ProfilePhotoRef
  active: boolean;             // status === 'active'
  massApprovalPermission: boolean;  // tem 'contract:mass-approve' nas roles (read-only, FR-015)
  collaboratorId: string | null;   // opaco (FR-017)
}>;
export type GetUserError = 'user-id-invalid' | 'user-not-found';
```

## Critérios de aceite

**Use case (W0, fake reader):**
- **CA1**: id existente → `ok(UserDetail)` com todos os campos do perfil.
- **CA2**: id sem o formato válido → `err('user-id-invalid')`.
- **CA3**: id válido inexistente → `err('user-not-found')`.
- **CA4**: usuário com role contendo `contract:mass-approve` → `massApprovalPermission=true`; sem → `false`.
- **CA5**: usuário disabled → `active=false` (detalhe funciona para inativo).

**Rota (W0, fastify.inject):**
- **CA6**: `GET /api/v1/users/:id` sem token → 401; sem `user:read` → 403.
- **CA7**: admin + id existente → 200 com o shape do detalhe.
- **CA8**: id inexistente → 404 (sem vazar dados).

## Decisões
- `massApprovalPermission` computado de `user.roles` (não `listPermissions`, que exige `ActiveUser`) — funciona p/ disabled.
- Shape HTTP usa `active: boolean` (conforme `http-users.md`), derivado de `status`.
- Permission de leitura: `user:read` (provisória, consolidar com `006`).
