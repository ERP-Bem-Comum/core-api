# Pesquisa — Estratégia de processamento assíncrono / mensageria do core-api

> **Status:** Pesquisa (não-normativo). Insumo para decisão (futuro ADR).
> **Data:** 2026-06-16 · **Gatilho:** dúvida do Gabriel — "quase todo módulo está tendo que ter um worker personalizado; isso pode virar gargalo; não sei qual a melhor tecnologia; já buildamos Go".
> **Método:** 5 agentes em paralelo (Explore interno · 2× pesquisa web · nodejs-runtime-expert · mysql-database-expert) + cânone ACDG (Newman, Vernon) + ADRs. MCP `acdg-skills` estava off → fallback na base local `acdg/skills_base`.

---

## Decisão registrada (2026-06-16 — Gabriel)

1. **Endossada a recomendação central:** manter outbox-MySQL + **extrair worker genérico** (`src/shared/outbox/`); **sem broker, sem Go, sem nova infra agora**.
2. **Sequência:** o worker genérico (`CORE-OUTBOX-WORKER-GENERIC`) vem **antes** da feature 014 — a 014 nasce sobre o genérico.
3. **Multi-instância: próximos meses.** Eleva o horizonte de: promover o **ADR-0030** (Valkey, Proposed→Accepted) e adicionar **coordenação de jobs one-shot** (`GET_LOCK`/`UNIQUE` — ADR-0041) antes da 2ª instância. O worker genérico já deve nascer multi-instância-safe (SKIP LOCKED já é; jobs precisam do lock).
4. **Multicloud: indefinido** → manter a opção **portável (self-hosted)** como default; não amarrar a managed AWS. Quando o store/bus entrar, **Valkey self-hosted** (já é a escolha do ADR-0030).

**Próximo trabalho:** ticket `CORE-OUTBOX-WORKER-GENERIC` (branch própria a partir de `dev`, W0→W3) → depois retomar a 014 sobre o genérico. Horizonte seguinte (meses): ticket de promoção do ADR-0030 (Valkey) + coordenação de jobs multi-instância.

---

## 1. A pergunta, decomposta

A dúvida funde **dois problemas distintos** que têm respostas diferentes:

- **P1 — Duplicação (DRY):** cada módulo replica o worker de outbox. Problema **real, presente hoje**.
- **P2 — Gargalo de escala/throughput:** medo de o outbox-MySQL não aguentar. Problema **hipotético** (volume de ERP, single-instance).

Tratar os dois como um só leva à conclusão errada (adotar broker para resolver duplicação). São ortogonais.

---

## 2. Diagnóstico do estado atual (agente Explore)

- **Workers long-running:** `contracts/worker/outbox-worker.ts` e `partners/worker/outbox-worker.ts` — **~87–95% de código idêntico** (`sleep`, `workerTag`, `runOnce`, `runLoop`, config). Única diferença real: contracts desserializa o payload (`outboxRowToEvent`); partners trata payload opaco. O cabeçalho do partners admite: *"replica `contracts/worker/outbox-worker.ts`. A lógica é GENÉRICA."*
- **Jobs one-shot:** `src/jobs/contracts/sweeper/run.ts` (auto-expire D+1, cron externo — ADR-0041).
- **Tabelas outbox:** `ctr_outbox`/`par_outbox` (+ `_dead_letter`) + `eventos_processados (consumer_id, event_id)`. `financial` e `programs` têm schema mas **ainda sem worker** → a 014 ia adicionar o 3º worker copiado.
- **Consumo:** port `EventDelivery`; impls `LoggerEventDelivery`, `TimelineProjectionDelivery` (read-model do contracts — ADR-0022), in-memory.
- **Go:** vive em `tools/deadman-emitter/` (épico #67, ADR-0042) — ferramenta **externa**, I/O puro, **não toca o domínio** nem o banco do core.
- **Escala/SLA:** nenhum SLA documentado; single-instance; sem SRE dedicado.

**Pontos de dor objetivos:** (1) duplicação de worker; (2) financial/programs sem worker; (3) cada novo consumer cross-módulo tende a virar mais um worker copiado.

---

## 3. O que o cânone diz (Princípio IX — citações literais)

**Newman, _Building Microservices_** (`acdg/skills_base/shared-references/architecture/building-microservices--sam-newman.md`):

- Não acessar o banco do outro módulo — _content coupling_ (`:983`):
  > "Content coupling describes a situation in which an upstream service reaches into the internals of a downstream service... The most common manifestation of this is an external service accessing another microservice's database and changing it directly."
- Middleware burro, lógica nos endpoints (`:1943`):
  > "...keep your middleware dumb, and keep the smarts in the endpoints."
- Broker custa, cuidado com sunk cost (`:1940`, `:1949`):
  > "These systems are normally designed to be scalable and resilient, but that doesn't come for free. It can add complexity... it is another system you may [run and maintain]."
  > "If you already have a good, resilient message broker available to you, consider using it... be aware of the sunk cost fallacy."

**Vernon, _Implementing DDD_** (`.../ddd/ddd--vernon-livro-vermelho.md`):

- Consistência eventual fora do boundary, via mensageria (`:7541`):
  > "Forwarding the Event via a messaging infrastructure would allow asynchronous delivery to out-of-band subscribers. Each of those asynchronous subscribers could arrange to modify an additional Aggregate instance in one or more separate transactions. The additional Aggregate instances could be in the same Bounded Context or in others... Events are a domain-wide concept."
- Desacoplamento com latência (`:7072`):
  > "...other dependent changes must occur in separate transactions... We also bring remote dependencies into a consistent state with latency. The decoupling helps provide a highly scalable and peak-performing set of cooperating services."
- Payload do evento (event-carried state transfer) (`:16288`):
  > "A Domain Event rule of thumb says to design them with enough information to satisfy 80 percent of subscribers..." — fundamenta o payload autocontido do ADR-0043.

**Richardson (microservices.io) + Grzybek (modular monolith):**

- Outbox existe pelo **dual-write problem**; **o broker NÃO resolve dual-write — reintroduz** (publicar no handler é a escrita dupla). Logo o outbox **permanece necessário mesmo com broker**.
- Num **único deployable**, o default é **in-process bus + outbox**; broker externo é decisão de adapter, **tipicamente prematuro** (Grzybek). Objetivo real (Newman) é **deployabilidade independente**, não a tecnologia.

---

## 4. Limites reais do outbox-MySQL (mysql-database-expert)

- **Throughput:** ~**500–2.000 ev/s** sustentáveis com índice e config corretos; primeiros sinais de contenção em OLTP a partir de ~50–300 ev/s. Um ERP gera **dezenas–centenas de eventos/hora** — ordens de grandeza abaixo do teto.
- **SKIP LOCKED é seguro para N workers concorrentes** (competing consumers) — sem coordenação extra. Cuidados: índice `(status, occurred_at)`; `READ COMMITTED` (menos gap locks); batch 10–50; `innodb_lock_wait_timeout` baixo + `rollback_on_timeout=ON`; idempotência via `eventos_processados`.
- **Gatilhos de saturação (mensuráveis):** lag de entrega > 10× poll por >5 min; pendentes crescendo > 1.000; lock waits sustentados; buffer-pool hit < 95%; tabela > 500k linhas (purge lag); SELECT de claim > 50 ms.
- **Veredito:** para ERP, o outbox-MySQL é **adequado, não subdimensionado**. Kafka/streaming só faria sentido > ~140 ev/s sustentados (>500k ev/h).

---

## 5. Runtime: Node genérico vs Go (nodejs-runtime-expert)

- **Worker genérico compartilhado** (`src/shared/outbox/`): **idiomático e recomendado**. O contrato já existe (`WorkerOutboxOps` + `EventDelivery`); o único polimorfismo é `mapRow?` (desserializar vs opaco). `AsyncLocalStorage`/correlation e `AbortSignal`/shutdown seguem iguais. **Não exige ADR** — é refactor interno.
- **Go para workers do core (com domínio): não.** 4 custos: (1) o worker aplica regra de domínio que vive em TS → reimplementar = duplicação pior; (2) IPC/HTTP = vira microserviço (fere ADR-0006); (3) 2 toolchains/deploy numa VPS 8 GB; (4) ADR-0002 (runtime único) rejeita heterogeneidade sem ganho. **Go só no nicho do dead-man:** ferramenta externa, I/O/CPU puro, sem domínio.
- **Concorrência Node 24:** processos dedicados para I/O-bound (outbox); `worker_threads` só CPU-bound (ex.: CNAB pesado); `cluster` só p/ HTTP; BullMQ só quando ADR-0030 (Valkey) for promovido.
- **Multi-instância:** outbox + SKIP LOCKED já é seguro p/ N workers. Risco fica nos **jobs one-shot** (cron dispara em N instâncias) → `GET_LOCK`/`UNIQUE` (ADR-0041) ou Valkey quando houver.

---

## 6. Tecnologias avaliadas (pesquisa web — resumo)

| Tecnologia | Modelo | Entrega | Custo op. | Fit projeto | Licença |
|---|---|---|---|---|---|
| **Outbox+polling MySQL** (atual) | log na DB + relay | at-least-once | zero infra nova | **alto** (já temos) | n/a |
| Graphile Worker / pg-boss / River | DB-as-queue | at-least-once | zero (se Postgres) | **incompatível** (são Postgres-only; somos MySQL) | MIT / — |
| **BullMQ** | job queue (Redis/Valkey) | at-least-once | precisa Valkey | bom p/ **jobs** (não eventos) | MIT |
| **Valkey Streams** | log + consumer groups | at-least-once | precisa Valkey | bom p/ eventing leve multi-instância; **alinha ADR-0030** | BSD (LF) |
| RabbitMQ | broker AMQP + Streams | at-least-once | broker dedicado | médio (roteamento rico) | MPL 2.0 |
| **NATS / JetStream** | pub-sub + streams | at-least/exactly-once | broker **leve** | bom se broker for inevitável | Apache 2.0 |
| Kafka / Redpanda / MSK | log particionado | exactly-once | cluster pesado | **overkill** p/ ERP | Apache / BSL |
| AWS SQS/SNS/EventBridge | managed | at-least/exactly | zero infra | **amarra à AWS** → quebra multicloud (Magalu não tem equivalente) | managed |

**Achados decisivos da pesquisa web:**
1. **Não existe "DB-as-queue" maduro para MySQL** (Graphile/pg-boss/River são Postgres-only) → em MySQL, o outbox manual que já temos **é** o estado da arte.
2. **Magalu Cloud não tem broker/fila/streaming gerenciado** (jan/2026) → qualquer managed seria só-AWS, quebrando portabilidade (ADR-0021). Broker portável teria de ser self-hosted (Valkey/NATS/RabbitMQ em K8s).
3. **Licença importa:** Redis virou SSPL→AGPL; **Valkey (BSD/Linux Foundation)** é o caminho OSS — e o ADR-0030 já escolheu Valkey. NATS permaneceu Apache 2.0. Redpanda é BSL.
4. **Passo intermediário antes de broker:** trocar polling por **CDC/Debezium** (transaction log tailing) resolve latência/carga **sem reescrever o domínio** — mas custa operar Kafka Connect.

---

## 7. Hipóteses arquiteturais (com trade-offs e aplicação)

### H1 — Manter outbox-MySQL + **extrair worker genérico** + hardening (RECOMENDADA p/ agora)
Extrair `src/shared/outbox/` (runLoop/claim/retry/DLQ parametrizado por pool+schema+deliveries+`mapRow?`); migrar contracts/partners; financial/014 e programs passam a só fornecer config. Hardening: índice `(status, occurred_at)`, `READ COMMITTED`, purge de processados, relay dedicado fora das réplicas, inbox/idempotência no consumer.
- **Trade-off:** resolve a dor real (P1, duplicação) com risco ~zero, sem infra, sem novo runtime. Não muda nada de P2 (não precisa). Latência segue ~poll (centenas de ms) — aceito hoje.
- **Aplicação:** o worker de projeção da 014 nasce sobre o genérico. ROI imediato.

### H2 — Outbox + **Valkey Streams** como bus (quando multi-instância)
Manter o outbox (atomicidade) e usar Valkey Streams como transporte/fan-out entre instâncias.
- **Trade-off:** baixa latência + fan-out + competing consumers nativo; **alinha ADR-0030** (Valkey já escolhido p/ rate-limit/cache — amortiza infra). Custo: operar Valkey; idempotência ainda no consumer.
- **Aplicação:** acionar junto da promoção do ADR-0030 (2ª instância). Não agora.

### H3 — Outbox (eventos) + **BullMQ** (jobs)
Separar responsabilidades: outbox p/ eventos de domínio; BullMQ (sobre Valkey) p/ jobs agendados/retry sofisticado/prioridade.
- **Trade-off:** ótimo DX p/ jobs; mas hoje só há 1 job (sweeper) bem servido por cron+one-shot (ADR-0041). Introduz Valkey cedo. **YAGNI agora.**

### H4 — Outbox → **CDC/Debezium** → broker (upgrade do próprio outbox)
Se o gatilho for **latência/carga de polling**, troca-se o relay de polling por log-tailing do binlog — sem tocar o domínio.
- **Trade-off:** latência ~ms, baixa carga OLTP, ordem por commit. Custo: operar Debezium + Kafka Connect (pesado). Só quando latência for requisito medido.

### H5 — **Broker dedicado self-hosted** (NATS JetStream / RabbitMQ)
Para fan-out a muitos consumers, replay, ou módulos extraídos como serviços.
- **Trade-off:** NATS é leve (Apache 2.0) e portável (AWS+Magalu via K8s). Custo: novo sistema p/ operar; reintroduz dual-write (precisa **continuar** com outbox→broker). Só quando deployables independentes ou fan-out real surgirem.

### H6 — **Managed AWS** (SQS/SNS/EventBridge)
Zero infra, mas **amarra à AWS**. Magalu não tem equivalente → quebra a estratégia multicloud (ADR-0021). **Descartada** enquanto multicloud for requisito.

### H7 — **Kafka/MSK/Redpanda**
Streaming de alto volume / replay longo. **Overkill** p/ volume de ERP; complexidade operacional alta. Reavaliar só em > ~140 ev/s sustentados.

### H8 — **Workers em Go**
**Descartada** p/ workers com domínio (duplicação de regra, ADR-0002, IPC). Go permanece só para ferramentas externas (dead-man).

---

## 8. Recomendação (faseada)

1. **Agora:** **H1** — extrair o worker genérico + hardening do outbox. Resolve a duplicação que motivou a dúvida, sem broker, sem Go, sem novo runtime. (Newman: smart endpoints/dumb pipes; Richardson/Grzybek: in-process+outbox é o default num único deployable.)
2. **Não adotar** broker/CDC/Go agora (YAGNI; ADR-0030/0002; Magalu sem managed; outbox-MySQL folgado p/ ERP).
3. **Fixar gatilhos objetivos** (seção 9) e instrumentar métricas de lag/contention para que a decisão futura seja **medida, não suposta** (ADR-0015 já pede isso).
4. **Quando o gatilho disparar:** preferir **H2 (Valkey Streams)** se for multi-instância/fan-out (alinha ADR-0030), ou **H4 (CDC)** se for latência/carga — ambos **mantêm o outbox**. Broker dedicado (H5/NATS) só com módulos extraídos como serviços.

---

## 9. Gatilhos objetivos para evoluir (outbox → Valkey/CDC/broker)

Migrar quando **um ou mais** forem **medidos** (não antes):
1. **2ª instância** do core-api (coordenação de jobs one-shot; competing consumers em escala) — gatilho já do ADR-0030.
2. **Throughput** sustentado aproximando-se de centenas de ev/s com lag crescente apesar de N workers + tuning.
3. **Latência near-real-time** (< 1 s) exigida por algum fluxo → CDC.
4. **Fan-out**: > 3 consumers distintos do mesmo evento, ou necessidade de replay histórico → broker.
5. **Módulo extraído como serviço** (deployable independente) → o in-process/composition-root deixa de cruzar o limite de processo → broker.
6. **Contenção mensurável** do polling no buffer pool/locks afetando transações de domínio.

---

## 10. Perguntas em aberto (precisam de você para calibrar o QUANDO)

1. **Multi-instância** entra no roadmap em quanto tempo? (meses → H2/Valkey vira prioridade; distante → só H1).
2. **Volume** esperado de eventos por hora/dia, ordem de grandeza? (confirma a folga do outbox).
3. **Portabilidade multicloud** (AWS+Magalu) é requisito firme? (se sim, managed AWS sai; broker self-hosted portável).
4. Há **fan-out** previsto (1 evento → muitos consumers) ou só ponto-a-ponto como hoje?
5. Algum fluxo precisa de **latência < 1 s** (near-real-time)? (hoje polling ~500 ms é aceito).
6. **Apetite operacional**: haverá SRE/capacidade para operar um broker, ou a prioridade é minimizar peças móveis?

---

## 11. Impacto na feature 014 (decisão imediata)

O ticket `WORKER-SUPPLIER-PROJECTION` (014) ia criar o 3º worker copiado. Sob H1:
- **Opção recomendada:** inserir um ticket `CORE-OUTBOX-WORKER-GENERIC` (extrair `src/shared/outbox/` + migrar contracts/partners, testes verdes) **antes** do worker da 014; o consumer de fornecedor nasce sobre o genérico. Custo: +1 ticket; benefício: a 014 não propaga a dívida e já a paga.
- **Alternativa:** entregar a 014 como está e extrair o genérico logo depois (migrando os 3 de uma vez). Entrega o valor da #47 antes; dívida registrada.

---

## 12. Fontes

- **Cânone (ACDG local):** Newman _Building Microservices_; Vernon _Implementing DDD_ (cap. 8 Domain Events, cap. 13 Integrating Bounded Contexts, "Use Eventual Consistency Outside the Boundary").
- **Web:** microservices.io (Richardson — transactional-outbox / polling-publisher / transaction-log-tailing); kamilgrzybek.com (Modular Monolith: Integration Styles); Fowler (event-driven / ECST); docs MySQL 8 (SKIP LOCKED); BullMQ / Valkey / NATS / RabbitMQ / Kafka / Redpanda / AWS docs; Magalu Cloud docs.
- **ADRs:** 0002 (runtime único), 0006 (modular monolith), 0014 (isolamento), 0015 (outbox — gatilhos), 0021 (AWS+Magalu), 0022 (read-model por projeção), 0030 (Valkey deferido), 0041 (workers/jobs), 0043 (evento partners→financial).
