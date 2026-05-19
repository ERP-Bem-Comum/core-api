# W1 — GREEN (Patch Mínimo)

## Skill aplicada

`database-engineer` (W1 modo implementação — tuning de pool MySQL).

---

## Mudanças

### `src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts`

1. **Import**: adicionado `type PoolOptions` de `mysql2/promise`.

2. **`MysqlConnectOptions`** estendido:

   ```diff
   export type MysqlConnectOptions = Readonly<{
     connectionString: string;
   + // M5 — prod-safe default. Omitido = `false` (NÃO aplica). Dev/CI passam `true`.
     applyMigrations?: boolean;
     poolLimit?: number;
   + // H3 — override do `idleTimeout` (ms). Default = `DEFAULT_IDLE_TIMEOUT_MS`.
   + idleTimeoutMs?: number;
   }>;
   ```

3. **Constante** `DEFAULT_IDLE_TIMEOUT_MS = 270_000` com referência inline à best-practice 03.

4. **Função pura** `buildPoolOptions(opts: MysqlConnectOptions): PoolOptions` **exportada** — encapsula a montagem das opções; testável sem Docker.

   ```ts
   export const buildPoolOptions = (opts: MysqlConnectOptions): PoolOptions => ({
     uri: opts.connectionString,
     connectionLimit: opts.poolLimit ?? DEFAULT_POOL_LIMIT,
     waitForConnections: true,
     queueLimit: 0,
     enableKeepAlive: true,
     keepAliveInitialDelay: 10_000,
     idleTimeout: opts.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS, // H3
     timezone: 'Z', // M2
   });
   ```

5. **`createPoolSafe`** simplificado — agora chama `createPool(buildPoolOptions(opts))`.

6. **Default de `applyMigrations` invertido** (M5):

   ```diff
   - if (opts.applyMigrations !== false) {
   + // M5 — prod-safe: só migra se caller pediu EXPLÍCITAMENTE `true`.
   + if (opts.applyMigrations === true) {
       const migR = await applyMigrationsTo(db);
   ```

---

## Por que essas escolhas (decisões registradas no `000-request.md`)

| Escolha | Razão | Citação |
| :-- | :-- | :-- |
| `timezone: 'Z'` | Fixa UTC no round-trip Date↔DATETIME(3). Blinda contra container UTC + RDS America/Sao_Paulo. | audit §M2; `Timezone = 'local' \| 'Z' \| ...` em `sql-escaper` aceita o literal. |
| `idleTimeout: 270_000` | `(wait_timeout=300 − 30) × 90% ≈ 243`, arredondado pro canônico da best-practice. | audit §H3; best-practice 03 §"Pool–MySQL alignment". |
| `idleTimeoutMs` em options | Permite override (RDS LB com timeout custom; ambientes com `wait_timeout` diferente). | audit §H3 *"considerar expor `idleTimeoutMs`"*. |
| Default `applyMigrations === true` (era `!== false`) | Migration on-boot é opt-in. Default `false` = sem race em deploy multi-instância. | audit §M5; best-practice 06 §"Migrations seguras". |
| Extrair `buildPoolOptions` | Testabilidade sem container (CA-9/CA-10 estruturais). | YAGNI — feita só pra W0 RED ter target observável. |

---

## Impacto nos callers (verificado)

Todos os callers já passam `applyMigrations` **explicitamente** — zero regressão:

| Caller | Linha | Argumento | Status |
| :-- | :-- | :-- | :-- |
| `src/modules/contracts/cli/drivers/mysql.ts` | :19 | `applyMigrations: true` | ✅ |
| `tests/modules/contracts/adapters/persistence/mysql-driver.test.ts` | :107, :118, :131, :151, :158 | `applyMigrations: true \| false` | ✅ |
| `tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts` | :69 | `applyMigrations: true` | ✅ |
| `tests/modules/contracts/adapters/persistence/mysql-driver-tuning.test.ts` (CA-11, novo) | :77 | `applyMigrations: false` | ✅ |
| `tests/modules/contracts/adapters/persistence/mysql-driver-tuning.test.ts` (CA-12, novo) | :119 | omitido (testa o default) | ✅ |

---

## Resultados

```
$ pnpm run typecheck
> tsc --noEmit
EXIT=0  (sem erros)

$ pnpm test
ℹ tests 451 | pass 438 | fail 0 | skipped 13 | duration_ms 38662
EXIT=0
```

**Delta vs baseline:**

- Tests totais: 444 → 451 (**+7**, sendo +5 estruturais que rodam fora de Docker + 2 integration registrados mas skip).
- Passing: 433 → 438 (**+5** — CA-9.1, CA-9.2, CA-9.3, CA-10.1, CA-10.2).
- Skipped: 11 → 13 (**+2** — CA-11, CA-12 com `MYSQL_INTEGRATION≠1`).

```
$ pnpm run format:check
All matched files use Prettier code style!
EXIT=0

$ pnpm run lint
EXIT=0  (lint preexistente em `.split-refman.mjs` removido pelo usuário antes deste ticket)
```

---

## Detalhes de implementação corrigidos pós-revisão de lint

Dois ajustes no novo arquivo de teste após primeira passada:

- `ReadonlyArray<{...}>` → `readonly {...}[]` (`@typescript-eslint/array-type`).
- `String(raised)` → narrow `raised instanceof Error ? raised.message : ...` (`@typescript-eslint/no-base-to-string`).

Nenhuma mudança lógica — apenas conformidade com o lint strict do projeto.

---

## Critério de saída do GREEN

- [x] `buildPoolOptions` exportada e pura.
- [x] `timezone: 'Z'` no retorno.
- [x] `idleTimeout: 270_000` default; `idleTimeoutMs` override.
- [x] `applyMigrations === true` (default invertido para `false` quando omitido).
- [x] CA-9/CA-10 (estruturais) verdes.
- [x] CA-11/CA-12 registrados como integration (skip em `pnpm test` puro).
- [x] `typecheck` + `test` + `format:check` + `lint` todos verdes.

**Pronto para W2.**
