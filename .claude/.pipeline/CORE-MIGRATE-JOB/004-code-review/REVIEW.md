# Code Review — CORE-MIGRATE-JOB (Slice A) — Round 2

**Veredito:** APPROVED

**Reviewer:** code-reviewer (skill)
**Escopo revisado:** `src/jobs/migrate/{migrate,config,run}.ts`; os 6 `src/modules/*/public-api/migrate.ts`;
`compose.yaml` (service migrate); `scripts/setup-secrets.ts`; `package.json`; testes
`tests/jobs/migrate/*` + `tests/infra/migrate-compose.test.ts`.

---

## Round 1 — REJECTED (corrigido)

### 🔴 Categoria F (TS/ESLint) — 3 erros de lint em `tests/jobs/migrate/migrate.test.ts`

1. `:23` — `@typescript-eslint/require-await`: `recordingMigrator.apply` era `async` sem `await`.
   **Fix:** removido `async`, retorno `Promise.resolve(outcome)` explícito.
2. `:75` e `:88` — `@typescript-eslint/strict-void-return`: callback `(m) => reported.push(m)` retorna
   `number` num contexto `void`. **Fix:** corpo em bloco `{ reported.push(m); }`.

Re-validação após fix: `eslint` verde nos arquivos do ticket; 24/24 testes verdes.

---

## Round 2 — APPROVED

### E — Modular Monolith / ADR-0006 (foco do review)

- `src/jobs/migrate/run.ts` importa de outros módulos **exclusivamente** via `#src/modules/<m>/public-api/migrate.ts`
  — nunca `domain/` ou `adapters/`. ✅ ADR-0006.
- Cada `public-api/migrate.ts` importa o driver **do próprio módulo** (`../adapters/persistence/drivers/`) —
  permitido (public-api é a fachada do próprio módulo). ✅
- O job é infra transversal (`src/jobs/`), não um módulo — não cria acoplamento `ctr_* ↔ fin_*`. ✅

### A — Regras absolutas

- Zero `throw`, zero `class`, zero `this`, zero `any`, zero `extends Error`. ✅
- Result `<T,E>` em toda borda; erros internos EN kebab-case (`'migrate-database-url-missing'`,
  `'mysql-driver-migrate-failed'`). ✅
- Return types explícitos em todas as funções exportadas; `Readonly<>` em `ModuleMigrator`,
  `MigrateFailure`, `MigrateConfig`. ✅
- `.push` em `migrated` é mutação de array **local** de função (não entidade de domínio) — permitido fora de `domain/`. ✅

### F — ESM / TS moderno

- Imports relativos com `.ts`; `import { type X }` em imports de tipo; `#src/*` nos cross-módulo. ✅

### G — Naming / idioma

- Código EN; logs técnicos de job (`[migrate] <m>: ok`) seguem o padrão do `sweeper` (prefixo + dado técnico). ✅

---

## O que está bom

- Separação limpa **orquestrador puro** (`migrate.ts`, testável sem DB) × **I/O** (`run.ts`).
- Fail-fast correto + callback `onMigrated` (observabilidade sugerida pelo nodejs-runtime-expert) sem quebrar a pureza.
- Reuso do `open*Mysql({applyMigrations:true})` existente — zero duplicação de lógica de migrator; cada
  módulo dono do seu schema (migrationsTable própria).
- Guard CA9 garante que o Slice A **não** inverte o boot (escopo respeitado).

## Próximo passo

APPROVED → W3 (gate completo: typecheck + format + lint + test + docker compose config).
