# W0 — Testes RED · FIN-APPROVER-LIMIT-AUTH

**Agente:** tdd-strategist (conduzido na sessão principal p/ hooks prettier/lint).
**Outcome:** **RED** (API inexistente, conforme fail-first).

## Testes escritos

### T003 — unit do agregado `Role` (alçada)
`tests/modules/auth/domain/authorization/role.test.ts` (estendido — novo `describe` `Role.approvalLimit`).

Cobre CA1–CA5:
- CA1 `create({approvalLimitCents: 100000})` → `approvalLimit.cents === 100000`
- CA2 ausente/`null` → `approvalLimit === null`
- CA3 `< 0` → `err('role-approval-limit-invalid')`
- CA4 `setApprovalLimit(role, n|null)` define/zera; `< 0` → erro
- CA5 `rehydrate` preserva a alçada

**Execução** (`node --test` no arquivo):
```
ℹ tests 15
ℹ pass 8      ← testes originais do Role (sem regressão)
ℹ fail 7      ← os 7 casos novos de alçada (RED esperado)
```
Exemplo de falha: `CA5 rehydrate` → `actual: undefined, expected: 250000` (`approvalLimit` não existe ainda).

### T004 — integração da autoridade (Drizzle/MySQL)
`tests/modules/auth/adapters/persistence/approver-authority.drizzle.test.ts` (novo) — **gateado `MYSQL_INTEGRATION=1`**, registrado no manifesto `scripts/ci/test-integration.ts` (suite `auth`).

Cobre CA6–CA7:
- CA6a papel aprovador com alçada → `{ canApprove:true, limitCents }`
- CA6b múltiplos papéis → `limitCents = MAX`
- CA6c sem `payable:approve` → `{ canApprove:false, limitCents:null }`
- CA6d aprovador sem alçada → `{ canApprove:true, limitCents:null }`
- CA6e inexistente → `ok(null)`
- CA7 `listApproversWithAuthority()` lista só os aprovadores + alçada efetiva

**Prova de RED** (por typecheck — arquivo gateado não roda em `pnpm test` puro): `tsc --noEmit` acusa `getApproverAuthority`/`listApproversWithAuthority` inexistentes no read store e `approvalLimitCents` fora do `CreateRoleInput`. 11 erros no arquivo, todos símbolos-alvo. Sem erros espúrios (o `TS2322 RoleId[]` inicial foi corrigido — `User.register` recebe `Role[]`).

## Gate de não-regressão

- `pnpm test` puro: só os 7 fails do `role.test` (RED do ticket); o teste de integração faz skip sem o gate. Nenhum outro teste afetado.
- Typecheck vermelho é **esperado** em W0 (RED) — voltará a verde no W3 após W1.

## API-alvo a implementar (W1)

- `Role`: `approvalLimit: Money | null`, `RoleError += 'role-approval-limit-invalid'`, `setApprovalLimit`, `create`/`rehydrate` aceitam `approvalLimitCents`.
- Schema `auth_role.approval_limit_cents BIGINT NULL` + migration + mapper.
- Port `user-read.ts`: `ApproverAuthorityView` + `getApproverAuthority` + `listApproversWithAuthority` (query MAX/JOIN) + re-export na `public-api`.
- Borda `roles` (US2): `approvalLimitCents` em `roles-schemas`/`roles-plugin` + `create/update-role`.
