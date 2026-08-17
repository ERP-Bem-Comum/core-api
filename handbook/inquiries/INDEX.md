[← Voltar ao README de Inquiries](./README.md)

# 📑 Índice de Inquiries

> **Gerado por `pnpm run docs:index`.** Não editar à mão — o estado de cada inquiry vive no
> frontmatter do próprio arquivo, e `tests/cleanup/inquiry-hygiene.test.ts` trava qualquer divergência.

## Panorama

| Estado | Quantas | Quem destrava |
| :--- | ---: | :--- |
| `open` | 4 | quem trabalha nela |
| `blocked` | 5 | terceiro (banca, upstream, P.O.) |
| `decided` | 17 | ninguém — fechada |
| `deferred` | 3 | o gatilho declarado |
| `superseded` | 1 | — |

Total: **30**.

---

## 🟢 Em investigação

| # | Título | Aberta | Decidida |
| :--- | :--- | :--- | :--- |
| [0026](./0026-async-human-in-the-loop-and-drizzle-1-0.md) | Três trocas estruturais em aberto — assíncrono human-in-the-loop, Drizzle 1.0 e Bruno × TS | 2026-08-05 |  |
| [0027](./0027-teses-orfas-de-branches-contaminadas.md) | Teses órfãs — o que 7 branches contaminadas tentavam provar | 2026-08-06 |  |
| [0028](./0028-edd-da-po-melhorias-m1-m4-e-relatorios-nibo.md) | O EDD da P.O. (M1–M4 + relatórios Nibo) — o que sobrevive à verificação | 2026-08-06 |  |
| [0030](./0030-deadman-switch-nunca-vigiou.md) | O dead-man's switch que nunca vigiou — o ADR-0042 sai do código sem ser superado | 2026-08-17 |  |

---

## ⛔ Bloqueadas — esperam terceiro

| # | Título | Aberta | Decidida |
| :--- | :--- | :--- | :--- |
| [0011](./0011-auditoria-fiscal-cross-periodo.md) | Auditoria fiscal cross-período em sistema sob Strangler Fig | 2026-05-07 |  |
| [0012](./0012-bff-managed-api-gateway-vs-fastify.md) | Inquiry-0012 — BFF: AWS API Gateway managed vs. Fastify burro próprio |  |  |
| [0014](./0014-schema-legado-vs-modelo-alvo.md) | Schema legado real vs. modelo alvo do handbook | 2026-05-14 |  |
| [0015](./0015-charset-drizzle-roadmap.md) | Charset/collate por tabela via API drizzle-orm — roadmap | 2026-05-18 |  |
| [0019](./0019-hard-delete-tripwire-sem-superficie.md) | `TentativaDeExclusaoDetectada` — tripwire sem superfície de ataque | 2026-05-25 |  |

---

## ✅ Decididas

| # | Título | Aberta | Decidida |
| :--- | :--- | :--- | :--- |
| [0001](./0001-modular-monolith-vs-microservices.md) | Granularidade de serviço — Modular Monolith vs. Microservices | 2026-04-27 | 2026-04-27 |
| [0002](./0002-bradesco-van-architecture.md) | Arquitetura real da integração Bradesco (VAN + REST) | 2026-04-22 | 2026-04-27 |
| [0003](./0003-multi-cloud-strategy.md) | Estratégia multi-cloud (AWS legado + GCP novo) | 2026-04-27 | 2026-05-22 |
| [0004](./0004-node-version-and-typescript-future.md) | Versão Node.js e estratégia TypeScript 7.0 | 2026-04-28 | 2026-04-28 |
| [0005](./0005-supply-chain-axios-and-dependency-hardening.md) | Supply chain — incidente Axios e hardening de dependências | 2026-04-28 | 2026-04-28 |
| [0006](./0006-package-manager-pnpm-vs-bun.md) | Package manager — pnpm vs Bun (e a migração yarn → pnpm no legado) | 2026-04-28 | 2026-04-28 |
| [0007](./0007-http-framework-fastify-vs-express.md) | Framework HTTP — Fastify vs Express | 2026-04-28 | 2026-04-28 |
| [0009](./0009-email-strategy-nodemailer-with-adapter.md) | Estratégia de envio de email — Nodemailer com Service Adapter | 2026-04-28 | 2026-04-28 |
| [0010](./0010-mysql-engine-correction.md) | Correção de assunção — engine real é MySQL 8, não PostgreSQL | 2026-04-28 | 2026-04-28 |
| [0013](./0013-local-dev-simulator-and-ci.md) | Simulador local da cloud (offline) + integração CI/CD | 2026-05-13 | 2026-05-13 |
| [0017](./0017-timeline-read-model-vs-adr-0020.md) | Timeline (Memória Operacional) — read-model vs. ADR-0020 (sem JSON) | 2026-05-25 | 2026-05-26 |
| [0020](./0020-temporal-api-adoption.md) | Adoção do Temporal API (ES2026) no core-api | 2026-05-26 | 2026-05-26 |
| [0021](./0021-contract-status-lifecycle-http.md) | Ciclo de vida (status) do Contrato — 3 estados do domínio vs. 5 do legado | 2026-05-27 |  |
| [0022](./0022-jobs-anti-pattern-essential-vs-accidental.md) | Inquiry 0022 — `src/jobs/`/auto-expire: anti-pattern ou complexidade essencial? |  |  |
| [0023](./0023-typescript-7-native-spike.md) | TypeScript 7 nativo — spike medido e diagnóstico de lentidão do `core-api` | 2026-07-31 | 2026-07-31 |
| [0024](./0024-adr-format-for-llm-agents.md) | Inquiry 0024 — ADR como contexto de agente: o que o campo convergiu, e onde estamos fora |  |  |
| [0029](./0029-linter-type-aware-sob-typescript-7.md) | Linter type-aware sob TypeScript 7 — oxlint/tsgolint · Biome · ESLint pinado | 2026-08-06 | 2026-08-06 |

---

## 🔵 Adiadas (com gatilho)

| # | Título | Aberta | Decidida |
| :--- | :--- | :--- | :--- |
| [0016](./0016-nodejs-native-eventbus-pubsub-observer.md) | Soluções nativas do Node.js para EventBus / Pub-Sub / Observer | 2026-05-22 |  |
| [0018](./0018-auditlog-transversal-todos-bcs.md) | `AuditLogGenerated` — trilha de auditoria transversal a todos os BCs | 2026-05-25 | 2026-05-26 |
| [0025](./0025-typedarrays-immutability-tc39-watchlist.md) | Imutabilidade real de `Uint8Array` em TS 6 — TC39 watchlist | 2026-05-22 |  |

---

## ♻️ Revisadas

| # | Título | Aberta | Decidida |
| :--- | :--- | :--- | :--- |
| [0008](./0008-postgres-driver-pg-vs-postgres.md) | Driver Postgres — `pg` vs `postgres` (porsager) | 2026-04-28 | 2026-04-28 |

---

> 🔍 **Filosofia:** decisão sem trilha de raciocínio é decisão frágil. Esta pasta existe para que
> toda decisão arquitetural relevante tenha um "show your work" quando alguém perguntar "por que
> escolheram assim?". Consulta pelo agente: skill [`inquiry`](../../.claude/skills/inquiry/SKILL.md).
