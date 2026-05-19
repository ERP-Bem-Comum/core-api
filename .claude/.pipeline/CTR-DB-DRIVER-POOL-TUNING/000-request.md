# Ticket CTR-DB-DRIVER-POOL-TUNING

> **Categoria:** Driver tuning (pool MySQL + timezone + política de migration on-boot).
> **Origem:** Audit [`handbook/reviews/0002-audit-adapters-persistence-mysql.md`](../../../handbook/reviews/0002-audit-adapters-persistence-mysql.md) §H3 + §M2 + §M5.
> **Tamanho:** S — 1 arquivo de produção (`drivers/mysql-driver.ts`), 1 arquivo de teste novo.
> **Sequência do audit:** #2 (após `CTR-DB-MAPPER-NO-THROW`, antes de `CTR-DB-REPO-LIST-N1`).

---

## ⚠️ Skills obrigatórias

- 🔧 [`database-engineer`](../../skills/database-engineer/SKILL.md) — operacionaliza `wait_timeout`/`idleTimeout` (best-practice [03](../../../handbook/reference/mysql/best-practices/jusdb/03-timeout-variables-production-guide.md) §"Pool–MySQL alignment").
- 📚 [`database-theorist`](../../skills/database-theorist/SKILL.md) — fundamento do desalinhamento pool↔servidor que causa ER 2006.
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração W0→W3 (este ticket).

Citações literais que sustentam cada sub-item:

- **§H3 do audit:** *"o servidor MySQL mata conexão ociosa após `wait_timeout` (default 28800 s; recomendado 300 s). Sem `idleTimeout` no `mysql2`, o pool devolve conexão morta → ER 2006 `MySQL server has gone away`."*
- **Best-practice 03 §"Pool–MySQL alignment":** *"HikariCP idleTimeout (ou equivalente do pool) deve ser ~30 s ABAIXO de `wait_timeout` do servidor. Misalinhamento pool↔servidor responde por ~50% dos ERROR 2006."*
- **§M2 do audit:** *"`mysql2` converte Date↔string usando TZ do servidor. Container em UTC e RDS em America/Sao_Paulo → drift de 3 h em datas legalmente vinculantes (`signedAt`, `homologatedAt`)."*
- **§M5 do audit:** *"Drizzle migrator usa `__drizzle_migrations` mas sem advisory lock. 3 réplicas subindo juntas em deploy → concorrência. (...) em prod, `applyMigrations: false`; migrar via job dedicado. Dev/CI mantém `true`."*

---

## Objetivo

Endurecer o driver MySQL contra três classes de falha latente, todas hoje invisíveis em CI mas exploráveis em prod gerenciada (AWS RDS, Cloud SQL):

1. **H3 — pool `idleTimeout`**: alinhar `mysql2` ao `wait_timeout` do servidor (padrão recomendado 300 s) para evitar ER 2006 `MySQL server has gone away`.
2. **M2 — timezone explícito**: forçar `timezone: 'Z'` no `createPool` para fixar UTC no round-trip Date↔string e blindar contra drift entre container UTC e RDS `America/Sao_Paulo`.
3. **M5 — `applyMigrations` prod-safe by default**: inverter o default de `applyMigrations` para `false` (callers que querem migration on-boot — dev/CI — passam `true` explícito). Elimina race em deploy multi-instância.

---

## Escopo

### O que entra

1. **`src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts`**
   - Extrair função pura `buildPoolOptions(opts: MysqlConnectOptions): PoolOptions` — testável sem container.
   - Adicionar `timezone: 'Z'` (M2).
   - Adicionar `idleTimeout: 270_000` default (H3).
   - Estender `MysqlConnectOptions` com `idleTimeoutMs?: number` (default `270_000`).
   - **Inverter o default de `applyMigrations`**: omisso = `false` (M5). Callers que querem aplicar passam `applyMigrations: true` explicitamente — todos os callers atuais já o fazem (validado abaixo).
   - Comentário inline citando audit §H3/§M2/§M5 e best-practice 03.

2. **`tests/modules/contracts/adapters/persistence/mysql-driver-tuning.test.ts`** (novo)
   - **CA-9** (estrutural, sem Docker): `buildPoolOptions` retorna `timezone: 'Z'` + `idleTimeout: 270_000` por default.
   - **CA-10** (estrutural): caller pode sobrescrever `idleTimeoutMs`.
   - **CA-11** (integration, opt-in `MYSQL_INTEGRATION=1`): após `openMysql`, `SELECT @@session.time_zone` retorna `+00:00`.
   - **CA-12** (integration, opt-in): chamar `openMysql` SEM `applyMigrations` em DB resetado NÃO aplica migrations (verificado por `SELECT FROM ctr_contracts` ⇒ ER 1146).

### O que NÃO entra

- Mudança na CLI driver (`cli/drivers/mysql.ts`) — já passa `applyMigrations: true` explicitamente.
- Mudança no schema/migrations.
- Lock advisory para migração concorrente (`GET_LOCK` / `INSERT INTO __drizzle_migrations ... ON DUPLICATE`) — fora do escopo, ticket separado se justificar.
- Outras issues do audit (H1, M1, M3, M4, M6, L*).
- Outbox MySQL planning (memory referencia `OUTBOX-MYSQL.md` — pausado).

---

## Decisões

### D1 — Default `applyMigrations: false` (inverter)

**Decisão:** omitido = `false`. Caller que quer migrar on-boot passa `true`.

**Argumentos pró:**

- Prod-safe por default: deploy multi-instância sem race.
- Best-practice 06 §"Migrations seguras": migration deve ser job idempotente em CI ou init container, não efeito colateral de boot.
- Callers atuais não regridem — todos passam explícito:
  - `src/modules/contracts/cli/drivers/mysql.ts:19` → `applyMigrations: true` ✓
  - `tests/modules/contracts/adapters/persistence/mysql-driver.test.ts:107,118,131,151,158` → todos explícitos ✓
  - `tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts:69` → `applyMigrations: true` ✓

**Argumentos contra (mitigação):**

- Quebra de API silenciosa para futuros callers — mitigado pelo comentário inline + ADR (este request).

### D2 — `idleTimeout: 270_000` ms (4 min 30 s)

**Decisão:** `idleTimeout = (wait_timeout − 30 s) × 90% ≈ (300 − 30) × 0.9 ≈ 243 s`, arredondado **para cima** a 270 s para alinhar com o exemplo canônico da best-practice 03 §145. Expor `idleTimeoutMs` para override.

### D3 — `timezone: 'Z'`

**Decisão:** literal `'Z'`, equivalente a `'+00:00'`. Garante que `Date` ↔ `DATETIME(3)` round-tripa em UTC, independente da TZ do servidor. Cobre `signedAt`, `homologatedAt`, `createdAt`, `endedAt` e ambos os lados do `Period`.

### D4 — Refator extrair `buildPoolOptions`

**Decisão:** extrair função pura `buildPoolOptions(opts) → PoolOptions`. Razão: testabilidade sem container (W0 estrutural). `createPoolSafe` passa a chamar `buildPoolOptions` antes do `createPool`.

---

## Critérios de aceite (DoD)

- [ ] `buildPoolOptions` é função pura exportada e idempotente.
- [ ] `buildPoolOptions({...}).timezone === 'Z'`.
- [ ] `buildPoolOptions({...}).idleTimeout === 270_000` (default).
- [ ] `buildPoolOptions({..., idleTimeoutMs: 60_000}).idleTimeout === 60_000`.
- [ ] `MysqlConnectOptions` aceita `idleTimeoutMs?: number`.
- [ ] Default de `applyMigrations` invertido para `false` (`if (opts.applyMigrations === true)`).
- [ ] CA-9/CA-10 (estruturais) verdes em `pnpm test` sem container.
- [ ] CA-11/CA-12 (integration) skip em `pnpm test` puro; rodariam verde em `pnpm test:integration` com Docker (não-obrigatório executar nesta sessão se o Docker não estiver disponível — basta validar que compilam e o skip está correto).
- [ ] `pnpm run typecheck` verde.
- [ ] `pnpm run format:check` verde.
- [ ] `pnpm test` verde (433+2 pass / 0 fail / 11+2 skipped — exato delta).

---

## Referências cruzadas

- Audit: [`handbook/reviews/0002-audit-adapters-persistence-mysql.md`](../../../handbook/reviews/0002-audit-adapters-persistence-mysql.md) §H3, §M2, §M5, §3.
- Best-practice MySQL: [`handbook/reference/mysql/best-practices/jusdb/03-timeout-variables-production-guide.md`](../../../handbook/reference/mysql/best-practices/jusdb/03-timeout-variables-production-guide.md) §"Pool–MySQL alignment".
- Best-practice MySQL: [`handbook/reference/mysql/best-practices/jusdb/06-foreign-keys-evolution-5.7-to-8.4.md`](../../../handbook/reference/mysql/best-practices/jusdb/06-foreign-keys-evolution-5.7-to-8.4.md) §"Migrations seguras".
- ADR-0020: [`handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md`](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).
- Ticket anterior: [`.claude/.pipeline/CTR-DB-MAPPER-NO-THROW/`](../CTR-DB-MAPPER-NO-THROW/).
