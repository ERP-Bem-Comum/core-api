[← Voltar para Arquitetura](../README.md)

# 📋 Architecture Decision Records (ADRs)

> Registros das decisões arquiteturais relevantes do projeto. **Imutáveis. Auditáveis.**

---

## 1. O Que é ADR

Um **ADR (Architecture Decision Record)** é um documento curto que captura uma decisão arquitetural significativa, junto com seu contexto e consequências.

> **ADR é imutável.** Uma vez aceito, não é editado.
>
> Quando uma decisão é revisada, cria-se um **ADR novo** que `supersedes` o anterior. O ADR antigo permanece como evidência histórica.

---

## 2. Por Que ADRs

| Benefício | Detalhe |
| :--- | :--- |
| **Auditoria** | Em 2 anos, qualquer pessoa entende por que uma decisão foi tomada |
| **Onboarding** | Novos membros leem o histórico de decisões |
| **Disciplina** | Forçar a justificativa por escrito reduz decisões mal pensadas |
| **Memória organizacional** | Decisões não morrem quando alguém sai do time |

---

## 3. Como Escrever um ADR

1. Pegar o próximo número livre (`NNNN-`) e copiar o template abaixo.
2. Preencher cada seção honestamente, **incluindo alternativas rejeitadas**.
3. Submeter como PR para revisão.
4. Depois de aceito, mover de `Status: Proposed` para `Status: Accepted`.
5. Atualizar o índice nesta página.
6. Adicionar entrada no [`../../CHANGELOG.md`](../../CHANGELOG.md).

---

## 4. Template

```markdown
# ADR-NNNN: <Título curto da decisão>

- **Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
- **Date:** YYYY-MM-DD
- **Deciders:** <quem aprovou>

## Contexto

<O problema que a decisão resolve. Restrições, premissas, forças em jogo.>

## Decisão

<O que foi decidido, em frase curta e direta.>

## Consequências

### Positivas
- ...

### Negativas
- ...

### Neutras
- ...

## Alternativas Consideradas

### A. <Nome da alternativa>
<O que era, por que foi rejeitada.>

### B. <Outra alternativa>
...

## Quando Re-avaliar

<Critérios objetivos que disparam revisão da decisão.>

## Referências

- Links para documentação, ADRs relacionados, etc.
```

---

## 5. Índice de ADRs

| # | Título | Status | Data |
| :--- | :--- | :--- | :--- |
| [0001](./0001-strangler-fig-over-rewrite.md) | Estratégia Strangler Fig sobre Big Bang ou Refactor | Accepted | 2026-04-27 |
| [0002](./0002-keep-nodejs-runtime.md) | Manter Node.js como runtime nesta fase | Accepted | 2026-04-27 |
| [0003](./0003-shared-db-isolated-schemas.md) | Banco compartilhado com schemas isolados | **Superseded by 0014** | 2026-04-27 |
| [0004](./0004-postgres-outbox-pattern.md) | Postgres Outbox como bus de eventos inicial | **Superseded by 0015** | 2026-04-27 |
| [0005](./0005-thin-bff-gateway.md) | BFF Gateway burro (apenas roteamento) | Accepted | 2026-04-27 |
| [0006](./0006-modular-monolith-core-api.md) | Modular Monolith para o `core-api` (granularidade de serviço) | Accepted | 2026-04-27 |
| [0007](./0007-multi-cloud-aws-gcp.md) | Topologia Multi-Cloud (AWS legado + GCP novo) | **Superseded by 0021** | 2026-04-28 |
| [0008](./0008-bradesco-integration-architecture.md) | Arquitetura da Integração Bradesco (REST API + VAN via Windows VM) | Accepted | 2026-04-28 |
| [0009](./0009-node-24-typescript-6-with-7-roadmap.md) | Node.js 24 LTS + TypeScript 6 com plano de migração para TS 7.0 | Accepted (supersedes parcial de 0002) | 2026-04-28 |
| [0010](./0010-email-port-adapter-pattern.md) | Email — Port & Adapter Pattern com Nodemailer inicial | Accepted | 2026-04-28 |
| [0011](./0011-supply-chain-hardening.md) | Supply Chain Hardening — Política de Dependências | Accepted | 2026-04-28 |
| [0012](./0012-pnpm-package-manager.md) | pnpm como Package Manager (legado e novo) | Accepted | 2026-04-28 |
| [0013](./0013-mysql-database-engine.md) | Engine de Banco de Dados — MySQL 8 (correção de assunção) | Accepted | 2026-04-28 |
| [0014](./0014-mysql-database-isolation.md) | Isolamento por Database em MySQL (supersedes 0003) | Accepted | 2026-04-28 |
| [0015](./0015-mysql-outbox-pattern.md) | MySQL Outbox Pattern (supersedes 0004) | Accepted | 2026-04-28 |
| [0017](./0017-correlation-keys-cross-period-audit.md) | Chaves de correlação cross-período entre `legacy` e `core` (auditoria fiscal sob Strangler Fig) | **Proposed** | 2026-05-07 |
| [0018](./0018-persistence-dual-dialect-drizzle.md) | Persistência Dual-Dialect — Drizzle com MySQL (produção) e SQLite (dev/CI) | **Superseded by 0020** | 2026-05-14 |
| [0019](./0019-document-storage-s3-with-minio-dev.md) | Document Storage — AWS S3 (produção) com MinIO via Docker (dev/homologação) | Accepted | 2026-05-15 |
| [0020](./0020-mysql-only-supersedes-dual-dialect.md) | MySQL como Único Dialeto de Persistência (supersedes 0018) | Accepted | 2026-05-15 |
| [0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md) | Topologia Cloud — AWS (Codebit) Primária + MagaluCloud PBE Interno (supersedes 0007) | Accepted | 2026-05-22 |
| [0022](./0022-read-models-via-projection-over-event-stream.md) | Read-Models via Projeção sobre o Event Stream (Timeline agora, AuditLog diferido) | Accepted | 2026-05-26 |
| [0023](./0023-contract-lifecycle-pending-state.md) | Ciclo de vida do Contrato — estado `Pendente` (4 estados) | Accepted | 2026-05-27 |
| [0024](./0024-identity-and-rbac-auth-module.md) | Identidade & RBAC — Módulo `auth` (identidade própria OIDC-ready, sessão híbrida, permissions granulares) | Accepted | 2026-05-27 |
| [0025](./0025-http-server-fastify-core-api.md) | Servidor HTTP no `core-api` com Fastify (adapter de borda, BFF continua burro) | Accepted | 2026-05-27 |
| [0026](./0026-mysql-read-write-split-connection.md) | Read/Write Split de Conexão MySQL (writer/reader pools — Master-Slave ready) | Accepted | 2026-05-27 |
| [0027](./0027-zod-openapi-contract-first-http-edge.md) | Zod + zod-openapi como contract-first da borda HTTP (validação de I/O + OpenAPI 3.1.1) | Accepted | 2026-05-27 |
| [0028](./0028-http-edge-shell-location.md) | Localização do shell HTTP de borda (`src/shared/http/`) e do composition root (`src/server.ts`) — verticalidade por feature | Accepted | 2026-05-28 |
| [0029](./0029-pnpm-11-supply-chain-defaults.md) | pnpm 11.x com defaults de supply-chain (supersedes 0012) | Accepted | 2026-05-30 |
| [0030](./0030-valkey-shared-store-deferred.md) | Store compartilhado (Valkey via ioredis) — adiado até multi-instância | **Proposed** | 2026-05-30 |
| [0031](./0031-partners-registry-module.md) | Módulo `partners` — fronteira de Cadastros/Counterparties (supplier, financier, collaborator) migrada do legado | Accepted | 2026-06-01 |

---

## 6. Status Possíveis

| Status | Significado |
| :--- | :--- |
| `Proposed` | Em discussão, ainda não aprovado |
| `Accepted` | Decisão vigente |
| `Deprecated` | Não vale mais, mas não foi substituído por novo ADR (raro) |
| `Superseded by ADR-XXXX` | Substituído por outro ADR |

---

> 📚 Inspirado no formato de Michael Nygard ([Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)).
