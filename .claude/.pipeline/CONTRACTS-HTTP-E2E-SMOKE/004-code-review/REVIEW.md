# Code Review — Ticket CONTRACTS-HTTP-E2E-SMOKE (C5) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-28T21:35Z
**Escopo revisado:**

- `src/modules/auth/adapters/http/e2e-seed.ts` (novo) + reexport em `auth/public-api/http.ts`
- `src/server.ts` (wiring do seed)
- `src/modules/auth/adapters/http/composition.ts` (fix seed/roleRepo)
- `src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts` + auth `mysql-driver.ts` (migrationsTable)
- `scripts/e2e-contracts.sh`, `tests/e2e/contracts-smoke.e2e.ts`, `tests/modules/auth/public-api/e2e-auth-seed.test.ts`, `package.json`

---

## Issues encontradas

### 🔴 Crítica

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

#### Nota 1 — Seed via env não tem barreira de "ambiente=produção"

A guarda dupla (`CORE_API_E2E==='1'` + `AUTH_SEED_JSON`) é correta e o seed é inerte sem a flag. Mas **se
alguém setar ambas em produção por engano**, um user privilegiado seria criado no boot. Hoje não há um
sinal de "ambiente=prod" no projeto para barrar isso. Recomendação (follow-up): quando existir
`NODE_ENV`/flag de prod, fazer `parseE2eAuthSeed` (ou o boot) **recusar** a flag em produção (fatal). Por
ora, mitigado por documentação (comentário ⚠️ no `e2e-seed.ts`) e pela natureza dev/test/E2E. Não bloqueia.

#### Nota 2 — `migrationsTable` muda o nome do journal (impacto em prod legado)

O fix troca o journal default `__drizzle_migrations` por `__drizzle_migrations_{auth,contracts}`. Num
ambiente que **já** tenha o journal legado populado, o migrator criaria journals novos vazios e tentaria
reaplicar migrations → erro se as tabelas já existem. **Irrelevante na Fase 1** (sem prod; E2E/integração
sobem do zero). Registrar para o 1º deploy de prod: aplicar antes de haver journal legado, ou migrar o journal.

### 🔵 Sugestão

#### Sugestão 1 — `as Record<string, unknown>` nos type guards (`e2e-seed.ts`)

Cast padrão para narrowing de `unknown` em type guards — correto e idiomático. Sem ação.

---

## O que está bom

- **`parseE2eAuthSeed` puro e bem-guardado:** guarda dupla, type guards completos (`isAuthSeed` →
  `isAuthSeedUser` → `isStringArray`), `JSON.parse` lança em malformado, shape inválido → erro de boot.
  Testável (unitário 6/6, entra no `pnpm test`) — o fail-first da camada de produção foi respeitado mesmo
  num ticket E2E.
- **`server.ts` wiring** com spread condicional (`...(authSeed !== undefined ? { seed } : {})`) — correto
  sob `exactOptionalPropertyTypes`; seed inerte sem a flag.
- **Fix #1 (seed/roleRepo) é a correção certa:** o `Role` é persistido **antes** do `userRepo.save`,
  satisfazendo a FK `auth_user_role.role_id → auth_role.id` em mysql; em memory não há FK mas persistir
  mantém o invariante. `roleRepo` adicionado aos `Stores` para os dois drivers. `applyRbacSeed` refatorado
  para deps-objeto (resolve `max-params`). Bug latente do C1, exposto só com mysql — bem diagnosticado.
- **Fix #2 (migrationsTable por módulo)** alinhado ao isolamento do ADR-0014: journals independentes evitam
  que o migrator de um módulo pule as migrations do outro no DB `core` compartilhado. Bug latente que os
  testes de integração (um módulo por vez) nunca pegaram — o C5 (auth+contracts juntos) foi o primeiro.
- **`scripts/e2e-contracts.sh`** robusto: `trap` + `pkill` de fallback + limpeza preventiva de órfãos
  (resolveu o zumbi na 3100 entre runs); reader com `readonly_bi` (RW split com creds distintas — prova que
  reads não tocam o writer); espelha fielmente `e2e-auth.sh`.
- **Smoke 4/4 (Docker)** valida o épico ponta-a-ponta: boot dual-pool+storage, authz 401/403,
  coexistência auth, CRUD writer(root)→reader(readonly_bi)→export.csv. Sufixo `.e2e.ts` fora do `pnpm test`.
- Zero `any`/`class`/`this`. `throw` só em `parseE2eAuthSeed` (config de boot) e composition (boot) —
  padrão aceito. `typecheck`+`lint`+`format`+`test` (1537/0) verdes.

---

## Próximo passo

- **APPROVED** → W3 (gate de qualidade formal).
- Notas 🟡 1-2 são follow-up para a fase de produção (barreira de ambiente p/ o seed; migração de journal) —
  nenhuma relevante na Fase 1. Não bloqueiam o C5.
