# Quality Check — Ticket FIN-APPROVER-LIMIT-AUTH

**Skill:** ts-quality-checker
**Data:** 2026-06-30T19:44Z
**Veredito final:** ✅ ALL GREEN (gates locais) · ⏳ DoD pendente: `test:integration:auth` no x99

| #   | Check                          | Status        | Detalhes                                  |
| :-- | :----------------------------- | :------------ | :---------------------------------------- |
| 1   | Type check (`tsc --noEmit`)    | ✅            | 0 erros (saída vazia, exit 0)             |
| 2   | Format check (`prettier`)      | ✅            | "All matched files use Prettier code style!" |
| 3   | Lint (`eslint .`)              | ✅            | exit 0, sem warnings                      |
| 4   | Testes (`node --test`)         | ✅            | 3277 tests · 3259 pass · **0 fail** · 18 skip |

---

## Saída integral

### Check 1 — `pnpm run typecheck` (`tsc --noEmit`)

```
$ tsc --noEmit
(sem saída — exit 0)
```

### Check 2 — `pnpm run format:check` (`prettier --check .`)

```
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
```

Os arquivos editados pelo sub-agente `fastify-server-expert` (`roles-schemas.ts`,
`roles-approval-limit.route.test.ts`) já estavam formatados — `format:check` rodado na sessão
principal (lição `subagent-edits-skip-prettier-lint-hooks`), sem necessidade de `format --write`.

### Check 2-bis — `pnpm run lint` (`eslint .`)

```
$ eslint .
(sem saída — exit 0)
```

### Check 3 — `pnpm test` (suíte completa)

```
ℹ tests 3277
ℹ suites 966
ℹ pass 3259
ℹ fail 0
ℹ cancelled 0
ℹ skipped 18
ℹ todo 0
ℹ duration_ms 66516.603166
```

Baseline do W1 era 3276 tests; +1 = o caso de boundary `approvalLimitCents = MAX_SAFE_INTEGER + 1
→ 400` (Sugestão 1 acolhida). **Zero regressão.** Os 18 skip são os testes de integração gateados
por `MYSQL_INTEGRATION=1` — entre eles `tests/modules/auth/adapters/persistence/approver-authority.drizzle.test.ts`
(CA6/CA7), que rodam no x99.

### Check 4 — Build

```
SKIPPED — projeto roda via --experimental-strip-types, sem etapa de build (Fase 1+).
```

---

## Integração no MySQL real (x99) — ✅ RESOLVIDA

Docker não sobe na máquina local (8 GB RAM); a integração rodou na VM `erp-validate` do **x99**
(node v24.18 + MySQL 8.4 real via `docker compose`), em diretório/projeto isolado do stack `erp-*`,
com `MYSQL_PORT=3399` (sem colisão com o `erp-mysql:3306`). Comando canônico:
`MYSQL_PORT=3399 pnpm run test:integration:auth` (data 2026-06-30T19:5xZ).

**Resultado — suite `auth` (7 arquivos):**

```
ℹ tests 46
ℹ pass 46
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 13818.747253
```

Evidência dos CAs da feature (do log `itest-auth-028.log`):

```
▶ createDrizzleUserReadStore.getApproverAuthority — MySQL real (CA6)
  ✔ CA6a: papel aprovador com alcada -> canApprove + limitCents
  ✔ CA6b: multiplos papeis aprovadores -> limitCents = MAX
  ✔ CA6c: usuario sem payable:approve -> canApprove false, limitCents null
  ✔ CA6d: aprovador sem alcada definida -> canApprove true, limitCents null
  ✔ CA6e: usuario inexistente -> ok(null)
▶ createDrizzleUserReadStore.listApproversWithAuthority — MySQL real (CA7)
  ✔ CA7: lista apenas usuarios com payable:approve + alcada efetiva
✔ RoleRepository contract — Drizzle/MySQL
```

- **T004 / CA6 / CA7:** verdes no MySQL 8.4 real.
- **Migration 0008 provada:** o teste roda `openAuthMysql({ applyMigrations: true })` (aplica até a
  0008) e CA6a lê `limitCents = 100000` via JOIN em `approval_limit_cents` — coluna inexistente
  faria o SELECT/INSERT falhar. Verde ⇒ `ALTER TABLE auth_role ADD approval_limit_cents bigint`
  (INSTANT 8.4) aplicada e funcional.

Housekeeping: o stack core-api isolado manual da validação anterior foi derrubado (`down -v`) para o
gate subir com volume limpo; `erp-*` intacto; artefatos (`.tgz`, log) limpos. Resubível pela receita
`x99-isolated-core-api-stack-validation` se necessário.

---

## Próximo passo

- **Gate W3 ALL GREEN (local) + integração `test:integration:auth` GREEN no MySQL real (x99).**
- **DoD completo** → `pipeline:state close FIN-APPROVER-LIMIT-AUTH`.
