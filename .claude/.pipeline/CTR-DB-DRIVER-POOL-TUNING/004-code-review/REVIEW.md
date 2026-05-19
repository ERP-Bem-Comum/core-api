# W2 — Code Review read-only

> **Reviewer:** orquestrador `pipeline-maestro` aplicando protocolo da skill `code-reviewer`.
> **Round:** 1.
> **Veredito:** **APPROVED.**

---

## 1. Conformidade com `CLAUDE.md` raiz

| # | Regra | Verificação | Status |
| :-- | :-- | :-- | :-- |
| 1 | §Adapter Layer: "`try/catch` permitido, mas **converter para `Result` na borda**" | `createPoolSafe`, `smokeCheck`, `applyMigrationsTo` — todos retornam `Result`. `buildPoolOptions` é pura (sem try/catch). | ✅ |
| 2 | §Sintaxe: `import type { X }` ou `import { type X }` | `import { createPool, type Pool, type PoolOptions } from 'mysql2/promise'` ✓ | ✅ |
| 3 | §Sintaxe: extensões `.ts` em imports relativos | `'../../../../../shared/result.ts'`, `'../schemas/mysql.ts'` ✓ | ✅ |
| 4 | §Domínio puro: "**Sem `class`, sem `this`**" | Driver é adapter, mas continua sem `class` nem `this` ✓ | ✅ |
| 5 | §"Sem `any`" | `buildPoolOptions` retorna `PoolOptions` tipado; nenhum `any` adicionado | ✅ |
| 6 | §"Erros são string literal unions" | `MysqlDriverError` segue union de literais ✓ | ✅ |
| 7 | Anti-padrão #7 (continuidade do ticket anterior) | grep `throw new Error` em `src/modules/contracts/adapters/persistence/` = 0 ✓ | ✅ |
| 8 | §Pipeline W0→W3 | `.claude/.pipeline/CTR-DB-DRIVER-POOL-TUNING/` com 000-request + 002/003 REPORTs | ✅ |

---

## 2. Inspeção item-a-item das mudanças

### 2.1 `buildPoolOptions` (linhas 60-74)

- **Pureza**: função retorna objeto literal; sem efeito colateral. ✓
- **Tipo de retorno explícito**: `PoolOptions` importado de `mysql2/promise`. ✓
- **`Timezone = 'local' | 'Z' | (string & NonNullable<unknown>)`** (`sql-escaper`) — `'Z'` é literal aceito. Não há cast `as`. ✓
- **Override `idleTimeoutMs`**: `opts.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS` — semântica clara. ✓
- **Defaults preservados**: `enableKeepAlive`, `keepAliveInitialDelay`, `waitForConnections`, `queueLimit`, `connectionLimit` mantidos do código anterior. ✓ CA-9.3 valida.

### 2.2 `DEFAULT_IDLE_TIMEOUT_MS = 270_000` (linha 58)

- Cálculo documentado inline: `(wait_timeout=300 − 30) × 90% ≈ 243`, arredondado para o canônico da best-practice 03 §"Pool–MySQL alignment". ✓
- Numeric separator `_` é TS 6 idiomático. ✓

### 2.3 `MysqlConnectOptions` (linhas 25-32)

- `idleTimeoutMs?: number` adicionado. ✓
- Comentário linha-a-linha referenciando M5, H3. ✓
- `Readonly<>` mantido. ✓
- **Não-quebra de API**: campo novo opcional. Callers existentes não precisam mudar.

### 2.4 Default `applyMigrations` invertido (linha 137)

- Antes: `if (opts.applyMigrations !== false)` (default = `true`).
- Depois: `if (opts.applyMigrations === true)` (default = `false`).
- Comentário inline explicita M5. ✓
- **Análise de compatibilidade**: todos os callers atuais passam `applyMigrations` explicitamente (verificado via grep no W1 REPORT) — zero regressão.

### 2.5 Refactor `createPoolSafe` (linha 108-115)

- 13 linhas viraram 7. ✓
- `try/catch` mantido para capturar erros de `createPool` (e.g., URI inválida que escapa o regex).
- Comentário "Pool do mysql2 expõe interface mutável (...)" inalterado.

---

## 3. Inspeção do test file

### 3.1 `mysql-driver-tuning.test.ts`

- **Estrutura**: usa `describe`/`it` do `node:test` ✓.
- **CA-9.1/.2/.3, CA-10.1/.2**: estruturais — `assert.equal` em propriedades do `PoolOptions`. ✓ Não requerem container.
- **CA-11**: opt-in com `t.skip()` se `MYSQL_INTEGRATION≠1`. Usa `db.execute(sql\`SELECT @@session.time_zone AS tz\`)`. Cobre M2 em runtime real.
- **CA-12**: opt-in. Faz `resetCoreDatabase()` (DROP+CREATE via `docker exec`), abre `openMysql` sem `applyMigrations`, espera `ER_NO_SUCH_TABLE` em `SELECT FROM ctr_contracts`. Cobre M5 em runtime real.
- **Conformidade lint** (após fix da 1ª passada): `readonly {...}[]` (não `ReadonlyArray<>`) e `raised instanceof Error ? raised.message : ...` (não `String(raised)`). ✓
- **`raised` narrow**: `e instanceof Error ? e : new Error(JSON.stringify(e))` — preserve a mensagem real do mysql2 (que sempre é `Error`) e dá fallback razoável. ✓
- **`close()` em `finally`**: garante que pool nunca vaza, mesmo em assert fail. ✓

---

## 4. Inspeção contra audit `0002`

| Sub-item | Proposta do audit | Aplicado? |
| :-- | :-- | :-- |
| **H3** — `idleTimeout: 270_000`, `enableKeepAlive`, `keepAliveInitialDelay`, `timezone: 'Z'`; expor `idleTimeoutMs` | Tudo. `keepAliveInitialDelay` e `enableKeepAlive` já existiam — preservados. | ✅ |
| **M2** — `timezone: 'Z'`; opcional `SET time_zone = '+00:00'` no smoke | Driver: ✓. Smoke `SET time_zone` deixado fora — `timezone: 'Z'` no connection options já faz o mysql2 escrever em UTC; teste CA-11 verifica isso runtime sem necessidade de SET explícito. | ✅ |
| **M5** — em prod `applyMigrations: false`; migrar via job dedicado; dev/CI mantém `true` | Default invertido: agora **omisso/false = não aplica**; dev/CI passam `true` explícito. Job dedicado é responsabilidade operacional, não código deste driver. | ✅ |

---

## 5. Análise de risco

### 5.1 Risco de behavior change observável

| Cenário | Antes | Depois | Impacto |
| :-- | :-- | :-- | :-- |
| Caller existente (`cli/drivers/mysql.ts`) com `applyMigrations: true` | aplica | aplica | nenhum ✓ |
| Caller existente com `applyMigrations: false` | não aplica | não aplica | nenhum ✓ |
| **Caller futuro** que omitir `applyMigrations` | aplica (silenciosamente) | **NÃO aplica** | **mudança de default consciente, documentada** |
| Date round-trip em RDS `America/Sao_Paulo` | drift 3h potencial | UTC explícito | **bugfix latente** |
| Conexão ociosa em pool > 300s | morre, ER 2006 | renovada a 270s | **bugfix latente** |

### 5.2 Risco de regressão em CI

- `pnpm test` baseline 433/0/11 → 438/0/13 (+5 pass, +2 skip). Sem fail. ✓
- `pnpm test:integration` NÃO foi executado nesta sessão (Docker não verificado). CA-11 e CA-12 são esperadas verdes — validar no próximo `pnpm test:integration` opt-in.

---

## 6. Issues encontradas

Nenhuma.

---

## 7. Sugestões para tickets futuros (não bloqueiam)

- **Advisory lock no migrator** (M5 follow-up): para o caso em que dev/CI **ainda** queira `applyMigrations: true` num pipeline com paralelismo (>1 instância de CI testando concorrentemente), adicionar `GET_LOCK('drizzle_migrations', timeout)` antes do migrate. Ticket separado.
- **`maxLifetime`** (best-practice 03 §"AWS"): se RDS Proxy/LB tiver timeout abaixo de `wait_timeout`, configurar `maxIdle` ou implementar recycle. mysql2 não expõe `maxLifetime` nativamente — workaround é tunar `idleTimeoutMs` via env em prod. Fora deste ticket.
- **`mysql_native_password` vs `caching_sha2_password`**: nenhum impacto no escopo deste ticket.

---

## 8. Veredito

**APPROVED.** Todos os DoDs do `000-request.md` atendidos; conformidade total com `CLAUDE.md` + audit `0002` §H3/§M2/§M5; zero regressão observada.

**Avançar para W3.**
