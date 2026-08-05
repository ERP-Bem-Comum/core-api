[← Voltar ao README de Inquiries](./README.md)

# 📑 Índice de Inquiries

> Status atual de todas as chamadas, dúvidas e decisões registradas.

---

## Visão geral

| # | Status | Última atualização |
| :--- | :--- | :--- |
| Total | 21 | 2026-05-27 |
| `Decided` | 14 | — |
| `Pending Response` | 0 | — |
| `Obsoleta (revisada)` | 1 | — |
| `Open` | 5 | — |
| `Deferred` | 1 | — |

---

## Inquiries por status

### ✅ Decided

| # | Título | Decisão / ADR | Data |
| :--- | :--- | :--- | :--- |
| [0001](./0001-modular-monolith-vs-microservices.md) | Granularidade de serviço — Modular Monolith vs. Microservices | [ADR-0006](../architecture/adr/0006-modular-monolith-core-api.md) | 2026-04-27 |
| [0002](./0002-bradesco-van-architecture.md) | Arquitetura real da integração Bradesco (VAN + REST) | [ADR-0008](../architecture/adr/0008-bradesco-integration-architecture.md) | 2026-04-27 |
| [0004](./0004-node-version-and-typescript-future.md) | Versão Node.js e estratégia TypeScript 7.0 | [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) | 2026-04-28 |
| [0005](./0005-supply-chain-axios-and-dependency-hardening.md) | Supply chain — incidente Axios e hardening | [ADR-0011](../architecture/adr/0011-supply-chain-hardening.md) | 2026-04-28 |
| [0006](./0006-package-manager-pnpm-vs-bun.md) | Package manager — pnpm vs Bun + migração yarn→pnpm | [ADR-0012](../architecture/adr/0012-pnpm-package-manager.md) | 2026-04-28 |
| [0007](./0007-http-framework-fastify-vs-express.md) | Framework HTTP — Fastify vs Express | (sem ADR — decisão tática) | 2026-04-28 |
| [0008](./0008-postgres-driver-pg-vs-postgres.md) | ⚠️ **OBSOLETA** — Driver Postgres `pg` vs `postgres` (engine real é MySQL) | Revisada por [Inquiry-0010](./0010-mysql-engine-correction.md) | 2026-04-28 |
| [0009](./0009-email-strategy-nodemailer-with-adapter.md) | Email — Nodemailer com Service Adapter | [ADR-0010](../architecture/adr/0010-email-port-adapter-pattern.md) | 2026-04-28 |
| [0010](./0010-mysql-engine-correction.md) | Correção de assunção — engine real é MySQL 8 | [ADR-0013](../architecture/adr/0013-mysql-database-engine.md), [ADR-0014](../architecture/adr/0014-mysql-database-isolation.md), [ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md) | 2026-04-28 |
| [0013](./0013-local-dev-simulator-and-ci.md) | Simulador local da cloud (Devbox + Tilt + docker-compose) + CI GitHub Actions | (sem ADR ainda — implementação pendente) | 2026-05-13 |
| [0003](./0003-multi-cloud-strategy.md) | Estratégia multi-cloud (originalmente AWS+GCP) | [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) (supersedes [ADR-0007](../architecture/adr/0007-multi-cloud-aws-gcp.md)) | 2026-05-22 |
| [0017](./0017-timeline-read-model-vs-adr-0020.md) | Timeline read-model vs. ADR-0020 (sem JSON) | [ADR-0022](../architecture/adr/0022-read-models-via-projection-over-event-stream.md) (projeção; outbox é o log append-only) | 2026-05-26 |
| [0018](./0018-auditlog-transversal-todos-bcs.md) | `AuditLogGenerated` transversal | [ADR-0022](../architecture/adr/0022-read-models-via-projection-over-event-stream.md) — **decided-deferred** (padrão de projeção; materialização espera RBAC) | 2026-05-26 |
| [0020](./0020-temporal-api-adoption.md) | Adoção do Temporal API (ES2026) | Opção C — VO `PlainDate` agora, `Temporal.PlainDate` nativo no Node 26 LTS; ADR futuro (gatilho 2026-10-28) | 2026-05-26 |
| [0021](./0021-contract-status-lifecycle-http.md) | Ciclo de vida (status) do Contrato — 3 vs. 5 estados | P.O.: **4 estados** (`Pendente → Em Andamento → Finalizado/Distrato`). **Aciona revisão do agregado `Contract`** (novo estado `Pendente`) + atualização do handbook antes do HTTP | 2026-05-27 |
| [0023](./0023-typescript-7-native-spike.md) | TypeScript 7 nativo — spike **medido** e diagnóstico de lentidão | **Gatilho do [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) disparou** (TS 7.0.2 estável). Pede ADR novo de supersessão parcial (linguagem). Maior ganho medido não é o compilador (~10×) e sim parar de recriar o container de teste (**~108s/bateria**). Reabre [Inquiry-0004](./0004-node-version-and-typescript-future.md) | 2026-07-31 |
| [0024](./0024-adr-format-for-llm-agents.md) | ADR como contexto de agente — formato e filosofia nos últimos meses | **Reformula a pergunta do hardening**: o campo convergiu numa separação de ARTEFATOS (ADR imutável = memória do porquê; spec/rules vivos = instrução), não numa hierarquia de autoridade. Nosso `AGENTS.md:19/23` faz do ADR a fonte de instrução — raiz das 11 rules FALSAS da auditoria. Nosso `SCHEMA.md` já atende 4 das 5 recomendações do formato emergente (gap: ≤200 linhas). Falta a camada de governança (hook `PostToolUse` + fitness function em CI) | 2026-07-31 |

### ⏳ Pending Response

_Nenhuma._

### 🟢 Open

| # | Título | Aguardando | Bloqueio |
| :--- | :--- | :--- | :--- |
| [0011](./0011-auditoria-fiscal-cross-periodo.md) | Auditoria fiscal cross-período em sistema sob Strangler Fig | Banca interna (squad) | Bloqueador suave para início do marco M3 — chave de correlação no schema de `core.fin_documentos` precisa ser decidida antes do desenho. **Apêndice D adicionado em 2026-05-14** com achado de schema (sem campos NFe) que muda a premissa empírica |
| [0012](./0012-bff-managed-api-gateway-vs-fastify.md) | BFF — AWS API Gateway managed vs. Fastify burro próprio | Banca interna + DevOps + dono do legado | Bloqueia skeleton do `bff-gateway`. Possível supersede do ADR-0005. Legado precisa de `setGlobalPrefix('api/v1')` antes de viabilizar Hipótese A |
| [0014](./0014-schema-legado-vs-modelo-alvo.md) | Schema legado real vs. modelo alvo do handbook (4 perguntas Q1–Q4) | Banca interna + P.O. | Bloqueia (Q1) revisão do ADR-0017; (Q2) abertura de BC novo de Planejamento Orçamentário; (Q3) política de migração de `contracts`; (Q4) primeiro vertical slice |
| [0015](./0015-charset-drizzle-roadmap.md) | Charset/collate por tabela via API drizzle-orm — roadmap | Upstream `drizzle-team/drizzle-orm` | **ESCOPO REDUZIDO À METADE em 2026-08-05**: o `collate` PER-COLUMN já é possível via `customType` — medido e idempotente, ver §3. Resta só o **table-level**, que segue exigindo SQL manual na migration. Reabrir quando drizzle-orm expuser table options |
| [0019](./0019-hard-delete-tripwire-sem-superficie.md) | `TentativaDeExclusaoDetectada` — tripwire sem superfície | P.O. + decisão de infra/segurança | Não há comando de deleção física no sistema; melhor prevenir por privilégio MySQL que detectar por evento. Acopla a 0018 + RBAC |

### 🔵 Deferred

| # | Título | Quando reabrir | Bloqueio |
| :--- | :--- | :--- | :--- |
| [0016](./0016-nodejs-native-eventbus-pubsub-observer.md) | Soluções nativas Node.js para EventBus / Pub-Sub / Observer | Quando surgir o primeiro caso real de evento intra-módulo (provavelmente `ContractCreated` → adapter outbox) | Nenhum — estudo arquivado como watchlist; regra provisória definida na seção 5 |
| [0025](./0025-typedarrays-immutability-tc39-watchlist.md) | Imutabilidade real de `Uint8Array` em TS 6 — TC39 watchlist | Quando `Immutable ArrayBuffer` chegar a Stage 3 **e** a V8 embarcar | Nenhum — decisão provisória é `eslint-disable` + defensive copy nos adapters. **Criada como `0011` e renumerada em 2026-08-03** (ver Notas de numeração) |
| [0026](./0026-async-human-in-the-loop-and-drizzle-1-0.md) | TRÊS trocas estruturais: assíncrono human-in-the-loop, Drizzle 1.0 e Bruno CLI × testes TS | **Três gatilhos independentes:** (a) o épico de aprovação entrar no roadmap; (b) o `drizzle-orm@1.0.0` sair com dist-tag `latest` **e** passar a quarentena; (c) NENHUM — o de Bruno pode ser medido hoje | Nenhum — instrumento exigido pelo [ADR-0058](../architecture/adr/0058-runtime-tracks-recommended-lts.md) §3 (troca estrutural se justifica por inquiry que MEDE). Já registra 3 medições feitas, entre elas que **não existe `0.98`** (a linha é `1.0.0-rc.4`) e que collation por coluna **já é possível** no `0.45.2` via `customType` |

### Notas de numeração

- **`0011` esteve duplicado** entre 2026-05-22 e 2026-08-03: a auditoria fiscal cross-período
  (2026-05-19, no índice) e a watchlist de imutabilidade de `Uint8Array` (2026-05-25, fora dele)
  reivindicavam o mesmo número. Resolvido renumerando a watchlist para `0025`, pelo mesmo critério
  do `ADR-0034`: quem está no índice mantém o número. O `0011` agora significa, sem ambiguidade, a
  auditoria fiscal.
- Colisão de prefixo e divergência entre disco e índice passaram a ser barradas por
  `tests/cleanup/handbook-numbering.test.ts`.

---

## Inquiries por tema

### Estratégia & Arquitetura
- [0001 — Granularidade de serviço](./0001-modular-monolith-vs-microservices.md)
- [0007 — Framework HTTP](./0007-http-framework-fastify-vs-express.md)
- [0008 — Driver Postgres](./0008-postgres-driver-pg-vs-postgres.md)
- [0012 — BFF managed vs Fastify](./0012-bff-managed-api-gateway-vs-fastify.md)

### Infraestrutura & Cloud
- [0003 — Multi-cloud AWS + GCP](./0003-multi-cloud-strategy.md)
- [0013 — Simulador local da cloud + CI GitHub Actions](./0013-local-dev-simulator-and-ci.md)

### DevEx & CI/CD
- [0013 — Devbox + Tilt + docker-compose + GitHub Actions](./0013-local-dev-simulator-and-ci.md)

### Integrações Externas
- [0002 — Bradesco VAN + REST](./0002-bradesco-van-architecture.md)
- [0009 — Email / SMTP](./0009-email-strategy-nodemailer-with-adapter.md)

### Stack & Versões
- [0004 — Node 24 + TypeScript 7](./0004-node-version-and-typescript-future.md)
- [0006 — pnpm vs Bun](./0006-package-manager-pnpm-vs-bun.md)
- [0020 — Adoção do Temporal API (ES2026)](./0020-temporal-api-adoption.md)

### Segurança & Governance
- [0005 — Supply chain Axios](./0005-supply-chain-axios-and-dependency-hardening.md)

### Reporting & Auditoria
- [0011 — Auditoria fiscal cross-período (Strangler Fig)](./0011-auditoria-fiscal-cross-periodo.md)
- [0018 — AuditLogGenerated transversal a todos os BCs](./0018-auditlog-transversal-todos-bcs.md)

### Segurança & Imutabilidade
- [0019 — TentativaDeExclusaoDetectada (tripwire sem superfície)](./0019-hard-delete-tripwire-sem-superficie.md)

### Read-models & CQRS
- [0017 — Timeline (Memória Operacional) read-model vs. ADR-0020](./0017-timeline-read-model-vs-adr-0020.md)

### Descoberta de Domínio
- [0014 — Schema legado vs. modelo alvo](./0014-schema-legado-vs-modelo-alvo.md)
- [0021 — Ciclo de vida (status) do Contrato — 3 vs. 5 estados](./0021-contract-status-lifecycle-http.md)

### Persistência & Dívida Tipográfica
- [0015 — Charset/collate por tabela via drizzle-orm](./0015-charset-drizzle-roadmap.md)

### Eventos & Mensageria Intra-Processo
- [0016 — EventBus / Pub-Sub / Observer nativos do Node.js](./0016-nodejs-native-eventbus-pubsub-observer.md)

---

## Próximas inquiries esperadas

Listadas como heads-up, sem arquivo criado ainda:

| Tema esperado | Quando criar |
| :--- | :--- |
| Cloud Postgres — RDS AWS vs Cloud SQL GCP | Após resposta da Codebit ([Inquiry-0003](./0003-multi-cloud-strategy.md)) |
| Provedor OCR | Quando começar BC Ingestão & OCR |
| Estratégia de testes E2E | Após skeleton dos 2 repos |
| Migração TypeScript 6 → 7 | Q3/Q4 2026 quando 7.0 estabilizar |
| Modelagem dos fakes (`fake-stcpclt`, `fake-bradesco`, `fake-legacy-api`) | Antes de implementar os containers da [Inquiry-0013](./0013-local-dev-simulator-and-ci.md) |
| ADR — Pipeline CI/CD GitHub Actions + Devbox | Quando workflow `ci.yml` for ao primeiro merge ([Inquiry-0013](./0013-local-dev-simulator-and-ci.md)) |

---

> 🔄 Esta página é atualizada manualmente conforme inquiries são abertas e fechadas.
