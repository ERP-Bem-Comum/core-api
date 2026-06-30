# Code Review — Ticket FIN-APPROVER-LIMIT-AUTH — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-30T19:30Z
**Escopo revisado:**

- `src/modules/auth/domain/authorization/role.ts` (domínio: `approvalLimit`, `setApprovalLimit`, `resolveApprovalLimit`, erro `role-approval-limit-invalid`)
- `src/modules/auth/application/ports/user-read.ts` (port segregado `ApproverAuthorityReadPort` + `ApproverAuthorityView`)
- `src/modules/auth/public-api/read.ts` (agregação `AuthReadPort`)
- `src/modules/auth/adapters/persistence/repos/user-read.drizzle.ts` (`getApproverAuthority`, `listApproversWithAuthority`)
- `src/modules/auth/adapters/persistence/mappers/role.mapper.ts` (persist/rehidrata `approvalLimitCents`)
- `src/modules/auth/adapters/persistence/schemas/mysql.ts` (`bigint approval_limit_cents`)
- `src/modules/auth/adapters/persistence/repos/role-repository.drizzle.ts` (UPDATE `.set`)
- `src/modules/auth/adapters/persistence/migrations/mysql/0008_black_elektra.sql`
- `src/modules/auth/adapters/http/roles-schemas.ts` + `roles-plugin.ts` (borda US2, Zod)
- `src/modules/auth/application/use-cases/create-role.ts` + `update-role.ts`
- `tests/modules/auth/domain/authorization/role.test.ts` (CA1–CA5)
- `tests/modules/auth/adapters/http/roles-approval-limit.route.test.ts` (CA8)
- `tests/modules/auth/adapters/persistence/approver-authority.drizzle.test.ts` (CA6/CA7, gateado `MYSQL_INTEGRATION=1`)

Cross-checks: `src/shared/kernel/money.ts` (blindagem do VO), `src/modules/auth/application/use-cases/archive-role.ts` + `role.ts:133-135` (invariante FR-012).

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `src/modules/auth/adapters/http/roles-schemas.ts:64,82`

**Categoria:** F/borda (contrato de input)
**Observação:** `approvalLimitCents: z.number().int().min(0).nullable().optional()` não tem `.max()`.
Valores `int >= 0` porém acima de `Number.MAX_SAFE_INTEGER` passam pela validação Zod (sem 400) e
só são rejeitados no domínio por `Money.fromCents` → `role-approval-limit-invalid` → **422**.
O comportamento é **correto e seguro** (defense-in-depth: o VO `Money` blinda overflow em
`money.ts:28`), apenas a camada que rejeita muda (422 em vez de 400). CA8 ("`<0`/não-int → 400")
segue satisfeito para os casos especificados.
**Fix opcional (não-bloqueante):** alinhar a borda ao teto do VO com
`.max(Number.MAX_SAFE_INTEGER)`, deixando overflow também como 400 e tornando o contrato HTTP
explícito. Decisão de borda — fora dos CAs deste ticket; se acolhido, par natural com `zod-expert`.

---

## O que está bom

- **Port segregado (ISP) sólido.** `ApproverAuthorityReadPort` separado de `AuthUserReadPort`
  (`user-read.ts`) preserva os 5 fakes de `getUserName` no financial — zero regressão, isolamento
  de módulo intacto (ADR-0006). `public-api/read.ts` agrega ambos em `AuthReadPort`. Decisão certa.
- **Estado remoto mínimo (Vernon).** A projeção `{ userId, canApprove, limitCents }` nunca vaza
  `User`/`Role` internos — ACL correto para o consumo cross-módulo do financial.
- **Distinção inexistente vs. sem-permissão.** `getApproverAuthority` faz a checagem de existência
  (`ok(null)`) antes da projeção de alçada (`canApprove:false`) — 2 queries fixas, não N+1, e
  necessária para separar CA6c de CA6e.
- **Justificativa FR-012 verificada, não suposta.** O read store dispensar o filtro `archived` é
  legítimo: `archive-role.ts` bloqueia archive de papel in-use e `Role.archive` devolve
  `role-in-use` (`role.ts:133-135`), logo todo papel em `auth_user_role` é `active`. Comentário no
  código documenta a invariante.
- **Domínio puro.** `role.ts` sem `throw`/`class`/`this`/`any`; `Role` é `Readonly`; helper
  `resolveApprovalLimit` mapeia `MoneyError → role-approval-limit-invalid`; `setApprovalLimit`
  retorna novo agregado imutável. Erro em EN kebab-case.
- **Persistência canônica.** `bigint('approval_limit_cents', { mode: 'number' })` é exatamente o
  padrão de Money cents do projeto (financial/contracts; ADR-0018). Migration 0008 sem hint
  `ALGORITHM` → `ALTER ADD` INSTANT no MySQL 8.4 (aderente à lição do #274). Mapper persiste e
  rehidrata; `null` ↔ sem alçada preservado.
- **Borda US2 correta.** Zod `int().min(0).nullable().optional()` (negativo/não-int → 400);
  `exactOptionalPropertyTypes` respeitado nos spreads condicionais (plugin + use-cases);
  `role-approval-limit-invalid` mapeado para 422; DTO de listagem/PUT reflete o campo.
- **Testes proporcionais.** AAA explícito, UUIDs reais (`RoleId.generate`/`UserId.generate`),
  fixtures via `Role.create` (não string crua — aderente à lição RBAC do projeto). CA6 cobre
  alçada/MAX/sem-permissão/sem-alçada/inexistente; CA7 cobre filtro + MAX; CA8 cobre create+reflect,
  set+clear e negativo→400. Integração corretamente gateada por `MYSQL_INTEGRATION=1`.

---

## Adendo — Sugestão 1 ACOLHIDA (pós-W2, mesmo round)

Aplicada via par `fastify-server-expert` (implementa) + `zod-expert` (revisa), conforme roteamento.

- **Implementação:** `.max(Number.MAX_SAFE_INTEGER)` em `approvalLimitCents` nos schemas de input
  (`createRoleBodySchema`, `updateRoleBodySchema`); response DTO intocado. Novo caso de teste de
  boundary `approvalLimitCents = MAX_SAFE_INTEGER + 1 → 400` em
  `tests/modules/auth/adapters/http/roles-approval-limit.route.test.ts` (4/4 verdes no arquivo).
- **Revisão `zod-expert`: APPROVED** — sem Blocker/Major. Dois Minor não-bloqueantes, ambos fora do
  escopo do teto de overflow:
  - **M1:** falta `.meta({ description })` nos campos (não chega ao OpenAPI gerado; o comentário
    inline é invisível para o consumidor da doc). Precedente: `financial/adapters/http/schemas.ts:241-244`.
  - **M2 (informativo):** `.max(MAX_SAFE_INTEGER)` é redundante com `.int()` no Zod v4 (format
    `safeint`, mesmo teto/inclusividade — `zod@4.4.3/v4/core/api.js:323-329`), mas segue o precedente
    do repo e a sobreposição shape×regra do `ADR-0027:60`. **Manter como está.**
- **M1 → follow-up de hardening de borda** (acrescentar `.meta()` espelhando o financial). Não
  bloqueia o fechamento; fora dos CAs deste ticket. Será registrado via skill `issue-report` se não
  acolhido agora.

## Próximo passo

- **APPROVED** → pipeline avança para **W3** (gate `typecheck` + `format:check` + `lint` + `test`)
  + validação de integração `test:integration:auth` (CA6/CA7) no MySQL real do x99 (DoD).
