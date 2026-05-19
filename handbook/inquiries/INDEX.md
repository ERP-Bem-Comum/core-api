[← Voltar ao README de Inquiries](./README.md)

# 📑 Índice de Inquiries

> Status atual de todas as chamadas, dúvidas e decisões registradas.

---

## Visão geral

| # | Status | Última atualização |
| :--- | :--- | :--- |
| Total | 15 | 2026-05-18 |
| `Decided` | 9 | — |
| `Pending Response` | 1 | — |
| `Obsoleta (revisada)` | 1 | — |
| `Open` | 4 | — |
| `Deferred` | 0 | — |

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

### ⏳ Pending Response

| # | Título | Aguardando | Bloqueio |
| :--- | :--- | :--- | :--- |
| [0003](./0003-multi-cloud-strategy.md) | Estratégia multi-cloud (AWS + GCP) | Codebit (Maria Isabel) | Bloqueia provisionamento de infra e início real de implementação |

### 🟢 Open

| # | Título | Aguardando | Bloqueio |
| :--- | :--- | :--- | :--- |
| [0011](./0011-auditoria-fiscal-cross-periodo.md) | Auditoria fiscal cross-período em sistema sob Strangler Fig | Banca interna (squad) | Bloqueador suave para início do marco M3 — chave de correlação no schema de `core.fin_documentos` precisa ser decidida antes do desenho. **Apêndice D adicionado em 2026-05-14** com achado de schema (sem campos NFe) que muda a premissa empírica |
| [0012](./0012-bff-managed-api-gateway-vs-fastify.md) | BFF — AWS API Gateway managed vs. Fastify burro próprio | Banca interna + DevOps + dono do legado | Bloqueia skeleton do `bff-gateway`. Possível supersede do ADR-0005. Legado precisa de `setGlobalPrefix('api/v1')` antes de viabilizar Hipótese A |
| [0014](./0014-schema-legado-vs-modelo-alvo.md) | Schema legado real vs. modelo alvo do handbook (4 perguntas Q1–Q4) | Banca interna + P.O. | Bloqueia (Q1) revisão do ADR-0017; (Q2) abertura de BC novo de Planejamento Orçamentário; (Q3) política de migração de `contracts`; (Q4) primeiro vertical slice |
| [0015](./0015-charset-drizzle-roadmap.md) | Charset/collate por tabela via API drizzle-orm — roadmap | Upstream `drizzle-team/drizzle-orm` | Dívida tipográfica não-bloqueante: hoje SQL manual na migration `0000_*.sql` com comentário forte no schema TS. Reabrir quando drizzle-orm suportar `charset`/`collate` table-level + per-column |

### 🔵 Deferred

_Nenhuma._

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

### Segurança & Governance
- [0005 — Supply chain Axios](./0005-supply-chain-axios-and-dependency-hardening.md)

### Reporting & Auditoria
- [0011 — Auditoria fiscal cross-período (Strangler Fig)](./0011-auditoria-fiscal-cross-periodo.md)

### Descoberta de Domínio
- [0014 — Schema legado vs. modelo alvo](./0014-schema-legado-vs-modelo-alvo.md)

### Persistência & Dívida Tipográfica
- [0015 — Charset/collate por tabela via drizzle-orm](./0015-charset-drizzle-roadmap.md)

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
