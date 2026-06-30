# W1 — Implementação · FIN-APPROVER-LIMIT-AUTH

**Agentes:** drizzle-orm-expert (domínio + persistência) + fastify-server-expert/zod-expert (borda US2), sessão principal.
**Estado:** **GREEN** (Foundational + US2). Resta validar integração (CA6/CA7) no x99.

## Implementado (Foundational — Phase 2 do tasks.md)

### Domínio
- `src/modules/auth/domain/authorization/role.ts`: `approvalLimit: Money | null` no agregado; erro `role-approval-limit-invalid`; `create`/`rehydrate` aceitam `approvalLimitCents`; novo `setApprovalLimit(role, cents|null)`. Helper `resolveApprovalLimit` mapeia `MoneyError → role-approval-limit-invalid`. `Money` (shared kernel) valida `≥0` inteiro.

### Persistência
- `schemas/mysql.ts`: coluna `auth_role.approval_limit_cents BIGINT NULL` (sem CHECK/index → ALTER INSTANT).
- Migration **0008_black_elektra.sql**: `ALTER TABLE auth_role ADD approval_limit_cents bigint;` (INSTANT 8.4, sem hint).
- `mappers/role.mapper.ts`: `roleToInsert` grava `approvalLimitCents`; `roleFromRows` rehidrata.
- `repos/role-repository.drizzle.ts`: `UPDATE ... .set({ approvalLimitCents })`.

### Leitura cross-módulo (public-api)
- `application/ports/user-read.ts`: **port segregado** `ApproverAuthorityReadPort` (ISP — mantém `AuthUserReadPort` intacto, não quebra consumidores de `getUserName`) + `ApproverAuthorityView { userId, canApprove, limitCents }`.
- `repos/user-read.drizzle.ts`: `getApproverAuthority` (existência + MAX da alçada entre papéis com `payable:approve`) e `listApproversWithAuthority` (GROUP BY user + MAX). Invariante FR-012 dispensa filtro de status (papel archived não é atribuível).
- `public-api/read.ts`: re-exporta o port + view; `AuthReadPort` agrega o port segregado.

## Decisão de design (registrada)
Adicionar os métodos ao `AuthUserReadPort` quebrava 5 fakes de `getUserName` no módulo financial. **Segreguei** num port próprio (ISP) — zero toque no financial, zero regressão, isolamento preservado (ADR-0006).

## Implementado (US2 — borda de gestão da alçada — Phase 4 / CA8)
W0 RED próprio: `tests/modules/auth/adapters/http/roles-approval-limit.route.test.ts` (3 casos, RED→GREEN).
- `roles-schemas.ts`: `approvalLimitCents` em `createRoleBodySchema`/`updateRoleBodySchema` (`z.number().int().min(0).nullable().optional()`) + no DTO `roleListItemSchema` (`int().nullable()`).
- `create-role.ts`/`update-role.ts`: command + erro `role-approval-limit-invalid`; create passa a `Role.create`, update aplica `Role.setApprovalLimit`.
- `roles-plugin.ts`: POST/PUT montam command com `approvalLimitCents` condicional (exactOptional); GET/PUT/PATCH refletem no DTO; erro → 422.

## Gates (W1 — verde)
- `tsc --noEmit`: **0 erros**.
- `prettier --check .`: **OK** (10 arquivos da feature formatados, incl. docs da spec).
- `eslint` (arquivos tocados Foundational + US2): **exit 0**.
- `pnpm test` (suíte completa): **3276 tests / 3258 pass / 0 fail / 18 skip** — zero regressão.
- `role.test` (T003): 15/15; `roles-approval-limit.route` (T020): 3/3.

## Pendência (gate W3 / DoD)
- **Validação de integração T004** (CA6/CA7) — `getApproverAuthority`/`listApproversWithAuthority` no MySQL real: rodar `pnpm run test:integration:auth` **no x99** (Docker não roda na máquina local). Teste já gateado (`MYSQL_INTEGRATION=1`) e registrado no manifesto `auth`; faz skip localmente.
- **Migration 0008** validar no MySQL 8.4 do x99 (ALTER ADD INSTANT).
