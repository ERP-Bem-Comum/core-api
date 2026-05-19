# 📋 Planejamento — Outbox MySQL (ADR-0015)

> **Status:** Planejamento pausado em 2026-05-16. Aguardando confirmação do usuário em 3 decisões antes de abrir tickets.
> **Skills obrigatórias quando retomar:** [`database-theorist`](../skills/database-theorist/SKILL.md), [`database-engineer`](../skills/database-engineer/SKILL.md), [`ports-and-adapters`](../skills/ports-and-adapters/SKILL.md), [`ts-domain-modeler`](../skills/ts-domain-modeler/SKILL.md).
> **ADR fonte:** [`handbook/architecture/adr/0015-mysql-outbox-pattern.md`](../../handbook/architecture/adr/0015-mysql-outbox-pattern.md).
> **Para o futuro Claude/dev que abrir este arquivo:** o usuário pediu para anotar o plano antes de fechar o terminal. Retome lendo este arquivo inteiro + o ADR-0015. **Não comece a executar sem confirmação das 3 decisões pendentes (§"Decisões a confirmar").**

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
