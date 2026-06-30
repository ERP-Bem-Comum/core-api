# W0 — RED · AUTH-ETL-USER-PROVISIONING

**Skill:** tdd-strategist · **Outcome:** RED ✅ · **Data:** 2026-06-02

## Arquivos de teste criados

| Arquivo | Tipo | Cobertura |
| --- | --- | --- |
| `tests/modules/auth/application/use-cases/provision-legacy-user.test.ts` | unit (roda em `pnpm test`) | lógica do use-case com fakes InMemory |
| `tests/modules/auth/public-api/auth-etl-port.integration.test.ts` | integração gated (`MYSQL_INTEGRATION=1`) | factory connection-string→port + idempotência real via DB + fail-closed |

## Cenários — unit (`provision-legacy-user.test.ts`)

1. **created:** legacyId novo → `outcome: 'created'`, 1 user salvo com o `legacyId`, hash não-vazio, `roles: []` quando `massApprove=false`.
2. **não vaza segredo:** o segredo random da senha não aparece no `Result` retornado.
3. **idempotência skip (CA-3):** re-provisionar mesmo `legacyId` → `already-exists`, mesmo `userRef`, e **não sobrescreve** o registro (passwordHash preservado — protege senha já resetada).
4. **role compartilhado (CA-4):** `massApprove=true` → user com 1 role `etl:mass-approver` de única permission `contract:mass-approve`; `roleRepo` com 1 role.
5. **sem role explosion:** 2 users `massApprove` → `roleRepo.list()` tem **1** role; ambos referenciam o mesmo `roleId`.
6. **fail-closed authz (CA-5):** `massApprove=false` → user sem role; `authorize(user, 'contract:mass-approve')` = `err('forbidden')`.

## Cenários — integração (`auth-etl-port.integration.test.ts`, gated)

7. **idempotência DB (CA-3):** 2× `provision(legacyId=7)` → 1 linha em `auth_user` (unique `legacy_id`); 2ª chamada `already-exists` com mesmo `userRef`.
8. **role compartilhado DB (CA-4):** 2 users `massApprove` → 1 linha em `auth_role` com `name='etl:mass-approver'`.
9. **fail-closed login (CA-6):** user provisionado tem `password_hash` começando com `$argon2` (hash real de segredo random descartado → login impossível até reset).

## Confirmação RED

```
ℹ tests 2
ℹ pass 0
ℹ fail 2
```

Ambos falham com `ERR_MODULE_NOT_FOUND` — APIs inexistentes (esperado):

- `#src/modules/auth/application/use-cases/provision-legacy-user.ts`
- `#src/modules/auth/adapters/persistence/repos/provisioned-user-store.in-memory.ts`
- `#src/modules/auth/public-api/etl.ts`

## API que o W1 deve criar (contrato fixado pelos testes)

- **Port** `ProvisionedUserStore` (application/ports ou domain): `findByLegacyId(legacyId: number): Promise<Result<UserId | null, E>>` + `provision(user: ActiveUser, legacyId: number): Promise<Result<void, E>>` (insert idempotente, skip-by-legacy_id, NUNCA UPDATE).
- **InMemory** `makeInMemoryProvisionedUserStore()` → `{ store, saved(): readonly { user: ActiveUser; legacyId: number }[] }`.
- **Use-case** `provisionLegacyUser(deps)(input)` — `deps: { store, roleRepo, passwordHasher, clock, secret: () => string }`; `input: { legacyId, email: Email, massApprove }`; output `Result<{ userRef: UserId; outcome: 'created' | 'already-exists' }, ProvisionLegacyUserError>`. Resolve role compartilhado por `name` (list→find→create+save) com 1 permission `CONTRACT_PERMISSION.massApprove`.
- **Schema:** `auth_user.legacy_id INT NULL` + `uniqueIndex('auth_user_legacy_id_idx')` + migration (`db:generate`).
- **Adapter Drizzle** `provisioned-user-store.drizzle.ts` + **factory** `buildAuthEtlPort({ connectionString }): Promise<Result<{ provisionLegacyUser, close }, E>>` em `public-api/etl.ts` (wira `openAuthMysql` + stores + argon2 hasher real, sem Fastify).

## Próximo passo

W1 — implementar o mínimo até GREEN (YAGNI). Skill: `ports-and-adapters` (+ `drizzle-schema-author` para a coluna/migration).
