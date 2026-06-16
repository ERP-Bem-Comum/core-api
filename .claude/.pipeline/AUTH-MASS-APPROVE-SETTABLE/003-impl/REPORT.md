# W1 — Implementação GREEN (AUTH-MASS-APPROVE-SETTABLE)

**Outcome:** GREEN

## Mudanças

- **Novo** `src/modules/auth/application/use-cases/mass-approver-role.ts` — SSoT: `MASS_APPROVER_ROLE_NAME` + `resolveMassApproverRole({ roleRepo })` (busca-ou-cria). Extraído de `provision-legacy-user.ts` (DRY).
- `provision-legacy-user.ts` — importa do novo módulo; reexporta a constante por compat; comportamento idêntico.
- `create-user-by-admin.ts` — `+roleRepo`, `+massApprovalPermission?`; autoriza `user:assign-role` ANTES de escrever (fail-closed); `true`→`User.assignRole` em save único.
- `update-user-profile.ts` — `+roleRepo`, `+actorId?`, `+massApprovalPermission?`; fail-closed; `true`→assign / `false`→revoke (por name, sem criar à toa); idempotente; exige target ativo (`user-disabled`).
- `adapters/http/users-schemas.ts` — `massApprovalPermission: z.boolean().optional()` em create/update.
- `adapters/http/users-plugin.ts` — POST passa a flag; PUT passa `actorId` (do JWT) + flag; mapeia `forbidden→403`, `mass-approver-role-invalid→422`, `role-repo-unavailable→503`, `user-disabled→422`.
- `adapters/http/composition.ts` — injeta `roleRepo` nos dois use cases.

## Invariante de zero regressão

`massApprovalPermission === undefined` → nenhuma carga de ator nem acesso a `roleRepo`; fluxos atuais (perfil, `/me`) idênticos.
