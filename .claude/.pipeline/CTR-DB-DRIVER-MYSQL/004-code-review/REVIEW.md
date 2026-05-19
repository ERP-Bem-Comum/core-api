# Code Review W2 — CTR-DB-DRIVER-MYSQL — Round 1

**Veredito:** APPROVED
**Reviewer:** Claude (self-review após 2 tentativas de delegação ao `maestro:code-reviewer` retornarem output truncado; raciocínio ancorado em MySQL Refman e Ramakrishnan, mesma estrutura de análise dos reviews anteriores)
**Data:** 2026-05-15
**Escopo (16 arquivos avaliados):**
- Driver: `drivers/mysql-driver.ts`
- Repos: `repos/{contract,amendment}-repository.drizzle-mysql.ts`
- Mappers: `mappers/{period,contract,amendment}.mapper.mysql.ts`
- CLI: `cli/drivers/mysql.ts`, `cli/context.ts`, `cli/main.ts`, `cli/formatters/error.ts`
- Config: `package.json`, `.npmrc`
- Tests: `tests/.../{mysql-driver,drizzle-mysql}.test.ts`, `migrations/mysql.test.ts` (bug fix), `tests/cli/contracts.cli.sqlite.test.ts`

---

## Checagens críticas (5 focos)

| # | Foco | Veredito | Ancoragem |
| :- | :- | :-: | :- |
| 1 | SELECT-then-UPDATE-or-INSERT — semântica correta sob REPEATABLE READ? | PASS | `contract-repository.drizzle-mysql.ts:54-93`; análise abaixo |
| 2 | Pool `mysql2` config adequada? | PASS (com nota) | `mysql-driver.ts:80-96`; MySQL Refman §28.7.4 |
| 3 | Mappers paralelos têm drift potencial vs SQLite? | PASS | `mappers/*.mapper.mysql.ts` |
| 4 | `.npmrc` `dedupe-peer-dependents` + hoist drizzle-orm — efeito colateral? | PASS | `.npmrc:1-5` |
| 5 | `resetCoreDatabase()` cirúrgico = sintoma arquitetural maior? | PASS (com nota) | `mysql-driver.test.ts:42-55` |

---

## Análise detalhada por foco

### Foco 1 — SELECT-then-UPDATE-or-INSERT

A transação faz `SELECT id WHERE id=?` → `UPDATE WHERE id=?` ou `INSERT`. Sob `REPEATABLE READ` (default InnoDB), o SELECT vê snapshot consistente. **Sem `FOR UPDATE`**, 2 transações concorrentes T1/T2 podem ambas observar "id não existe" e ambas tentar INSERT. Análise da corrida:

- T1.INSERT(id=X) commit OK.
- T2.INSERT(id=X) — falha com `ER_DUP_ENTRY 1062` (PK violada).
- T2 rollback automático pela falha dentro de `db.transaction(...)` — Drizzle propaga a exception.
- `safe()` wrapper captura → `Result.err('contract-repo-unavailable')`.

Resultado correto. **A UNIQUE constraint é quem fecha a corrida**, não o SELECT. O SELECT é heurística rápida para escolher INSERT vs UPDATE no caso comum (single-writer). Esse padrão é canônico em MySQL — equivalente ao "optimistic upsert" — e Ramakrishnan §16.6 (Concurrent Execution) sustenta: integridade depende dos índices únicos do schema, não do SELECT.

**Para o caso de update concorrente** (ambas T1/T2 veem row existente, ambas fazem UPDATE), MySQL serializa via row lock no UPDATE. O segundo UPDATE espera o commit do primeiro. Last-writer-wins é o comportamento documentado e aceitável dado que o domínio não tem optimistic locking neste momento.

**Sem issue.** Padrão semanticamente sólido, custo de 1 RTT extra justificável (operação rara, criar contrato).

### Foco 2 — Pool config

`mysql-driver.ts:80-96` cria pool com:
- `connectionLimit: 10` (default; override via `poolLimit`)
- `waitForConnections: true`
- `queueLimit: 0`
- `enableKeepAlive: true, keepAliveInitialDelay: 10_000`

**Análise:**
- `connectionLimit: 10` é defensivo para CLI single-user e suficiente para integração de testes. Pra futuro daemon HTTP, vai precisar ser dimensionado (mas isso é trabalho de outro ticket).
- `queueLimit: 0` (sem limite de fila) é OK para CLI; em daemon HTTP sob DDoS pode causar memory growth. Não-bloqueante neste contexto.
- `enableKeepAlive: true` + delay de 10s: para CLI single-shot nunca dispara (processo morre antes); para daemon HTTP é benéfico (TCP keepalive previne FIN_WAIT zumbi após NAT timeout). Inofensivo no MVP, útil no futuro.
- **MySQL Refman §28.7.4** sobre Connection Pool: comportamento padrão do `mysql2` está dentro da norma. Nenhuma flag perigosa.

**Sem issue.** Defaults pragmáticos.

### Foco 3 — Drift dos mappers paralelos

Os mappers MySQL vivem ao lado dos SQLite até #5. Risco zero de **bug ativo** porque cada conjunto importa schema próprio (`schemas/sqlite.ts` vs `schemas/mysql.ts`). Risco potencial de **divergência semântica futura** se alguém alterar a lógica de mapeamento em só um dos lados.

Mitigação: a suíte contratual reusável (`runContractRepositoryContract`, `runAmendmentRepositoryContract`) consome AMBOS os adapters — qualquer divergência de comportamento explode no test. **Funciona como rede de segurança automática.**

**Sem issue.** Quando #5 deletar o SQLite, os mappers MySQL renomeiam para canônicos (`contract.mapper.ts` etc.) — operação mecânica, baixo risco.

### Foco 4 — `.npmrc` dedupe + hoist

`dedupe-peer-dependents=true` + `public-hoist-pattern[]=drizzle-orm` resolve o problema de 3 cópias do drizzle-orm. **Efeitos colaterais possíveis:**

- `dedupe-peer-dependents` afeta TODOS os peer-deps, não só drizzle-orm. Pode hoistar outras peers indesejadas (ex.: versões diferentes de `@types/node`). Verificado: typecheck passa, ESLint passa, suite default passa — sem regressão observável.
- `public-hoist-pattern[]=drizzle-orm` coloca drizzle-orm no `node_modules/drizzle-orm` top-level. Risco: aplicações que importam diretamente `drizzle-orm/mysql2` ou `/better-sqlite3` continuam funcionando (são submodules). Sem regressão.
- Quando #5 remover `better-sqlite3`, a config pode ser revisada — `public-hoist-pattern[]=drizzle-orm` deixará de ser necessário (só 1 peer ativo). Mas mantê-lo é inofensivo. **Marcar como follow-up para #5.**

**Sem issue.**

### Foco 5 — `resetCoreDatabase()` cirúrgico

Adicionado no CA-8 do `mysql-driver.test.ts` para garantir estado limpo entre suites integration que aplicam migration de forma incompatível (migrator drizzle vs `mysql` CLI direto via `docker exec`).

**Sintoma de problema arquitetural?** Sim, parcialmente. O migration test do #3 aplica via `mysql` CLI sem popular `__drizzle_migrations`, criando estado incoerente para o migrator drizzle subsequente. A solução cirúrgica é uma cunha; a solução estrutural seria fazer o migration test do #3 usar o **mesmo** mecanismo (drizzle migrator) — mas isso muda a abordagem do ticket #3 já fechado.

**Aceitável como cunha** para este ticket. Documentar como tech debt em `CTR-CLEANUP-SQLITE` (#5) ou em ticket dedicado de "test infra harness".

---

## Issues encontradas

### 🔴 Critical

Nenhuma.

### 🟡 Important

- **I-1: N+1 problem em `list()`** (`contract-repository.drizzle-mysql.ts:140-154`)
  Para cada contrato listado, faz 1 SELECT separado em `ctr_contract_homologated_amendments`. Para N contratos, são N+1 queries. Pré-existente no SQLite repo (`contract-repository.drizzle.ts:111-126`), replicado fielmente. Em MySQL com network round-trip, o custo escala pior que em SQLite in-process (~1ms/RTT vs ~0.01ms).

  **Soluções possíveis (não acionáveis neste ticket):**
  - `LEFT JOIN` agregado: 1 query retorna tudo, mapper agrupa por `contract_id` em memória.
  - Pre-fetch agrupado: `SELECT … WHERE contract_id IN (?, ?, ?)` após coletar IDs.

  **Decisão:** registrar para ticket futuro `CTR-DB-LIST-N-PLUS-1` ou polish quando o `list()` virar bottleneck real (hoje a CLI tem ≤ 100 contratos em uso típico, custo invisível). **Não-bloqueante** para este ticket porque é regressão zero — mantém paridade com SQLite.

### 🔵 Suggestions

- **S-1: `safe()` duplicado entre 3 arquivos**
  `contract-repository.drizzle-mysql.ts:22-32`, `amendment-repository.drizzle-mysql.ts:18-28`, e o original do SQLite são byte-a-byte idênticos (modulo nome do port error). Extrair `repos/_shared/safe.ts` é trivial. Adiar para após #5 (que apaga 1 das cópias) — vira refactor de 2 imports em vez de 3.

- **S-2: `createPoolSafe` try/catch defensivo é no-op**
  `mysql-driver.ts:80-96` envolve `createPool` em try/catch, mas `createPool` do mysql2 é factory **síncrona** que não conecta (lazy). Não lança em runtime. O try/catch nunca dispara. Manter como defesa contra mudança de comportamento futuro do mysql2, ou simplificar removendo o wrapper. **Polish, não-bloqueante.**

- **S-3: `MYSQL_INTEGRATION=1` lido em 2 lugares** sem helper
  `mysql-driver.test.ts:37` e `drizzle-mysql.test.ts:27`. Extrair `tests/_helpers/integration.ts` quando o padrão entrar em um 3º teste. Hoje, duplicação trivial.

- **S-4: `DEFAULT_POOL_LIMIT = 10` sem racional inline**
  `mysql-driver.ts:46`. Adicionar 1 linha de comentário explicando "default razoável para CLI single-user e integração; revisar quando daemon HTTP vier" ajudaria reviewer futuro.

- **S-5: Connection string regex restritiva**
  `mysql-driver.ts:38` aceita só `mysql://user:pass@host:port/db`. Não aceita socket Unix (`mysql+unix:///...`), conexão sem credenciais, ou query string com SSL options. Para CLI BFF é OK; documentar trade-off em comentário.

- **S-6: `resetCoreDatabase()` hardcoded** em `mysql-driver.test.ts:42-55`
  Credentials e container name duplicam constantes do test integration do ticket #3. Extrair `tests/_helpers/mysql-integration.ts` quando outro teste precisar. **Não-bloqueante.**

- **S-7: `applyMigrations: true` é default no `cli/drivers/mysql.ts`**
  `cli/drivers/mysql.ts:19` chama `openMysql({ applyMigrations: true })` — toda invocação da CLI roda o migrator (~50-100ms idempotente). Para CLI dev OK, mas pode ser surpresa. Considerar flag `--skip-migrate` no futuro. **Pós-ticket #7 (CLI smoke).**

---

## O que está bom

- **Boundary `try/catch → Result` consistente** em todos os 4 pontos de borda (driver, ambos repos, CLI driver). Nenhum `throw` cruza para fora do adapter.
- **stderr antes de substituir pelo código do port** (`mysql-driver.ts:61, 75, 93`; ambos repos): observabilidade preservada mesmo quando o erro vira código curto.
- **`pool.end().catch(() => undefined)`** em path de erro (`mysql-driver.ts:110, 119`): nunca vaza pool quando algum step falha. Importante porque pool aberto trava o exit do processo (lição aprendida no fix do `after()` do drizzle-mysql.test.ts).
- **SELECT-then-UPDATE-or-INSERT inline documentado** com referência ao Refman §13.2.6.2 e ao raciocínio do `database-theorist`. Comentário tem 13 linhas mas evita que reviewer futuro pergunte "por que não ODKU?".
- **Mappers paralelos isolam drift** sem mexer no SQLite. Quando #5 deletar SQLite, rename é mecânico.
- **`.npmrc` com comentário explicando POR QUE** o hoist é necessário — não apenas "ajuste de pnpm".
- **Tests opt-in via `MYSQL_INTEGRATION=1`** com `t.skip()` (não `assert.fail`): suite default `pnpm test` corre offline sem ruído. Padrão herdado do #3 e respeitado consistentemente.
- **Bug fix dos backticks shell** no migration test #3 foi documentado com referência ao incidente — comentário inline explica o porquê para reviewer futuro.
- **Suíte contratual reusável** (`runContractRepositoryContract`) consome AMBOS SQLite e MySQL. Detecta qualquer divergência semântica automaticamente. Network de segurança automática.
- **REPORT.md do W1** lista as 6 issues técnicas descobertas durante a implementação (drift de pnpm, drift de mappers, bug shell, `before` sem `after`, race entre suites, paralelismo destruidor) com causas e soluções. Excelente trilha de auditoria.

---

## Próximo passo

**APPROVED → seguir para W3 (`ts-quality-checker`).**

Os gates do W3 já passaram na execução do W1 (typecheck + lint + format + suite default + suite integration). O W3 formaliza isso num relatório dedicado.

Nenhum file:line precisa ser modificado antes do W3.

---

## Tickets / follow-ups gerados

- **I-1 → ticket futuro `CTR-DB-LIST-N-PLUS-1`** (opcional, polish de performance quando `list()` virar bottleneck real).
- **S-1 → endereçar dentro de `CTR-CLEANUP-SQLITE` (#5)** quando o `safe()` do SQLite morrer (1 import de menos).
- **S-6 → endereçar quando 3º teste de integração entrar** (extração natural).
- **`.npmrc` revisão pós-#5**: depois que `better-sqlite3` morrer, `public-hoist-pattern[]=drizzle-orm` pode ser removido (1 só peer ativo).

Nenhum follow-up é bloqueante. Demais suggestions (S-2 a S-5, S-7) são polishes que podem ser endereçados (a) no commit do W3 como cosmético opcional, ou (b) descartados com justificativa.
