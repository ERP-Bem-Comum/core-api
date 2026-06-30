# AUTH-ETL-USER-PROVISIONING — Provisionamento de usuários legados no módulo `auth`

> **Size:** M · **Módulo:** `auth` (apenas `auth_*` — não tocar `par_*`) · **Slice:** 3a da cadeia `PARTNERS-ETL-BOOTSTRAP`.
> **Origem:** decomposto do `PARTNERS-ETL-WRITER` na sessão 2026-06-02. Design + prior art em
> `.claude/.pipeline/PARTNERS-ETL-BOOTSTRAP/HANDOFF.md` §8 (decisões D14–D17). **3b depende deste.**

## Contexto

O ETL one-shot (legado → core-api) precisa criar `auth.User` para ~19 usuários migrados. O módulo `auth`
hoje **não** expõe um caminho para isso fora do HTTP, **não** tem como representar "user sem senha
utilizável", e **não** tem marca de proveniência de migração. Este ticket entrega essa maquinaria **no
módulo auth**, atrás da `public-api`, para o slice 3b (`PARTNERS-ETL-WRITER`) consumir sem tocar nos
internos do auth (ADR-0006 / D14).

Nada de regra de negócio nova: reusa `User.register`, `Role.create`, `Role.grant`, os repos Drizzle e o
port `PasswordHasher` existentes.

## Escopo

### 1. Coluna de proveniência `auth_user.legacy_id` (D17)

- `legacy_id INT NULL` + `uniqueIndex('auth_user_legacy_id_idx')` no schema Drizzle
  (`src/modules/auth/adapters/persistence/schemas/mysql.ts`). NULL = nativo; não-NULL = migrado.
- Migration gerada via `pnpm run db:generate` (journal `__drizzle_migrations_auth`). DDL deve ser
  `ALGORITHM=INSTANT` (ADD COLUMN) + índice `INPLACE/LOCK=NONE` (zero downtime).
- Mapear `legacyId` em `$inferInsert`/`$inferSelect` e no `userToInsert`/mapper de leitura do auth.
- Espelha `PARTNERS-LEGACY-ID-COLUMNS`. Skill: `drizzle-schema-author`.

### 2. Port de provisionamento ETL na `public-api` do auth (D14)

Novo arquivo em `src/modules/auth/public-api/` (ex.: `etl.ts`) exportando uma factory que monta o port a
partir de uma connection-string MySQL (via `openAuthMysql` + `createDrizzleUserStore`/`createDrizzleRoleStore`),
**sem subir Fastify**. O port expõe a operação de provisionamento idempotente:

```
provisionLegacyUser(input: {
  legacyId: number;
  email: Email;            // VO já parseado pelo caller (mapper do 3b)
  massApprove: boolean;
}): Promise<Result<{ userRef: UserId; outcome: 'created' | 'already-exists' }, ProvisionLegacyUserError>>
```

Comportamento:

- **Idempotência por `legacy_id` (skip, NUNCA UPDATE):** SELECT-by-`legacy_id`; se existe → retorna o
  `userRef` existente com `outcome: 'already-exists'` **sem reescrever nada** (re-run não pode sobrescrever
  senha já resetada pelo usuário). Capturar `ER_DUP_ENTRY (1062)` no `auth_user_legacy_id_idx` como
  already-exists (corrida).
- **User sem senha (D16):** `passwordHash = PasswordHasher.hash(randomBytes(32))`, **segredo descartado**
  (nunca logado, nunca retornado). `User.register` normal com esse hash. Login impossível até reset (P4a).
- **Role `etl:mass-approver` (D15):** quando `massApprove === true`, resolver o Role compartilhado por
  `name` (list → find; se ausente, `Role.create` com **exatamente 1** permission `contract:mass-approve`
  via `CONTRACT_PERMISSION.massApprove` e `roleRepo.save` **antes** do user — FK). Atribuir ao user
  (`roles: [role]`). `massApprove === false` → `roles: []`.
- Persistir o user via `userRepo.save`. Setar `legacyId` na row.

`ProvisionLegacyUserError` = union EN kebab-case agregando os erros de repo/VO relevantes.

### 3. Exports da `public-api`

A factory + o tipo do port + `ProvisionLegacyUserError` ficam acessíveis ao 3b via
`#src/modules/auth/public-api/etl.ts`. Não arrastar Fastify.

## Critérios de aceite

- [ ] `auth_user.legacy_id` existe (nullable, UNIQUE) + migration gerada e aplicável; `pnpm run db:generate` limpo.
- [ ] `provisionLegacyUser` cria `auth.User` com hash argon2 real de segredo random; o segredo nunca aparece em log/retorno/teste.
- [ ] Idempotência: chamar 2× com o mesmo `legacyId` resulta em 1 user; 2ª chamada retorna `already-exists` e **não** reescreve o registro (senha/role preservados).
- [ ] `massApprove=true` → user recebe o Role compartilhado `etl:mass-approver` (1 permission `contract:mass-approve`); Role reusado entre users (1 linha em `auth_role`).
- [ ] `massApprove=false` → user sem role; `authorize(user, 'contract:mass-approve')` → `err('forbidden')`.
- [ ] Login com qualquer senha falha para user provisionado (verify argon2 contra hash de segredo desconhecido) — fail-closed.
- [ ] Port montável a partir de connection-string sem subir Fastify; exportado pela `public-api`.
- [ ] Teste de integração gated (`MYSQL_INTEGRATION=1`) cobre idempotência + role compartilhado + fail-closed. **Atenção [[project-test-integration-auth-gap]]:** rodar o gate manualmente (risco de falso-verde no W3) — provar verde no home correto.
- [ ] W3 verde: `pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test`.

## Fora de escopo

- Qualquer escrita em `par_*` ou em `scripts/etl/` (é o slice 3b).
- Geração/disparo de token de reset (P4a/P4b, slices 4 e 5).
- Mudar o domínio `User` / o fluxo `authenticateUser` (D16 evita isso por design).
- Corrigir o bug latente do `user.mapper.ts:152` (`?? ''` → `err`) — registrar como ticket auth próprio (HANDOFF §8).

## Notas de disciplina

- Módulo único `auth` nesta sessão (anti-padrão #4). 3b (`partners`/`scripts`) é sessão separada.
- Idioma: erros internos EN kebab-case; eventos EN passado; doc PT-BR.
- Reusar agregados/VOs/repos existentes; zero regra de negócio nova.
