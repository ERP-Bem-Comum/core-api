# Pesquisa — Store compartilhado & coordenação de jobs (multi-instância)

> **Status:** Pesquisa (não-normativo). Insumo do ADR de promoção do ADR-0030 quando a 2ª instância chegar.
> **Data:** 2026-06-17 · **Gatilho:** Gabriel — "liste todas as tecnologias possíveis para o papel do Valkey/ioredis (ADR-0030)".
> **Método:** 2 agentes web research (engines/clientes de cache; coordenação/locks) + cânone (Newman; Kleppmann). Complementa [[ASYNC-MESSAGING-STRATEGY]].

O "papel do Valkey" no ADR-0030 são **duas funções distintas** — tratadas separadamente.

---

## Eixo A — Store/cache compartilhado (rate-limit distribuído · cache · sessão)

| Tecnologia | Licença (2026) | Managed AWS | Cliente Node | Trade-off central |
|---|---|---|---|---|
| **Valkey** (engine) | **BSD-3** (Linux Foundation) | ✅ ElastiCache/MemoryDB for Valkey | ioredis · node-redis · `@valkey/valkey-glide` | Fork do Redis 7.2.4 (AWS/Google/Oracle). Licença limpa, melhor managed AWS, ~20–33% mais barato que Redis. **Escolha do ADR-0030.** |
| **Redis** (upstream) | **AGPLv3 + SSPLv1 + RSALv2** | ✅ ElastiCache/MemoryDB | idem | OSS via AGPLv3 desde Redis 8 (2025) — copyleft de rede = fricção jurídica. |
| **KeyDB** (Snap) | BSD | ❌ self-host | clients Redis | Multithread/multi-master; **cadência parada** (v6.3.4 out/2024, base Redis 6). |
| **Dragonfly** | **BSL 1.1** (não-OSI) | ❌ self-host | clients Redis | Escala vertical (1 nó = cluster). Licença restritiva é o decisor. |
| **Garnet** (Microsoft) | MIT | ❌ self-host | clients Redis (RESP) | Ótima licença, mas runtime **.NET** destoa de stack Node. |
| **Memcached** | BSD | ✅ ElastiCache | `memjs` | Cache + `incr`; **sem persistência/replicação** → frágil p/ sessão. |
| **Hazelcast / Ignite** (data grid JVM) | Hazelcast cluster = Enterprise pago · Ignite Apache-2.0 | ❌ | Hazelcast ok · **Ignite client parado (2018)** | Operação JVM pesada; mau fit Node. |
| **NATS JetStream KV** | Apache-2.0 (CNCF) | ❌ | `@nats-io/kv` (TS-native) | KV durável; forte se já adotar NATS p/ mensageria; TTL por bucket. |
| **MySQL (tabela+TTL)** | já temos | n/a | mysql2/Drizzle | Zero infra; mas carga vai p/ o DB de negócio. Só volume baixo. |
| **Managed serverless** | — | DynamoDB (TTL best-effort ≤48h) · Momento (3rd-party) | SDK v3 · `@gomomento/sdk` | DynamoDB AWS-nativo p/ lock/rate-limit; Momento pay-per-op, API própria. |

**Clientes Node:** `ioredis` em manutenção (não arquivado; BullMQ usa); **`node-redis` v6 (RESP3) recomendado p/ novos**; **`@valkey/valkey-glide`** (oficial Valkey, core Rust, AWS+Google) num cenário Valkey-first.

**Licença (linha do tempo):** BSD → SSPL/RSALv2 (mar/2024, gatilho do fork Valkey) → AGPLv3 adicionado (Redis 8, 2025). Valkey/KeyDB BSD, Garnet MIT (OSI); Dragonfly BSL (não-OSI).

**Magalu Cloud:** **não tem cache gerenciado** (só DBaaS MySQL/PostgreSQL) — qualquer Redis-like seria self-hosted lá. Pesa contra depender de managed se multicloud for firme.

---

## Eixo B — Coordenação de jobs one-shot (o gatilho concreto da 2ª instância)

| Mecanismo | Garantia | Custo | Quando |
|---|---|---|---|
| **MySQL `GET_LOCK()`** | exclusão mútua server-wide; libera em crash; sem fencing | zero infra | "Só 1 instância roda o cron". Lock por **sessão** → segurar a mesma conexão do pool. |
| **MySQL tabela `UNIQUE(job,date)` + `INSERT IGNORE`** | dedup atômico por execução; **auditável** (a linha é o registro) | zero infra | One-shot por data (sweeper diário, backfill). |
| **`SELECT … FOR UPDATE SKIP LOCKED`** | particiona trabalho (não singleton) | zero infra | Paralelizar N instâncias numa fila. |
| **Cron singleton por topologia** (systemd 1 host / K8s CronJob `Forbid`) | 1 execução pelo **deploy** | baixíssimo | Aponta o cron externo p/ 1 alvo. Caveats: SPOF do host; janela do controller K8s. |
| **Redis/Valkey `SET NX PX`** | best-effort (falha em failover async); sem fencing | novo serviço | Lock de eficiência se Redis já existir. |
| **Redlock / node-redlock** | maioria de N nós; **contestado p/ correção** | alto (5 nós) | Quase nunca; caro e nem é o instrumento certo. |
| **etcd / Consul / ZooKeeper** | consenso + fencing | muito alto | Só se já roda K8s (reusa etcd) ou já opera ZK/Consul. |

**Princípio (Kleppmann, _How to do distributed locking_):** distinguir **lock de eficiência** (rodar 2× = só desperdício → best-effort) de **lock de correção** (2× corrompe → exige fencing). Jobs **idempotentes** (sweeper, backfill) são caso de eficiência → não justificam Redis/etcd. Idempotência primeiro, lock barato depois.

---

## Recomendação (faseada)

- **Coordenação de jobs (implementável já, alinha ADR-0041):** job idempotente (já são) + **cron singleton por topologia** (systemd hoje; K8s CronJob `Forbid` ao containerizar) + **backstop barato no MySQL** (`GET_LOCK`/`INSERT IGNORE`) — defense-in-depth, **zero serviço novo**. NÃO etcd/Redlock.
- **Store compartilhado (quando a 2ª instância entrar — ADR-0030):** **Valkey** (BSD, ElastiCache na AWS) via `node-redis`/`valkey-glide`; OU MySQL p/ volume baixo. Evitar managed-only se multicloud (Magalu sem cache) for firme → Valkey self-hosted em K8s é a opção portável.

## Gatilhos para promover o ADR-0030 (Valkey)

2ª instância do core-api (rate-limit in-memory deixa de escalar — gatilho original do ADR-0030); ou necessidade de cache/sessão distribuída. A coordenação de jobs **não** depende de Valkey (resolve no MySQL).

## Fontes

Newman _Building Microservices_ (managed/boring tech); Kleppmann _How to do distributed locking_ + rebuttal antirez; microservices.io; docs MySQL 8.4 (`GET_LOCK`/`SKIP LOCKED`); linuxfoundation.org/valkey.io; redis.io/blog/agplv3; AWS ElastiCache/MemoryDB/DynamoDB docs; docs.magalu.cloud; K8s CronJob `concurrencyPolicy`.
