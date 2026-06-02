# W2 — CODE REVIEW · AUTH-ETL-USER-PROVISIONING

**Skill:** code-reviewer (revisor independente, read-only) · **Round:** 1 · **Veredito:** **APPROVED** ✅ · **Data:** 2026-06-02

## Veredito

**APPROVED — Round 1.** O diff cumpre o escopo e as decisões D15/D16/D17 com correção. Sem BLOCKERs nem MAJORs. Sequência `validar→fetch→domain→persist` respeitada; FK `auth_user_role → auth_role` satisfeita (role persistido antes do `provision`); segredo random não vaza em nenhum caminho; idempotência é skip-não-UPDATE; captura de `ER_DUP_ENTRY` correta.

## Verificações que passaram (evidência)

- **D16 / não-vaza-segredo:** o segredo só transita `secret() → Password.parse → passwordHasher.hash` (`provision-legacy-user.ts:113-116`). Nunca em stderr/Result/evento. O catch do adapter loga o erro de INSERT, cujo payload é o hash argon2 (não o plaintext).
- **D16 / fail-closed em prod:** `randomBytes(32).toString('base64url')` = 43 chars, dentro de `[8,128]` e fora da blocklist → `Password.parse` sempre `ok` (sem falha-fantasma). `etl.ts:61`.
- **D17 / idempotência skip:** retorno cedo (`provision-legacy-user.ts:100-102`); adapter faz `SELECT ... FOR UPDATE` e `return` antes de qualquer INSERT (`provisioned-user-store.drizzle.ts:89-95`). Nunca há UPDATE.
- **FK order (D15):** `roleRepo.save` (fase 2) antes de `store.provision` (fase 5). Role existe em `auth_role` ao inserir `auth_user_role`.
- **ER_DUP_ENTRY:** errno 1062 + `sqlMessage.includes('auth_user_legacy_id_idx')` (`provisioned-user-store.drizzle.ts:35-37`); checa também `e.cause`. O DDL nomeia a constraint `auth_user_legacy_id_idx` → vira o nome do índice na mensagem 1062.
- **ADR-0020:** SELECT-FOR-UPDATE-then-INSERT (sem ODKU/UPSERT); `legacy_id int` (sem JSON/ENUM/AUTO_INCREMENT).
- **ADR-0014:** só `auth_*`; journal `__drizzle_migrations_auth`. **ADR-0006:** `CONTRACT_PERMISSION` via `contracts/public-api` (permitido).
- **Testes:** idempotência verifica `length===1` E `passwordHash` preservado (não-sobrescrita real); fail-closed via `authorize().ok===false` (unit) + `password_hash` começa com `$argon2` (integração). Asserts não-tautológicos.

## Issues

### MINOR

| # | Local | Issue | Resolução |
| --- | --- | --- | --- |
| M1 | `provisioned-user-store.drizzle.ts` (map de `auth_user_role`) | `role.id as unknown as string` sem comentário do cast | **WONTFIX (consistência):** espelha `user-repository.drizzle.ts:265`, padrão idiomático do módulo para esse cast. Comentar aqui divergiria do vizinho. |
| M2 | `provision-legacy-user.ts:54` | `'mass-approver-role-invalid'` mascara dois casos (`Permission.parse` + `Role.create`) | **ACEITO (YAGNI):** ambos impossíveis na prática (`CONTRACT_PERMISSION.massApprove` constante válida; name/permission fixos). Granularidade desnecessária. |

### NIT

| # | Local | Observação | Resolução |
| --- | --- | --- | --- |
| N1 | `etl.ts:48-52` | `applyMigrations: true` sempre | Consciente para ETL one-shot (journal idempotente). Considerar expor flag ao caller no slice 3b. |
| N2 | `0003_lowly_arclight.sql` | DDL não declara `ALGORITHM`/`LOCK` explícitos | Default MySQL 8.4 já é INSTANT (ADD COLUMN) + INPLACE (ADD UNIQUE). Comportamento real bate; imprecisão só de documentação no REPORT W1. |
| N3 | `provisioned-user-store.in-memory.ts` | não modela a race de `ER_DUP_ENTRY` (impossível em memória) | Caminho de race coberto exclusivamente pelo teste de integração. Adequado. |

## Observação de processo (relevante para W3)

O gate de integração está atrás de `MYSQL_INTEGRATION=1`; `pnpm test` puro **não** o executa (`[[project-test-integration-auth-gap]]`). Foi adicionado a `test:integration:auth` (`package.json:41`). **W3 deve rodar `pnpm run test:integration:auth` explicitamente** (não só `pnpm test`) para não fechar com falso-verde. W1 já provou 3/3 manualmente (porta 3307).

## Conclusão

Nenhum problema inventado; a maquinaria é sólida e fiel ao `000-request.md`. Sem mudanças de código exigidas. **APPROVED → segue para W3.**
