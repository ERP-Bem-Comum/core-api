# W1 — GREEN · AUTH-ETL-USER-PROVISIONING

**Skill:** ports-and-adapters (+ drizzle-schema-author) · **Outcome:** GREEN ✅ · **Data:** 2026-06-02

## Arquivos criados/editados

| Arquivo | Tipo | Papel |
| --- | --- | --- |
| `src/modules/auth/adapters/persistence/schemas/mysql.ts` | editado | coluna `legacy_id INT NULL` + `uniqueIndex('auth_user_legacy_id_idx')` em `auth_user` |
| `…/migrations/mysql/0003_lowly_arclight.sql` | gerado | `ADD legacy_id int` + `ADD CONSTRAINT ... UNIQUE` (INSTANT/INPLACE, zero downtime) |
| `src/modules/auth/application/ports/provisioned-user-store.ts` | novo | port `ProvisionedUserStore` (`findByLegacyId` + `provision` idempotente) |
| `…/adapters/persistence/repos/provisioned-user-store.in-memory.ts` | novo | fake InMemory (`makeInMemoryProvisionedUserStore`) |
| `…/adapters/persistence/repos/provisioned-user-store.drizzle.ts` | novo | adapter Drizzle (insert idempotente skip-by-legacy_id, NUNCA UPDATE) |
| `src/modules/auth/application/use-cases/provision-legacy-user.ts` | novo | use-case `provisionLegacyUser` |
| `src/modules/auth/public-api/etl.ts` | novo | factory `buildAuthEtlPort` (driver + stores + argon2, sem Fastify) |
| `package.json` | editado | `test:integration:auth` passa a incluir o gate `auth-etl-port.integration.test.ts` |

## Decisões de design (YAGNI)

- **Port novo `ProvisionedUserStore`** em vez de estender `UserRepository`: o `save` faz upsert-by-id e o agregado `User` não carrega `legacy_id` (proveniência é de persistência). O port isola a semântica de ETL (correlação + insert idempotente).
- **`provision` é INSERT-only com SELECT FOR UPDATE by `legacy_id`** → skip se já migrado (D17 — re-run não sobrescreve senha já resetada). `ER_DUP_ENTRY` em `auth_user_legacy_id_idx` (corrida) tratado como ok.
- **Senha (D16):** `Password.parse(randomBytes(32).toString('base64url'))` → `passwordHasher.hash` (argon2id real). Segredo descartado, nunca persistido em claro. `authenticateUser` intacto (verify normal falha → fail-closed + timing natural).
- **Role compartilhado (D15):** resolvido por `name` (`roleRepo.list()` → find → create+save), 1 permission `CONTRACT_PERMISSION.massApprove` (importado da public-api de contracts, ADR-0006). Reuso entre users.
- **`legacy_id` (D17):** `INT NULL UNIQUE` (múltiplos NULL permitidos no InnoDB; UNIQUE garante idempotência). Migration via `ALGORITHM` default do MySQL 8.4 (ADD COLUMN INSTANT, ADD UNIQUE INDEX INPLACE).

## Verificação

| Gate | Resultado |
| --- | --- |
| `tsc --noEmit` | ✅ zero erros |
| `eslint` (8 arquivos novos/editados) | ✅ limpo (após `--fix`: `import type * as Email`, `close: async`) |
| Unit `provision-legacy-user.test.ts` | ✅ **6/6 pass** |
| Integração `auth-etl-port.integration.test.ts` (`MYSQL_INTEGRATION=1`, Docker MySQL real) | ✅ **3/3 pass** — provado no home (ver nota) |

### Prova da integração (regressão zero — não-skip)

A porta 3306 estava ocupada por `bemcomum-mysql` (stack dev do usuário, **não** tocada). Subi o MySQL de teste em **3307** e rodei o gate:

```
MYSQL_PORT=3307 docker compose up -d mysql --wait
MYSQL_PORT=3307 MYSQL_INTEGRATION=1 node --test ... auth-etl-port.integration.test.ts
→ tests 3 · pass 3 · fail 0
```

Cobertura provada: idempotência via DB (1 linha por `legacy_id`), Role compartilhado (1 linha `auth_role`), fail-closed (`password_hash` começa com `$argon2`). Container derrubado (`down -v`).

> **Nota gap (`[[project-test-integration-auth-gap]]`):** `pnpm test` puro skipa o gate (sem `MYSQL_INTEGRATION`). Mitigado: o arquivo foi adicionado a `pnpm run test:integration:auth` (reprodutível). W3 deve rodar esse gate, não só `pnpm test`.

## Achado lateral (registrado, fora de escopo)

`user.mapper.ts:152` (`rawHash = userRow.passwordHash ?? ''` → `PasswordHash.fromString('')` = `err`) continua sendo bug latente para users OIDC com `password_hash NULL`. Não afeta este ticket (provisionamos hash não-vazio). Vira ticket auth próprio (HANDOFF §8).

## Próximo passo

W2 — code review read-only (skill `code-reviewer`).
