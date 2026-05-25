# 📋 Planejamento — Outbox MySQL (ADR-0015)

> **Status:** ✅ **ENTREGUE em 2026-05-21.** Série de 7 tickets `CTR-OUTBOX-*` fechada ALL-GREEN. Este arquivo é **histórico/auditável** — não é mais plano ativo.
> **Tickets fechados:** `CTR-OUTBOX-SCHEMA`, `CTR-OUTBOX-PORTS-AND-MAPPERS`, `CTR-OUTBOX-ADAPTER-DRIZZLE`, `CTR-OUTBOX-INTEGRATION-IN-REPOS`, `CTR-OUTBOX-WORKER`, `CTR-OUTBOX-CLI-WORKER`, `CTR-OUTBOX-PUBLIC-API`. Audit trail em `.claude/.pipeline/CTR-OUTBOX-*/`.
> **ADR fonte:** [`handbook/architecture/adr/0015-mysql-outbox-pattern.md`](../../handbook/architecture/adr/0015-mysql-outbox-pattern.md).
> **Para o futuro Claude/dev que abrir este arquivo:** se o usuário pedir "continuar outbox", confirmar primeiro se é melhoria nova (dead letter avançado, retries com backoff exponencial, métricas de delivery, etc.) — a série base **está fechada**. Ver §"Lições & Best Practices Alcançadas" no fim do arquivo para o resumo do que foi entregue.
> **Skills relevantes para evoluções futuras:** [`database-theorist`](../skills/database-theorist/SKILL.md), [`database-engineer`](../skills/database-engineer/SKILL.md), [`ports-and-adapters`](../skills/ports-and-adapters/SKILL.md), [`ts-domain-modeler`](../skills/ts-domain-modeler/SKILL.md).

---

## Por que este trabalho

Concluímos a sequência ADR-0020 (#1-#8) — módulo Contratos 100% MySQL em código/infra/tests/docs. Próxima frente lógica identificada: **Outbox MySQL**.

**Justificativa**: o EventBus atual é só `InMemoryEventBus` (array em memória). Eventos não persistem, não atravessam módulos, não são auditáveis. Pré-requisito para:
- Comunicação real com módulo Financeiro (quando existir).
- Auditoria de mudanças de estado (regra "Princípios Compartilhados §1" do handbook de domínio).
- Atomicidade ACID entre domain change + evento (sem isso, race condition entre `repo.save` e `eventBus.publish` pode produzir estado sem evento ou vice-versa).

---

## Estado atual × ADR-0015

| Aspecto | Hoje | ADR-0015 exige |
|:---|:---|:---|
| Atomicidade evento + state | ❌ `eventBus.publish` chamado **após** `repo.save` — duas transações | ✅ INSERT outbox **dentro** da transação do domain change |
| Persistência de eventos | ❌ Só `InMemoryEventBus` (array em memória) | ✅ Tabela MySQL `core.outbox` |
| Idempotência do consumidor | ❌ Não existe | ✅ Tabela `eventos_processados` |
| Dead letter | ❌ Não existe | ✅ Tabela `outbox_dead_letter` |
| Worker | ❌ Não existe | ✅ Polling com `FOR UPDATE SKIP LOCKED` |
| Schema versionado | ❌ Eventos têm objetos de domínio (Money, Period) | ✅ `schema_version: 1` + payload JSON serializável |
| Public API | ❌ `public-api/` vazia | ✅ Contrato público para outros módulos consumirem |

**Eventos atualmente declarados** (em `src/modules/contracts/domain/{contract,amendment}/events.ts`):
- `ContractCreated`
- `ContractStateUpdated` (snapshot `newCurrentValue` + `newCurrentPeriod`)
- `ContractEnded` (kind `Expired` | `Terminated`)
- `AmendmentCreated`
- `AmendmentDocumentAttached`
- `AmendmentHomologated`

`EventBus` port em `src/modules/contracts/application/ports/event-bus.ts` — único método `publish`.

---

## ⚠️ Decisões a confirmar (BLOQUEANTE — não avançar sem isso)

### D1 — Localização da tabela outbox

| Opção | Schema | Recomendação |
|:---|:---|:---:|
| **A — Compartilhado** | `core.outbox` (sem prefix) | |
| **B — Por módulo** | `core.ctr_outbox`, futuramente `core.fin_outbox` | ✅ Claude recomenda |

**Razão da recomendação B**: alinhamento com prefix `ctr_*` (ADR-0014); preserva caminho de extração para microservice futuro; custo MVP é só `UNION ALL` no worker.

### D2 — Como o evento chega à outbox

| Opção | Como fica | Trade-off | Recomendação |
|:---|:---|:---|:---:|
| **A — Repo aceita eventos no `save`** | `repo.save(aggregate, events)` faz tudo na mesma transação | Repo conhece outbox; semântica clara | ✅ Claude recomenda |
| **B — `OutboxPort` separado, use case orquestra `db.transaction`** | Use case abre transação manualmente | Use case conhece infra — **VIOLA `CLAUDE.md` §"Application"** | ❌ |
| **C — Aggregate retém `pendingEvents`** | `Contract.create()` retorna agregado com events embutidos | DDD clássico mas mexe nos tipos atuais | ⚠️ |

### D3 — Nome dos eventos no wire (JSON payload)

| Opção | Trade-off | Recomendação |
|:---|:---|:---:|
| **EN no wire** (`ContractStateUpdated`) | Consistente com types TS | ✅ Claude recomenda (alinha com `CLAUDE.md` §"Idioma") |
| **PT no wire** (`EstadoContratualAtualizado`) | Domínio ubíquo do handbook | ❌ |

**Decisão sugerida**: EN no wire; handbook PT é mapa de tradução em conversas com P.O.

### D4 — Worker rodando como

| Opção | Trade-off | Recomendação |
|:---|:---|:---:|
| **A — Processo separado** (`pnpm worker:outbox`) | Padrão prod; orquestração extra em dev | |
| **B — Threadlet no processo CLI** | Simples dev; ruim prod | ❌ |
| **C — Subcomando da CLI** (`pnpm cli:contracts run-outbox-worker`) | Reusa driver/context; dev simples; vira systemd em prod | ✅ Claude recomenda |

### D5 — Delivery no MVP

Sem Financeiro existindo, o que o worker faz com evento lido? Recomendo: port `EventDelivery` com adapter `LoggerEventDelivery` default (stdout + arquivo). Adicionar subscribers in-process quando módulo Financeiro entrar.

---

## Sequência de tickets proposta (7 tickets)

| # | Ticket | Escopo | Size |
|:-:|:---|:---|:---:|
| 1 | **`CTR-OUTBOX-SCHEMA`** | 3 tabelas (`ctr_outbox`, `ctr_outbox_dead_letter`, `eventos_processados`) + CHECKs + índices (composto `(processed_at, occurred_at)`) + migration drizzle. Validação E2E. | M |
| 2 | **`CTR-OUTBOX-PORTS-AND-MAPPERS`** | Ports `OutboxPort` + `EventDelivery`. Mappers `event ↔ JSON` (Money→cents, Period→3 colunas, Date→ISO, UUID→string). Adapters InMemory. Tests contratuais. | M |
| 3 | **`CTR-OUTBOX-ADAPTER-DRIZZLE`** | Adapter Drizzle/MySQL para `OutboxPort` — INSERT idempotente, SELECT pendentes com `FOR UPDATE SKIP LOCKED`, UPDATE `processed_at`, INSERT em dead letter. Tests integration. | M |
| 4 | **`CTR-OUTBOX-INTEGRATION-IN-REPOS`** | Refactor `contract-repository.drizzle.ts` + `amendment-repository.drizzle.ts`: `save(aggregate, events)`. Refactor dos 6 use cases pra passar `events` no save. Remove `eventBus.publish` separado. | L |
| 5 | **`CTR-OUTBOX-WORKER`** | Worker em `src/modules/contracts/worker/outbox-worker.ts` — loop polling com batch size N, `SKIP LOCKED`, max attempts, dead-letter routing. Tests unitários (sem MySQL) + integration. | L |
| 6 | **`CTR-OUTBOX-CLI-WORKER`** | Subcomando `pnpm cli:contracts run-outbox-worker --driver mysql --connection-string ...`. Graceful shutdown (SIGTERM). Documentação operacional. | S |
| 7 | **`CTR-OUTBOX-PUBLIC-API`** | `src/modules/contracts/public-api/events.ts` — exporta `ContractsModuleEvent` (union estável), `schema_version: 1`, decoders versionados para outros módulos importarem. | S |

**Total estimado**: 3L + 3M + 2S ≈ esforço da sequência ADR-0020 (#1-#8).

---

## Princípios condutores (ancorados no handbook)

1. **Atomicidade ACID** (ADR-0015 §"Fluxo" + Date Cap. 9): evento existe SE E SOMENTE SE o domain change persistiu. INSERT outbox dentro da MESMA transação.
2. **Idempotência** (ADR-0015 §"Idempotência"): consumidores fazem `SELECT FROM eventos_processados WHERE event_id = ?` antes de processar; INSERT na mesma transação do efeito colateral.
3. **`FOR UPDATE SKIP LOCKED`** (MySQL 8.4 Refman §"Locking Reads"): workers paralelos consomem sem race.
4. **Polling, não LISTEN/NOTIFY** (ADR-0015 — MySQL não tem). Latência ~500ms-1s aceitável.
5. **Domínio puro** (`CLAUDE.md` §"Domínio puro"): eventos continuam tipos do domínio; serialização é responsabilidade do mapper no adapter.
6. **Convenção de naming** (ADR-0015 §"Convenções"): EN passado, PascalCase no `event_type`, camelCase nos campos, `schema_version` versionado.

---

## Riscos identificados

| # | Risco | Mitigação |
|:-:|:---|:---|
| 1 | Refactor dos 6 use cases pode quebrar `pnpm test` (`InMemoryEventBus` usado em tests) | Manter `InMemoryEventBus` como adapter alternativo do `OutboxPort` para tests rápidos |
| 2 | Worker em loop infinito segura pool MySQL e bloqueia `--wait` no compose | `SIGTERM` handler + `pool.end()` no shutdown |
| 3 | Eventos atuais contêm `Money`, `Period`, `Date` — serializar sem perda exige cuidado | Mapper `event → JSON` com round-trip testado em suite contratual |
| 4 | `schema_version` mal versionado vira tech debt | Decoder DEVE fazer match exaustivo em `schema_version`; defensivo no consumer |
| 5 | Worker em dev pollui DB com eventos não processados | Subcomando admin `outbox:clear` ou TRUNCATE em `test:integration` |

---

## O que falta antes de começar

**3 confirmações do usuário** (D1, D2, D4 — D3 e D5 têm recomendação clara que provavelmente passa direto):

1. ☐ **D1**: Outbox compartilhado (`core.outbox`) ou por módulo (`core.ctr_outbox`)? — Claude recomenda **B (por módulo)**.
2. ☐ **D2**: Como o evento chega à outbox? — Claude recomenda **A (`repo.save(aggregate, events)`)**.
3. ☐ **D4**: Worker é subcomando da CLI? — Claude recomenda **C (subcomando `run-outbox-worker`)**.

Após confirmação → abrir ticket #1 (`CTR-OUTBOX-SCHEMA`) seguindo padrão `.claude/.pipeline/<ticket>/` da sequência ADR-0020 (W0→W1→W2→W3).

---

## Contexto de retomada (quando o usuário voltar)

- Sequência ADR-0020 (#1-#8) **encerrada** — módulo Contratos 100% MySQL.
- Tech debt `CTR-INFRA-MYSQL-HEALTHCHECK-TCP` resolvido (healthcheck TCP em vez de socket Unix).
- Suite default: 444 tests / 433 pass / 0 fail / 11 skipped.
- Suite integration: 57/57 pass.
- `pnpm test:integration` 10/10 PASS back-to-back após fix do healthcheck.

**Para retomar:** ler este arquivo + ADR-0015 + esperar usuário confirmar D1/D2/D4.

---

## ✨ Lições & Best Practices Alcançadas (em curso)

Anotação rolling durante a execução dos 7 tickets — para preservar padrões a manter nos próximos e em refresh futuros da SKILL.md.

### Após ticket #1 — CTR-OUTBOX-SCHEMA (2026-05-21)

- **CHARSET/COLLATE manual aplicado no SQL gerado pelo Drizzle:** `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` nas 3 tabelas + `COLLATE utf8mb4_bin` em todos os UUIDs (`event_id`, `aggregate_id`). Sem isso, ordenação binária dos UUIDs ficaria inconsistente. ADR-0020 § "Hardening de migration" reforça.
- **Índice composto `(processed_at, occurred_at)` com `NULL` agrupado na 1ª posição:** worker faz range scan eficiente sobre eventos pendentes, ordenando por `occurred_at` dentro do bucket NULL. Confirmado via EXPLAIN no CA6-T4.
- **`eventos_processados` sem prefix `ctr_*`:** exceção PT-BR justificada por ser **tabela cross-módulo** (qualquer consumer, não só Contratos). Documentado no schema e no 000-request. Padrão para repetir em futuros recursos cross-módulo.
- **`.prettierignore` ganhou `migrations/mysql/meta/`:** artefatos gerados pelo `db:generate` não devem entrar no `prettier --check` — consistente com `pnpm-lock.yaml`.

### Após ticket #3 — CTR-OUTBOX-ADAPTER-DRIZZLE (2026-05-21)

- **`.for('update', { skipLocked: true })` API do Drizzle 0.45 funciona:** API documentada presente; não precisou de raw SQL fallback. Padrão para futuros adapters que precisem locking reads.
- **`markProcessed` idempotente via `AND processed_at IS NULL`:** UPDATE com filtro extra evita dupla marcação em retries do worker. Padrão a manter.
- **`moveToDeadLetter` atômico via `db.transaction`:** INSERT DLQ + DELETE outbox numa tx. Test mock-fail no DELETE confirma rollback do INSERT.
- **ER_DUP_ENTRY detection:** `err.errno === 1062` ou `err.code === 'ER_DUP_ENTRY'`. Pattern reutilizável para qualquer adapter que precise capturar UNIQUE violations.
- **W2 round 1 pegou `class extends Error`** usado para out-param de transação — refactor para mutable closure variable (`let captured: T | undefined`) manteve atomicidade sem violar CLAUDE.md "Sem class". Padrão para qualquer transação Drizzle que precise emitir erro tipado de dentro do callback.

### Após ticket #2 — CTR-OUTBOX-PORTS-AND-MAPPERS (2026-05-21)

- **Padrão D 100% aplicado:** module-as-namespace + tagged records flat + case constructors free functions + switch exaustivo sem `default: throw` + `OUTBOX_SCHEMA_VERSION = 1` versionado para evolução de wire format. Padrão a manter rigorosamente nos próximos tickets do Outbox.
- **`LoggerEventDelivery` entrega JSONL para stdout + arquivo opcional** — primeiro adapter funcional do `EventDelivery`, pronto para uso pelo worker do ticket #5. Format `{ eventId, eventType, schemaVersion, deliveredAt, payload }` por linha. Padrão a reutilizar quando módulo Financeiro entrar.
- **Round-trip serializa/desserializa via smart constructors do domínio:** `Money.fromCents`, `Period.create`/`createIndefinite`, `Date(ISO)`, `ContractId.rehydrate`, etc. Qualquer drift entre payload e shape do evento é detectado em runtime via `outboxRowToEvent → err(OutboxMapperInvalidPayload)`. Test contratual cobre os 6 event types.
- **Suite contratual parametrizada (`outbox.contract.ts`, `event-delivery.contract.ts`):** mesma suite roda contra InMemory adapter agora; vai rodar contra Drizzle adapter no ticket #3 sem reescrita. Padrão a manter — invariante de adapter swap.

### 🏆 SÉRIE OUTBOX COMPLETA (2026-05-21) — 7/7 tickets fechados ALL GREEN

Baseline final: **706 testes / 693 pass / 0 fail / 13 skipped**. 24 tickets consecutivos protocolo Opção B sem regressão acumulada.

ADR-0015 implementado integralmente. Pronto para Frente C (módulo Financeiro consumidor) ou Frente D (Frente B+: Event Sourcing + Observability + Property-based testing — entrevista 0002).

### Após ticket #7 — CTR-OUTBOX-PUBLIC-API (2026-05-21)

- **`public-api/events.ts` é o único ponto de import externo** (ADR-0006). Outros módulos NÃO importam de `<module>/domain/` ou `<module>/application/`. Re-export controlado de `OutboxRow` permite consumer passar row para `decodeContractsModuleEventV1` sem acessar adapters.
- **Decoder versionado v1:** `decodeContractsModuleEventV1(row): Result<Event, DecoderError>`. Permite evolução do wire format — quando subir v2, manter v1 para compat. Padrão a aplicar em todos os módulos que exporem events.
- **Type guard `isContractsModuleEvent(u: unknown)`:** Set-based check + runtime narrow. Usado em borda externa (webhook listener, HTTP handler) onde unknown chega via JSON parse.
- **3 tagged errors no decoder** (`DecoderInvalidShape`, `DecoderSchemaVersionMismatch`, `DecoderInvalidPayload`) — wrapping de `OutboxMapperError` em `DecoderInvalidPayload` preserva evidência da causa raiz.
- **Sem ciclo de import:** public-api importa de adapters/persistence/mappers (para `outboxRowToEvent`), mappers NÃO importa de public-api. Verificável via grep — invariante a manter.

### Após ticket #5 — CTR-OUTBOX-WORKER (2026-05-21)

- **`runOnce` puro + `runLoop` wrapper:** separação canônica — `runOnce` é função pura idempotente testável; `runLoop` é só `while(!aborted) { runOnce + sleep }`. Tests unit cobrem `runOnce` exaustivamente; `runLoop` precisa só de smoke test com `AbortSignal` timeout 100ms.
- **`sleep(ms, signal?)` com AbortSignal-cancellation:** padrão Node 24 — `setTimeout` + `signal.addEventListener('abort', cleanup, { once: true })`. Worker termina graciosamente em SIGTERM. Padrão a reutilizar em qualquer loop polling.
- **Backoff inteligente (idle vs working):** `runLoop` usa `idleSleepMs` (longer) quando 0 entregues e `pollIntervalMs` (curto) quando há trabalho. Evita overheating do MySQL com queries vazias. Default: idle=500ms, polling=100ms.
- **`InMemoryOutbox` expande com 8 helpers** (`findPendingForUpdate`, `markProcessed`/`Sync`, `markFailed`, `moveToDeadLetter`, `deadLetter`, `setAttempts`, `corruptRow`) — mesma interface do Drizzle adapter. `markProcessedSync` necessária para suite contratual síncrona herdada do #2.
- **`corruptRow` helper:** injeta payload malformado no InMemoryOutbox para testar caminho de erro do mapper sem precisar do MySQL real. Padrão para qualquer adapter InMemory que precisa simular dados corrompidos para tests.
- **Concorrência 2 workers integration test (CA-I2):** 2 pools mysql2 distintos + 2 chamadas paralelas de `findPendingForUpdate(10)`. `FOR UPDATE SKIP LOCKED` particiona automaticamente — nenhum evento entregue 2×. Padrão para validar SKIP LOCKED em qualquer outbox-like pattern.

### Após ticket #6 — CTR-OUTBOX-CLI-WORKER (2026-05-21)

- **`WorkerOutboxOps` exportado de `outbox-worker.ts`:** tipo nomeado para os 4 helpers do worker. Permite que `CliContext` referencie a interseção `OutboxPort & WorkerOutboxOps` sem importar `WorkerDeps` inteiro (que puxa `EventDelivery` e `Clock`). Padrão: extrair sub-tipo nomeado quando um tipo composto é reutilizado em camadas distintas.
- **`CliContext` expandido com `driver`, `outbox`, `outboxCleanup`:** `driver: DriverKind` permite que subcomandos rejeitem drivers incompatíveis (ex.: `run-outbox-worker` requer `'mysql'`). Padrão para qualquer subcomando com restrição de driver.
- **Merge manual `OutboxPort & WorkerOutboxOps` nos drivers:** `{ append: outbox.port.append, findPendingForUpdate, markProcessed, markFailed, moveToDeadLetter }` — evita polimorfismo desnecessário. Padrão: montar intersection explícito nos drivers em vez de usar spread (`{ ...obj1, ...obj2 }`) que perde type safety.
- **`exactOptionalPropertyTypes`: nunca atribuir `undefined` explicitamente a campos opcionais** — omitir a chave. `outboxCleanup: undefined` causa erro de compilação; a solução é simplesmente não incluir a propriedade no literal. Padrão crítico para qualquer contexto com `exactOptionalPropertyTypes: true`.
- **`--test-abort` flag de teste injetada na allowlist do subcomando:** pré-aborta o AbortController antes de `runLoop`, tornando CA-T3 determinístico sem sleep real. Alternativa (injetar `AbortSignal` como argumento do `run`) foi descartada por mudar a assinatura do `SubCommand`. Padrão para qualquer subcomando que precise testar loops longos.
- **`no-unsafe-member-access` não está desligado na config de testes:** ao fazer monkey-patch em `process.stdout.write` (cast `as any`), o ESLint dispara mesmo com `@typescript-eslint/no-explicit-any` suprimido. Solução: adicionar `@typescript-eslint/no-unsafe-member-access` no mesmo disable comment da linha. Padrão a aplicar em qualquer test helper que faça monkey-patch em objetos Node.js.

### Após ticket #4 — CTR-OUTBOX-INTEGRATION-IN-REPOS (2026-05-21)

- **`appendOutboxInTx` lança em vez de retornar Result:** dentro do callback `db.transaction`, lançar é correto — o Drizzle faz rollback quando o callback rejeita. O repo pai captura via `safe()` e converte para `RepositoryError`. Padrão para qualquer helper que precisa participar de uma tx alheia sem acesso ao `safe()` externo.
- **`typeof schema` como argumento de `appendOutboxInTx`:** é necessário `import type * as schema` no arquivo do outbox para usar `typeof schema` como tipo do parâmetro. Funciona com `verbatimModuleSyntax` porque só é usado como tipo.
- **`eslint-disable-next-line` deve estar IMEDIATAMENTE antes do parâmetro infrator**, não antes da declaração da função. Colocar o comment na linha da `const fn = async (` não suprime a violação na linha do parâmetro — W2 detectou e W2-Round-2 aprovou após fix.
- **`ContractRepositoryError` agora inclui tagged records (`OutboxAppendError`):** template literals que interpolam `r.error` de `ContractRepository` precisam de `JSON.stringify(r.error)` — `restrict-template-expressions` e `no-base-to-string` blocam `${taggedObject}`. Padrão a aplicar em todos os testes que acessam erros de repos que incluem outbox na union.
- **`InMemoryContractRepository(outbox.port)` com default** — a assinatura `(outbox: OutboxPort = InMemoryOutbox().port)` permite que callers antigos (ex: `InMemoryContractRepository()`) continuem funcionando sem argumento. Só testes que precisam inspecionar eventos precisam injetar o outbox explicitamente.
- **`outbox.clear()` em `setupWorld`** — obrigatório para isolar eventos do caso de uso testado dos eventos do setup de fixtures. Padrão: `outbox.clear()` no final do setup, depois de popular repos.
- **Domínio não importa de application:** `ContractsModuleEvent` e `OutboxAppendError` são definidos em `application/ports/` mas precisam aparecer na assinatura do port em `domain/`. A solução é aceitar que os repositórios (que ficam em `domain/` por Critério H2) importem esses tipos de `application/ports/` — layer inversion menor, documentada, e explicitada no 000-request como "migração futura".

### Após ticket #3 — CTR-OUTBOX-ADAPTER-DRIZZLE (2026-05-21)

- **`class extends Error` proibido pelo ESLint em TODO o projeto** (não só no domínio) — `no-restricted-syntax` trava `ClassDeclaration` globalmente. Canal de controle dentro de `db.transaction` deve usar out-param (`[OutboxQueryError | null]`) em vez de `throw new CustomError`. Padrão a aplicar em qualquer adapter que precise sinalizar erro lógico (not-found, duplicate) de dentro de um callback de transação.
- **`let` sem inicialização falha `init-declarations: always`** — refatorar para `const` direto; se a lógica de try/catch tornava necessário o `let`, rever se o try ainda é necessário (no caso `eventToOutboxInsert` é puro e não lança — o try era YAGNI).
- **Helpers síncronos para suite contratual via buffer interno:** o adapter Drizzle expõe `testHelpers.all()`, `testHelpers.pending()`, `testHelpers.markProcessed()` com buffer mantido em memória — satisfaz a interface síncrona da suite sem ir ao DB. Documentado como test-only no JSDoc. Padrão a replicar em qualquer adapter Drizzle que precise satisfazer suite contratual existente.
- **`idGenerator?: () => string` como opt-in de teste** — permite injetar UUID fixo para testar ER_DUP_ENTRY deterministicamente. Custo zero em prod (parâmetro opcional, default `randomUUID`). Padrão a aplicar em adapters que fazem INSERT com chave gerada pelo app.
- **`FOR UPDATE SKIP LOCKED` disponível via `.for('update', { skipLocked: true })`** no Drizzle 0.45.x mysql-core — API confirmada em `mysql-core/query-builders/select.types.d.ts`. Não é necessário sql raw. Funciona corretamente em 2 connections paralelas (CA-7 confirmado).
- **`markProcessed` idempotente via `AND processed_at IS NULL`** — o WHERE duplo é o padrão canônico para operações "mark once" em outbox. 0 rows affected = OK, não é erro.
- **`moveToDeadLetter` atômico sem `class`** — pattern out-param `[OutboxQueryError | null]` funciona dentro de `db.transaction` callback porque o callback é `async` e a transação permanece aberta até o Promise resolver. Não há race condition.

