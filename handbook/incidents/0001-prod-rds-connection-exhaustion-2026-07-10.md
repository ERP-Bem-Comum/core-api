# Incident-0001: Esgotamento de conexões no RDS de produção (pool MySQL)

- **Data do incidente:** 2026-07-10, ~13:00–14:36 (BRT)
- **Severidade:** Alta (proximidade de indisponibilidade total — 56/60 conexões; mitigado manualmente antes de derrubar)
- **Ambiente:** Produção — AWS ECS (`erp-bem-comum-backend-prd`) + RDS MySQL (`max_connections=60`, db `core`, user `core`)
- **Detecção:** DBA (Willian Brito / Codebit) via monitoração de `SHOW FULL PROCESSLIST`; salto de 14→52 conexões
- **Mitigação imediata:** limpeza manual das conexões `Sleep` pelo DBA (56/60 → seguro)
- **Status:** Diagnosticado. Correção de causa-raiz rastreada em [`CORE-DB-POOL-CONFIG-INVARIANT`](../../.claude/.pipeline/CORE-DB-POOL-CONFIG-INVARIANT/000-request.md)
- **Autor do post-mortem:** investigação READ-ONLY com 5 agentes especialistas (mysql2-driver, nodejs-runtime, mysql-database, security-backend, drizzle-orm)

> Blameless. O objetivo é aprender com a falha de sistema/processo, não atribuir culpa. O código que causou isto passou por pipeline W0→W3 e code review APROVADO — o valor está em entender **por que a rede de segurança não pegou**.

---

## 1. Resumo executivo (TL;DR)

A aplicação esgotou o pool de conexões do RDS por **duas causas estruturais somadas**, nenhuma delas um "vazamento" no sentido clássico (conexão perdida por exceção):

1. **`idleTimeout` é código morto.** Os 7 drivers MySQL setam `idleTimeout: 270_000` mas **nunca setam `maxIdle`**. No `mysql2`, o reaper de conexões ociosas só é agendado quando `maxIdle < connectionLimit`; como `maxIdle` cai no default (`= connectionLimit`), a condição é sempre falsa e **nenhuma conexão ociosa é jamais reciclada pelo cliente**. Com o `wait_timeout` do RDS no default (8h), nada as fecha → conexões `Sleep` por ~57 min.
2. **Proliferação de pools acima do teto do RDS.** Um único processo HTTP abre **14 pools** (até 16), porque cada *read-port* cross-módulo abre pool próprio em vez de reusar o do módulo dono. `14 × connectionLimit 10 = 140` conexões teóricas contra `max_connections=60`. A aplicação está configurada para, sob carga, pedir mais do que o servidor pode dar.

O gatilho foi um pico de tráfego às ~13:00 que subiu vários pools em direção aos seus limites; sem reaping (causa 1), essas conexões nunca voltaram, e o total ficou preso perto do teto.

**A correção é ortogonal à decisão de linguagem/runtime da [inquiry 0023](../inquiries/0023-language-runtime-reevaluation.md)** — nenhum finalista (Rust/F#/Kotlin) pegaria este bug (é semântica de runtime do driver, não tipo apagável).

---

## 2. Timeline (BRT)

| Hora | Evento |
| :--- | :--- |
| ~13:00 | Conexões do banco saltam de **14 → 52**. Início do acúmulo de conexões `Sleep`. |
| 13:27 | DBA registra o salto 14→52 e começa a investigar (comentário 2 do ticket de manutenção). |
| ~14:18 | DBA identifica origem: IP `10.0.9.161` = task `erp-bem-comum-backend-prd`, user `core`, db `core`. ~40 conexões em `Sleep` há >50 min. Anexa `erp-bem-comum-process-list.csv`. Diagnóstico do DBA: "vazamento no pool (abre conexão e não fecha por exceção)". |
| ~14:18 | DBA faz **limpeza manual** das conexões travadas (estava em **56/60**). |
| 14:36 | DBA reforça pedido de análise no código + oferece baixar `wait_timeout` como mitigação server-side. |
| 15:24 | Time de dev inicia investigação (READ-ONLY, 5 agentes especialistas). |
| — | Causa-raiz dupla confirmada lendo o source real de `mysql2@3.22.3` em `node_modules`. |

Evidência-chave do `SHOW FULL PROCESSLIST` (recorte): dezenas de linhas
`core,"10.0.9.161:PORT",core,Sleep,3414..3419,""` — idade **uniforme** (~57 min, janela de 5 s), todas ociosas, mesma origem.

---

## 3. Causa-raiz (análise técnica)

### 3.1 Causa #1 — `maxIdle` ausente torna `idleTimeout` inerte

Nos 7 `src/modules/*/adapters/persistence/drivers/mysql-driver.ts`, `buildPoolOptions` produz:

```ts
{
  connectionLimit: opts.poolLimit ?? 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  idleTimeout: opts.idleTimeoutMs ?? 270_000,
  // maxIdle: ← NUNCA SETADO
}
```

Comportamento do driver instalado (`node_modules/mysql2/lib/pool_config.js:18` e `lib/base/pool.js:50`):

```js
// pool_config.js
this.maxIdle = isNaN(options.maxIdle) ? this.connectionLimit : Number(options.maxIdle); // default = connectionLimit

// base/pool.js (construtor do pool)
if (this.config.maxIdle < this.config.connectionLimit) {
  this._removeIdleTimeoutConnections(); // ← ÚNICO reaper; SÓ é agendado aqui
}
```

Com `maxIdle == connectionLimit == 10`, a guarda `10 < 10` é **falsa** → o `setTimeout` do reaper **nunca é criado** → `idleTimeout: 270_000` nunca é lido em runtime. Não é "o reaper roda e não acha excesso"; é "o reaper nunca liga".

Do lado servidor, o `wait_timeout` default do MySQL é **28800 s (8h)** (`handbook/reference/mysql/mysql-refman-8.4--oracle/07-server-administration.part03.md:3701`). 57 min está muito abaixo disso → o backstop server-side também não dispara. Os dois lados falharam ao mesmo tempo; por isso ninguém reciclou por quase 1h.

> O guia interno **previu literalmente este incidente**: `handbook/reference/mysql/best-practices/jusdb/03-timeout-variables-production-guide.md:42` — *"Default 28800 s → pool drena ociosamente até esgotar `max_connections`."*

### 3.2 Causa #2 — 14 pools por processo (fragmentação de read-ports)

Cada read-port cross-módulo abre pool **próprio** em vez de reusar o do módulo dono dos dados (contagem do `nodejs-runtime-expert`):

| Composição | Pools |
| :--- | :--- |
| auth | 1 |
| programs read-port (`server.ts`) | 1 |
| contracts (writer + port→partners) | 2 |
| partners (writer) | 1 (+1 se `PARTNERS_READER_URL` distinto) |
| programs deps | 1 |
| **financial** (writer + ports→contracts/programs/partners/auth) | **5** |
| budget-plans (writer + ports→programs/partners) | 3 |
| **Total** | **14** (até 16) |

`PROGRAMS_DATABASE_URL` isolado abre **4** pools distintos; partners, 4; auth, 2. `14 × 10 = 140 > 60`. Os composition roots **já aceitam injeção** dos ports (`config.contractorReadPort`, `config.authUserReadPort`), mas `server.ts` **nunca injeta** — cada módulo reabre o pool do zero a partir da URL crua.

**Reconciliação com a evidência:** o "14" inicial = 14 pools × 1 conexão do smoke `SELECT 1` de boot. O salto para 52 = tráfego do dia tocando módulos diferentes, cada pool subindo em direção ao `connectionLimit=10`, sem nunca devolver (causa 1). Encaixa exatamente.

### 3.3 O que foi DESCARTADO (com prova)

- **Não é leak Drizzle/transação:** `db.transaction()` (drizzle-orm 0.45.2, `session.js:215`) sempre faz `finally { client.release() }`, mesmo em exceção no callback ou no rollback. ~38 sites, todos canônicos e `await`ados.
- **Zero `getConnection()` cru** sem `finally { release() }` em código de produção.
- **Pools são singletons** criados uma vez na composição (boot), nunca por-request.
- **Graceful shutdown está completo:** SIGTERM/SIGINT/uncaughtException fecham todos os 14 pools (`server.ts:368-380` + `last-resort.ts`).
- **Workers do outbox** rodam em tasks/IPs separados (ECS `awsvpc`) — não contribuíram para o IP único `10.0.9.161`.
- **`queueLimit: 0`** não abre sockets (é fila de callbacks JS) — não causou as linhas `Sleep`, mas é amplificador (ver §5).
- **`enableKeepAlive: true`** é ortogonal (camada TCP/SO) — não causa nem agrava o estouro.

---

## 4. Como a rede de segurança falhou (a lição principal)

O `idleTimeout` foi introduzido conscientemente pelo ticket **[`CTR-DB-DRIVER-POOL-TUNING`](../../.claude/.pipeline/CTR-DB-DRIVER-POOL-TUNING/000-request.md)** (audit [`handbook/reviews/0002`](../reviews/0002-audit-adapters-persistence-mysql.md) §H3) para corrigir **outro** modo de falha (ER 2006 `MySQL server has gone away`, quando o servidor mata a conexão antes do cliente). O ticket foi bem-intencionado, passou W0→W3 e teve **W2 APPROVED**. Ainda assim o defeito passou. Por quê:

1. **O teste asseverou o VALOR do campo, não o EFEITO.** A CA do ticket foi `buildPoolOptions().idleTimeout === 270_000` — verifica que o campo está *presente*, nunca que o pool *recicla de fato* uma conexão ociosa. Presença de config ≠ config com efeito. **Esta é a lição central.**
2. **O padrão veio do HikariCP, onde `idleTimeout` funciona sozinho.** A best-practice 03 §"Pool–MySQL alignment" é HikariCP-cêntrica; a tradução para `mysql2` (que exige o par `maxIdle < connectionLimit`) ficou incompleta, e nem o audit nem o review conheciam essa semântica específica do driver.
3. **O code review validou pureza/tipos/imports, não a semântica de runtime da lib.** Nenhum checklist de review cobria "esta opção do driver realmente faz o que o nome sugere, nesta versão?".
4. **O bug foi replicado por cópia para 7 módulos.** Cada driver novo copiou o `buildPoolOptions` do contracts, propagando o mesmo defeito latente 7×. Não havia um único ponto compartilhado onde a invariante pudesse morar (e ser testada uma vez).
5. **A aritmética agregada (Σ pools × connectionLimit vs `max_connections`) não era propriedade de ninguém.** Cada driver escolheu `connectionLimit=10` isoladamente; nenhum artefato somava o total contra o teto do RDS.

> Conexão com a [inquiry 0023](../inquiries/0023-language-runtime-reevaluation.md): a dor declarada ali é "disciplina manual no domínio". Este incidente mostra que a **superfície de falha real de produção é o seam de adapter/config/lifecycle** — camada onde ADT/compilador ajudam menos e que já está fora do escopo de `.claude/rules/domain.md`. O domínio (Result/exhaustive/branded) tem densidade de defeito perto de zero; o que quebrou foi o config glue. A lição não é trocar de linguagem — é **estender a disciplina de smart-constructor/invariante do domínio para baixo, até o config de infra**.

---

## 5. Amplificadores de disponibilidade (achados de segurança correlatos)

Do `security-backend-expert` (CWE-400 / CWE-770 / OWASP API4:2023 — Unrestricted Resource Consumption):

- **`queueLimit: 0` (fila ilimitada) sem timeout de aquisição:** sob saturação, requests enfileiram indefinidamente em vez de falhar rápido (503). Mecanismo clássico de cascata; o sistema não se recupera sozinho após a causa passar.
- **`POST /auth/register` sem rate-limit dedicado + Argon2id síncrono (CPU-bound):** endpoint público que combina exaustão de pool com bloqueio do event loop. Amplificador mais barato que floodar `/login`.
- **`POST /auth/logout` sem rate-limit dedicado.**
- **`trustProxy` default `true` não pinado ao CIDR do BFF:** rate-limit por IP potencialmente burlável via `X-Forwarded-For` spoofado. Confirmar `TRUST_PROXY` no task-def de prod.
- O esgotamento observado (56/60) foi, com alta probabilidade, **DoS auto-infligido por dimensionamento** — não requer atacante.

---

## 6. Ações de remediação

### 6.1 Imediato — server-side (DBA, sem deploy)
- [ ] `wait_timeout=300` + `interactive_timeout=1800` no parameter group do RDS (dynamic, sem reboot; só fecha `Sleep`, **nunca** query em execução). Regra: `wait_timeout ≥ idleTimeout(270s) + 30s`. ⚠️ Só vale p/ conexões novas; não mata as atuais. Só é seguro se a app tratar ER 2006/2013 com retry (a confirmar). **Curativo, não corrige a raiz.**
- [ ] Confirmar origem de `max_connections=60` (`Source` do parameter group: `engine-default` = instância pequena vs `user` = override) e o `wait_timeout` real vigente.
- [ ] Monitoração recorrente (via `performance_schema.threads`, não `information_schema.processlist` — deprecated): conexões por host/estado/idade; alertar `Sleep > 600s` crescente; observar `Connection_errors_max_connections`, `Max_used_connections`, `Aborted_clients`.

### 6.2 Causa-raiz — app-side (ticket [`CORE-DB-POOL-CONFIG-INVARIANT`](../../.claude/.pipeline/CORE-DB-POOL-CONFIG-INVARIANT/000-request.md))
- [ ] **Invariante de `PoolConfig`** (smart constructor compartilhado): exigir `maxIdle` quando `idleTimeout` está setado; reforçar `maxIdle < connectionLimit` (senão o reaper é inerte). Retorna `Result`, não config silenciosamente morta.
- [ ] **Teste de EFEITO, não de valor:** integração que prova que uma conexão ociosa é de fato fechada após `idleTimeout` (não apenas que o campo está presente).
- [ ] Adotar o construtor único nos 7 drivers (elimina a duplicação que propagou o bug).

### 6.3 Follow-ups estruturais (tickets separados)
- [x] **Consolidação dos workers** (6→3 processos, 9→3 pools) — [#407](https://github.com/ERP-Bem-Comum/core-api/issues/407): worker-runner por afinidade (`WORKER_GROUP=outbox|projections|email`) com 1 `PoolRegistry` (dedup por connection-string) por grupo. Fatia 1 (código, `CORE-WORKER-RUNNER-POOL-REGISTRY`) + Fatia 2 (deploy — compose + taskdefs Fargate, `CORE-WORKER-CONSOLIDATION-DEPLOY`). Como todas as `*_DATABASE_URL` colapsam no mesmo RDS/db `core` (ADR-0014), cada grupo = 1 pool.
- [ ] **Consolidação de pools** (14→~7): injetar os read-ports já existentes em `server.ts` em vez de reabrir pool por read-port.
- [ ] **Connection budget** como conceito de 1ª classe: `connectionLimit` derivado de `RDS max_connections / N_pools / N_tasks`, com folga p/ DBA/ETL.
- [ ] **`queueLimit` finito + fail-fast 503** (`Retry-After`) + timeout de aquisição na aplicação.
- [ ] **Segurança:** rate-limit dedicado em `/register` e `/logout`; pinar `TRUST_PROXY` ao CIDR do BFF.

---

## 7. Lições (para o handbook / checklist de review)

1. **Config presente ≠ config com efeito.** Ao setar uma opção de driver/lib, testar o **comportamento observável** (a conexão ociosa fecha?), não a presença do campo no objeto de opções.
2. **Semântica de opção é versionada e específica da lib.** `idleTimeout` no `mysql2` depende de `maxIdle`; no HikariCP, não. Ao portar best-practice de um pool para outro, validar contra o source/doc da lib-alvo, nunca por analogia de nome.
3. **Invariantes cross-cutting moram em um único lugar testável.** Config de pool duplicada em 7 módulos = bug propagado 7×. Um smart constructor compartilhado teria concentrado a correção (e o teste) num ponto.
4. **Recursos agregados precisam de dono.** `Σ(connectionLimit) vs max_connections` tem que ser uma propriedade explícita e verificada — não emergir da soma acidental de defaults por módulo.
5. **A borda deve falhar rápido sob saturação** (503 + `Retry-After`), nunca enfileirar sem limite.
6. **"Não é meu erro / é ambiental" é proibido** (CLAUDE.md §Política de regressão zero): o `wait_timeout` do RDS ser default não isenta a app — o fix é dos dois lados.

---

## 8. Referências

- Ticket de correção: [`.claude/.pipeline/CORE-DB-POOL-CONFIG-INVARIANT/`](../../.claude/.pipeline/CORE-DB-POOL-CONFIG-INVARIANT/000-request.md)
- Ticket que introduziu o `idleTimeout`: [`.claude/.pipeline/CTR-DB-DRIVER-POOL-TUNING/`](../../.claude/.pipeline/CTR-DB-DRIVER-POOL-TUNING/000-request.md)
- Audit de origem: [`handbook/reviews/0002-audit-adapters-persistence-mysql.md`](../reviews/0002-audit-adapters-persistence-mysql.md) §H3
- Best-practice de timeouts: [`handbook/reference/mysql/best-practices/jusdb/03-timeout-variables-production-guide.md`](../reference/mysql/best-practices/jusdb/03-timeout-variables-production-guide.md)
- Refman MySQL 8.4 — `wait_timeout`/`max_connections`: `handbook/reference/mysql/mysql-refman-8.4--oracle/07-server-administration.part02.md` / `part03.md`
- Inquiry de runtime/linguagem (contexto estratégico): [`handbook/inquiries/0023-language-runtime-reevaluation.md`](../inquiries/0023-language-runtime-reevaluation.md)
- Evidência de runtime do driver: `node_modules/mysql2/lib/base/pool.js:50`, `lib/pool_config.js:18` (mysql2@3.22.3)
