# Ticket CORE-DB-POOL-CONFIG-INVARIANT

> **Categoria:** Hardening de infra (config de pool MySQL — invariante compartilhada + teste de efeito).
> **Origem:** [`handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md`](../../../handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md) — esgotamento de conexões em produção (56/60).
> **Corrige regressão latente de:** [`CTR-DB-DRIVER-POOL-TUNING`](../CTR-DB-DRIVER-POOL-TUNING/000-request.md) (introduziu `idleTimeout` sem `maxIdle`; W2 APPROVED validou o *valor*, não o *efeito*).
> **Tamanho:** M — 1 módulo shared novo + adoção nos 7 drivers + testes (estrutural + efeito).
> **Prioridade:** Alta (incidente de produção; política de regressão zero).
> **Escopo de módulo:** transversal (`src/shared/persistence/` + os 7 `adapters/persistence/drivers/mysql-driver.ts`). NÃO toca domínio/aplicação de nenhum módulo — só o config glue do adapter.

---

## ⚠️ Skills / agentes obrigatórios

- 🔧 **agente [`mysql2-driver-expert`](../../agents/mysql2-driver-expert.md)** — dono da semântica `maxIdle`/`idleTimeout`/`connectionLimit` do `mysql2` 3.x. Deve validar a invariante contra o source do driver.
- 🔧 [`database-engineer`](../../skills/database-engineer/SKILL.md) — alinhamento pool↔servidor (best-practice [03](../../../handbook/reference/mysql/best-practices/jusdb/03-timeout-variables-production-guide.md) §"Pool–MySQL alignment").
- 🧪 [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) — W0 RED; **crucial:** desenhar o teste de **efeito** (conexão ociosa fecha), não só de valor de campo.
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração W0→W3.

### Citações que sustentam o ticket

- **Source do driver** (`node_modules/mysql2/lib/pool_config.js:18`): `this.maxIdle = isNaN(options.maxIdle) ? this.connectionLimit : Number(options.maxIdle);` → default `maxIdle == connectionLimit`.
- **Source do driver** (`node_modules/mysql2/lib/base/pool.js:50`): `if (this.config.maxIdle < this.config.connectionLimit) { this._removeIdleTimeoutConnections(); }` → reaper de ociosas **só é agendado** se `maxIdle < connectionLimit`. Caso contrário `idleTimeout` é inerte.
- **Best-practice 03 §"Pool–MySQL alignment":** `idleTimeout` do pool deve ficar ~30 s abaixo do `wait_timeout` do servidor — mas o guia é HikariCP-cêntrico e **não menciona `maxIdle`**, que o `mysql2` exige.
- **Refman 8.4** (`07-server-administration.part03.md:3701`): `wait_timeout` default = `28800` s (8h) — por isso o servidor não reciclou os `Sleep` de 57 min.

---

## Objetivo

Tornar **impossível** configurar um pool `mysql2` com `idleTimeout` inerte. Hoje, os 7 drivers setam `idleTimeout: 270_000` que **nunca recicla conexão** porque `maxIdle` fica no default (`= connectionLimit`), e o guard interno do `mysql2` desliga silenciosamente o reaper. Resultado em prod: ~40 conexões `Sleep` por ~57 min, esgotando o RDS (ver Incident-0001).

A correção aplica a **disciplina de smart-constructor/invariante do domínio à camada de config de infra**: um construtor compartilhado que garante `maxIdle < connectionLimit` por construção e **rejeita (com `Result` error) config explicitamente inerte**, com teste que prova o **efeito observável** (a conexão ociosa fecha), não só a presença do campo.

Este ticket **para o sangramento** (religa o reaping). A aritmética estrutural `Σ pools × connectionLimit > max_connections` é tratada em follow-ups separados (ver §"O que NÃO entra").

---

## Escopo

### O que entra

1. **`src/shared/persistence/mysql-pool-config.ts`** (novo — smart constructor compartilhado)
   - `type PoolConfigInput = Readonly<{ connectionString: string; connectionLimit?: number; idleTimeoutMs?: number; maxIdle?: number }>`.
   - `type PoolConfigError = 'pool-config-idle-timeout-inert' | 'pool-config-connection-limit-invalid' | 'pool-config-max-idle-invalid'` (EN kebab, string literal union).
   - `buildPoolOptions(input: PoolConfigInput): Result<PoolOptions, PoolConfigError>` — função **pura**, sem `throw`, retorna `Result`.
   - **Invariantes reforçadas:**
     - `connectionLimit >= 1` (senão `pool-config-connection-limit-invalid`).
     - `maxIdle` default **derivado e sempre válido**: `maxIdle = clamp(default, 1, connectionLimit - 1)` — nunca `>= connectionLimit`, então o reaper **sempre** arma.
     - Se o caller passa `maxIdle` **explícito** `>= connectionLimit` → `Result` error `pool-config-idle-timeout-inert` (falha alto e claro, nunca config morta).
     - `maxIdle >= 1` (senão `pool-config-max-idle-invalid`).
   - Mantém os demais campos herdados do driver atual: `timezone: 'Z'` (M2 do CTR-DB-DRIVER-POOL-TUNING), `waitForConnections: true`, `enableKeepAlive: true`, `keepAliveInitialDelay: 10_000`, `idleTimeout` default `270_000` (agora **efetivo**).
   - Comentário inline citando `mysql2/lib/base/pool.js:50` (a razão de `maxIdle < connectionLimit` ser obrigatório) + Incident-0001.

2. **Adoção nos 7 drivers** `src/modules/{auth,contracts,partners,financial,budget-plans,notifications,programs}/adapters/persistence/drivers/mysql-driver.ts`
   - Cada `buildXPoolOptions` passa a **delegar** para o `buildPoolOptions` compartilhado (elimina a duplicação que propagou o bug 7×).
   - `createPoolSafe` propaga o `Result` do config (config inválida → `mysql-driver-*` error, sem `createPool`).
   - Preserva os overrides por-módulo já existentes (`poolLimit`, `idleTimeoutMs`) + adiciona `maxIdle?` opcional.

3. **Testes** (ver §"Plano de testes W0").

### O que NÃO entra (follow-ups rastreados — tickets separados)

- 🔸 **Consolidação de pools (14→~7)** — injetar os read-ports já existentes em `server.ts` (`config.contractorReadPort`/`authUserReadPort`) em vez de reabrir pool por read-port. **Maior impacto na aritmética**, mas é refactor de composição (risco maior) → ticket próprio `CORE-DB-POOL-CONSOLIDATE-READPORTS`.
- 🔸 **Connection budget de 1ª classe** — `connectionLimit` derivado de `max_connections / N_pools / N_tasks` com folga → ticket `CORE-DB-CONNECTION-BUDGET`.
- 🔸 **`queueLimit` finito + fail-fast 503** (`Retry-After`) + timeout de aquisição → ticket `CORE-HTTP-POOL-BACKPRESSURE`.
- 🔸 **Segurança:** rate-limit dedicado em `/register` e `/logout`; pinar `TRUST_PROXY` ao CIDR do BFF → ticket(s) na trilha de segurança (validar com `security-backend-expert`).
- 🔸 **Server-side (DBA, não é código):** `wait_timeout=300` + `interactive_timeout=1800` no parameter group; confirmar origem do `max_connections=60`. Rastreado no Incident-0001 §6.1.

---

## Decisões

### D1 — `buildPoolOptions` retorna `Result`, não `throw`, e não config silenciosa
`Result<PoolOptions, PoolConfigError>`. Alinha com `.claude/rules/adapters.md` ("converter para `Result` na borda; nunca vazar `Error`"). O ponto do incidente foi config **silenciosamente** morta — a invariante tem que falhar **alto** (erro tipado no boot) quando alguém pede o impossível, nunca degradar em silêncio.

### D2 — `maxIdle` default derivado, válido por construção
Proposta: `maxIdle` default = `Math.min(2, connectionLimit - 1)` (conservador — mantém poucas conexões quentes por pool, coerente com 14 pools hoje). Sempre `< connectionLimit` ⇒ reaper sempre arma. **Confirmar o número no W1** com `mysql2-driver-expert` + `database-engineer`; o valor exato é tunável e será revisitado holisticamente no ticket de connection budget. O que é inegociável aqui é a **invariante** `maxIdle < connectionLimit`, não o literal.

### D3 — Construtor compartilhado em `src/shared/persistence/` (não por-módulo)
A duplicação por-módulo foi o vetor que propagou o bug 7×. A invariante mora em **um** lugar testável. Não fere ADR-0014 (isolamento por prefixo de tabela): é config **puro**, sem acesso a DB; cada driver continua dono do seu `createPool`/`schema`/migrations. Só o *builder de opções* é compartilhado.

### D4 — Teste de EFEITO é obrigatório (gate opt-in de integração)
A lição central do Incident-0001 (§4): o teste antigo asseverou `idleTimeout === 270_000` (valor), nunca que a conexão ociosa **fecha**. Este ticket exige um teste de integração (opt-in `MYSQL_INTEGRATION=1`, atrás de Docker/x99) que **prove o efeito**: abrir N conexões, deixar ociosas, e verificar que o pool as fecha após `idleTimeout` (contagem cai para `maxIdle`). Estrutural cobre a invariante; integração cobre o comportamento real.

---

## Plano de testes W0 (RED antes de tocar `src/`)

**Estruturais (sem Docker, rodam em `pnpm test`):**
- **CA-1:** `buildPoolOptions({ connectionString, connectionLimit: 10 })` retorna `ok` com `maxIdle < connectionLimit` (reaper arma).
- **CA-2:** `buildPoolOptions({ ..., maxIdle: 10, connectionLimit: 10 })` (explícito `>=`) retorna `err('pool-config-idle-timeout-inert')`.
- **CA-3:** `buildPoolOptions({ ..., connectionLimit: 0 })` retorna `err('pool-config-connection-limit-invalid')`.
- **CA-4:** `buildPoolOptions({ ..., maxIdle: 0 })` retorna `err('pool-config-max-idle-invalid')`.
- **CA-5:** default preserva `timezone: 'Z'`, `idleTimeout: 270_000`, `enableKeepAlive: true`, `waitForConnections: true`.
- **CA-6:** override `idleTimeoutMs`/`maxIdle`/`poolLimit` válidos refletem no `PoolOptions`.
- **CA-7:** cada um dos 7 `openXMysql` propaga `err` do config (config inválida ⇒ nenhum `createPool`).

**Efeito / integração (opt-in `MYSQL_INTEGRATION=1`, validar no x99 — nunca Docker local no Mac):**
- **CA-8:** abrir pool com `connectionLimit=4`, `maxIdle=1`, `idleTimeout=1000`; adquirir 4 conexões concorrentes, liberar todas, aguardar > `idleTimeout`; `SHOW STATUS`/processlist confirma que conexões ociosas acima de `maxIdle` foram **fechadas** (contagem converge para `maxIdle`). É o teste que o CTR-DB-DRIVER-POOL-TUNING **não** tinha.

---

## Critérios de aceite (DoD)

- [ ] `src/shared/persistence/mysql-pool-config.ts` criado: `buildPoolOptions` puro, retorna `Result<PoolOptions, PoolConfigError>`.
- [ ] Invariante garantida: com `idleTimeout` setado, `maxIdle` resultante é **sempre** `< connectionLimit` (default derivado) OU erro tipado se caller forçar `>=`.
- [ ] Os 7 drivers delegam ao construtor compartilhado (zero duplicação da lógica de opções).
- [ ] CA-1..CA-7 (estruturais) verdes em `pnpm test` sem container.
- [ ] CA-8 (efeito) compila e o skip está correto em `pnpm test` puro; **validado verde no x99** (`MYSQL_INTEGRATION=1`) com prova anexada no REPORT (memory `validate-mysql-always-x99-never-mac-docker`).
- [ ] Nenhum `throw` cruza a borda do adapter (anti-padrão #7 / `.claude/rules/adapters.md`).
- [ ] Erros são string literal union EN kebab-case.
- [ ] `pnpm run typecheck` verde.
- [ ] `pnpm run format:check` verde.
- [ ] `pnpm run lint` verde.
- [ ] `pnpm test` verde (delta de contagem documentado no REPORT).
- [ ] Incident-0001 §6.2 marcado como endereçado; follow-ups §"O que NÃO entra" abertos como tickets/issues.

---

## Impacto esperado

- **Direto:** conexões ociosas voltam a ser recicladas em `idleTimeout` (270 s) → fim das conexões `Sleep` eternas. Em repouso, cada pool converge para `maxIdle` (~2), reduzindo drasticamente a pegada agregada mesmo antes da consolidação de pools.
- **Preventivo:** qualquer driver futuro que use o construtor compartilhado herda a invariante — o bug não pode ser reintroduzido por cópia.
- **Não resolve sozinho:** picos concorrentes ainda podem subir pools até `connectionLimit`; o teto agregado só fica seguro com a **consolidação (14→7)** + **budget** (follow-ups). Documentar essa limitação no REPORT do W1.

---

## Referências cruzadas

- Incidente: [`handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md`](../../../handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md)
- Ticket de origem do defeito: [`.claude/.pipeline/CTR-DB-DRIVER-POOL-TUNING/`](../CTR-DB-DRIVER-POOL-TUNING/000-request.md)
- Audit: [`handbook/reviews/0002-audit-adapters-persistence-mysql.md`](../../../handbook/reviews/0002-audit-adapters-persistence-mysql.md) §H3
- Best-practice: [`handbook/reference/mysql/best-practices/jusdb/03-timeout-variables-production-guide.md`](../../../handbook/reference/mysql/best-practices/jusdb/03-timeout-variables-production-guide.md)
- Regras de camada: [`.claude/rules/adapters.md`](../../rules/adapters.md)
- ADR-0020 (MySQL único): [`handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md`](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md)
- Contexto estratégico (runtime): [`handbook/inquiries/0023-language-runtime-reevaluation.md`](../../../handbook/inquiries/0023-language-runtime-reevaluation.md) §4.1
