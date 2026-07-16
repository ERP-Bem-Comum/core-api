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

| Benefício                  | Detalhe                                                           |
| :------------------------- | :---------------------------------------------------------------- |
| **Auditoria**              | Em 2 anos, qualquer pessoa entende por que uma decisão foi tomada |
| **Onboarding**             | Novos membros leem o histórico de decisões                        |
| **Disciplina**             | Forçar a justificativa por escrito reduz decisões mal pensadas    |
| **Memória organizacional** | Decisões não morrem quando alguém sai do time                     |

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

| #                                                              | Título                                                                                                                                   | Status                                | Data       |
| :------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------ | :--------- |
| [0001](./0001-strangler-fig-over-rewrite.md)                   | Estratégia Strangler Fig sobre Big Bang ou Refactor                                                                                      | Accepted                              | 2026-04-27 |
| [0002](./0002-keep-nodejs-runtime.md)                          | Manter Node.js como runtime nesta fase                                                                                                   | Accepted                              | 2026-04-27 |
| [0003](./0003-shared-db-isolated-schemas.md)                   | Banco compartilhado com schemas isolados                                                                                                 | **Superseded by 0014**                | 2026-04-27 |
| [0004](./0004-postgres-outbox-pattern.md)                      | Postgres Outbox como bus de eventos inicial                                                                                              | **Superseded by 0015**                | 2026-04-27 |
| [0005](./0005-thin-bff-gateway.md)                             | BFF Gateway burro (apenas roteamento)                                                                                                    | Accepted                              | 2026-04-27 |
| [0006](./0006-modular-monolith-core-api.md)                    | Modular Monolith para o `core-api` (granularidade de serviço)                                                                            | Accepted                              | 2026-04-27 |
| [0007](./0007-multi-cloud-aws-gcp.md)                          | Topologia Multi-Cloud (AWS legado + GCP novo)                                                                                            | **Superseded by 0021**                | 2026-04-28 |
| [0008](./0008-bradesco-integration-architecture.md)            | Arquitetura da Integração Bradesco (REST API + VAN via Windows VM)                                                                       | Accepted                              | 2026-04-28 |
| [0009](./0009-node-24-typescript-6-with-7-roadmap.md)          | Node.js 24 LTS + TypeScript 6 com plano de migração para TS 7.0                                                                          | Accepted (supersedes parcial de 0002) | 2026-04-28 |
| [0010](./0010-email-port-adapter-pattern.md)                   | Email — Port & Adapter Pattern com Nodemailer inicial                                                                                    | Accepted                              | 2026-04-28 |
| [0011](./0011-supply-chain-hardening.md)                       | Supply Chain Hardening — Política de Dependências                                                                                        | Accepted                              | 2026-04-28 |
| [0012](./0012-pnpm-package-manager.md)                         | pnpm como Package Manager (legado e novo)                                                                                                | Accepted                              | 2026-04-28 |
| [0013](./0013-mysql-database-engine.md)                        | Engine de Banco de Dados — MySQL 8 (correção de assunção)                                                                                | Accepted                              | 2026-04-28 |
| [0014](./0014-mysql-database-isolation.md)                     | Isolamento por Database em MySQL (supersedes 0003)                                                                                       | Accepted                              | 2026-04-28 |
| [0015](./0015-mysql-outbox-pattern.md)                         | MySQL Outbox Pattern (supersedes 0004)                                                                                                   | Accepted                              | 2026-04-28 |
| [0017](./0017-correlation-keys-cross-period-audit.md)          | Chaves de correlação cross-período entre `legacy` e `core` (auditoria fiscal sob Strangler Fig)                                          | **Proposed**                          | 2026-05-07 |
| [0018](./0018-persistence-dual-dialect-drizzle.md)             | Persistência Dual-Dialect — Drizzle com MySQL (produção) e SQLite (dev/CI)                                                               | **Superseded by 0020**                | 2026-05-14 |
| [0019](./0019-document-storage-s3-with-minio-dev.md)           | Document Storage — AWS S3 (produção) com MinIO via Docker (dev/homologação)                                                              | Accepted                              | 2026-05-15 |
| [0020](./0020-mysql-only-supersedes-dual-dialect.md)           | MySQL como Único Dialeto de Persistência (supersedes 0018)                                                                               | Accepted                              | 2026-05-15 |
| [0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md)       | Topologia Cloud — AWS (Codebit) Primária + MagaluCloud PBE Interno (supersedes 0007)                                                     | Accepted                              | 2026-05-22 |
| [0022](./0022-read-models-via-projection-over-event-stream.md) | Read-Models via Projeção sobre o Event Stream (Timeline agora, AuditLog diferido)                                                        | Accepted                              | 2026-05-26 |
| [0023](./0023-contract-lifecycle-pending-state.md)             | Ciclo de vida do Contrato — estado `Pendente` (4 estados)                                                                                | Accepted                              | 2026-05-27 |
| [0024](./0024-identity-and-rbac-auth-module.md)                | Identidade & RBAC — Módulo `auth` (identidade própria OIDC-ready, sessão híbrida, permissions granulares)                                | Accepted                              | 2026-05-27 |
| [0025](./0025-http-server-fastify-core-api.md)                 | Servidor HTTP no `core-api` com Fastify (adapter de borda, BFF continua burro)                                                           | Accepted                              | 2026-05-27 |
| [0026](./0026-mysql-read-write-split-connection.md)            | Read/Write Split de Conexão MySQL (writer/reader pools — Master-Slave ready)                                                             | Accepted                              | 2026-05-27 |
| [0027](./0027-zod-openapi-contract-first-http-edge.md)         | Zod + zod-openapi como contract-first da borda HTTP (validação de I/O + OpenAPI 3.1.1)                                                   | Accepted                              | 2026-05-27 |
| [0028](./0028-http-edge-shell-location.md)                     | Localização do shell HTTP de borda (`src/shared/http/`) e do composition root (`src/server.ts`) — verticalidade por feature              | Accepted                              | 2026-05-28 |
| [0029](./0029-pnpm-11-supply-chain-defaults.md)                | pnpm 11.x com defaults de supply-chain (supersedes 0012)                                                                                 | Accepted                              | 2026-05-30 |
| [0030](./0030-valkey-shared-store-deferred.md)                 | Store compartilhado (Valkey via ioredis) — adiado até multi-instância                                                                    | **Proposed**                          | 2026-05-30 |
| [0031](./0031-partners-registry-module.md)                     | Módulo `partners` — fronteira de Cadastros/Counterparties (supplier, financier, collaborator) migrada do legado                          | Accepted                              | 2026-06-01 |
| [0032](./0032-transient-http-composition-read-until-bff.md)    | Composição de leitura transitória no adapter HTTP (rota gorda com `Sunset`) até o BFF v2 — domínio intocado, cross-módulo via public-api | Accepted                              | 2026-06-02 |
| [0033](./0033-api-versioning-v1-legacy-mirror.md)              | Versionamento de API: `/api/v1` espelha o legado (Strangler Fig), `/api/v2` é o modelo novo; `buildApp` com prefixo por plugin           | Accepted                              | 2026-06-03 |
| [0034](./0034-adopt-bruno-api-client-cli.md)                   | Adoção do Bruno (API client Git-friendly) como ferramenta de smoke e2e da borda HTTP; coleções `.bru` em `api-collections/`, `bru` CLI   | Accepted                              | 2026-06-04 |
| [0035](./0035-partner-territory-soft-delete.md)                | Parceria territorial (estados/municípios) — Entity persistida com soft-delete (`active`+`deactivated_at`+CHECK); resolve D9 do ADR-0031   | Accepted                              | 2026-06-06 |
| [0036](./0036-act-partner-placeholder.md)                      | `Act` — novo tipo de parceiro PLACEHOLDER (clone enxuto do núcleo do Collaborator); provisório, regras de negócio pendentes              | Accepted (provisório)                 | 2026-06-06 |
| [0037](./0037-http-first-retire-embedded-cli.md)               | HTTP-first — aposenta a CLI embutida no core-api; validação E2E via Bruno (ADR-0034); CLI do domínio migra para `cli/` (binário `bc`). Supersede parcial do Princípio VII | Accepted | 2026-06-07 |
| [0038](./0038-bruno-cli-mandatory-and-bru-authoring.md)        | Coleções Bruno obrigatoriamente executadas via CLI + diretrizes de autoria `.bru`                                                       | Accepted | 2026-06-08 |
| [0039](./0039-contract-cancelled-state.md)                     | Ciclo de vida do Contrato — estado terminal `Cancelled` (5 estados)                                                                     | Accepted | 2026-06-09 |
| [0040](./0040-agent-findings-as-github-issues.md)              | Achados de agente viram GitHub Issues testáveis (tracker primário); contrato OpenAPI/`oasdiff` como evolução                            | Accepted | 2026-06-15 |
| [0041](./0041-specialized-workers-and-oneshot-jobs.md)         | Workers especializados por entrypoint + jobs one-shot via cron externo (sem job queue até multi-instância)                              | Accepted | 2026-06-16 |
| [0042](./0042-deadman-switch-redundant.md)                     | Dead-man's switch redundante (S3/R2 ⟂ GitHub Actions, JSONL append-only) para detecção de jobs mortos                                   | Accepted | 2026-06-16 |
| [0043](./0043-partners-supplier-integration-events.md)         | Contrato de eventos de integração `partners → financial` — `SupplierRegistered`/`SupplierEdited` publicados via outbox `par_outbox` (payload autocontido `{ supplierRef, name, document, occurredAt }`; at-least-once + idempotência) | Accepted | 2026-06-16 |
| [0044](./0044-cnpj-alphanumeric-kernel.md)                     | CNPJ alfanumérico (Serpro/Receita 2026) no VO `Cnpj` do kernel — módulo 11 com `ASCII − 48`, DVs numéricos, retrocompatível; estende ADR-0031 §4 | Accepted | 2026-06-16 |
| [0045](./0045-financial-supplier-read-model.md)                | Read-model de fornecedor no `financial` consumido do `par_outbox` (US2 #47) — worker em composition root, upsert com guard de `occurred_at`, backfill one-shot; estende ADR-0015/0022/0043 | Accepted | 2026-06-16 |
| [0046](./0046-contracts-contractor-ref-integration-events.md)  | Contrato de eventos `contracts → partners` — `contractorRef` aditivo ao wire-format v1 (Opção A) para o read-model `par_contract_count_view` (contagem de contratos nos grids, US6 #46); estende ADR-0022/0043 | Accepted | 2026-06-17 |
| [0047](./0047-transactional-email-via-producer-domain-event.md) | E-mail transacional como **evento de domínio no outbox do módulo produtor** (atomicidade do disparo na mesma tx; `notifications` vira consumidor) — fecha #134; estende ADR-0015/0010 | Accepted | 2026-06-18 |
| [0048](./0048-legacy-categorization-installments-mapping.md)    | **Anticorruption Layer** legado↔core (gate Camadas 0–2): reusar a categorização 020 (não portar `CostCenter→Category→SubCategory`/`releaseType`) + mapa `installments→payables` (`SUM(value WHERE PAGO)` → `'Paid'`) + dashboard fatiado; spike #233, conforma ADR-0001/0005/0006/0014 | Proposed | 2026-06-23 |
| [0049](./0049-core-api-bff-boundary.md)                        | **Fronteira core-api ↔ BFF**: core = Domain API (expõe dado cru já autorizado), BFF = Experience API (compõe view-model por tela); régua "banco agrega → core, monta/formata → BFF", contrato batch-by-id, authz/PII no core por escopo. Estado-alvo do ADR-0032 | **Proposed** | 2026-07-07 |
| [0050](./0050-document-reader-cascade-supersedes-0034.md)      | **Leitura de documento fiscal em cascata** (nativo-first): `XML → parser nativo (node:zlib) → OCR self-hosted → exceção manual`; port `DocumentReaderPort.read(bytes)` recebe bytes, nunca URL (anti-SSRF). **Supersedes ADR-0034** | Accepted | 2026-07-08 |
| [0051](./0051-taxonomy-owner-budget-plan-scoped.md)            | **Owner da taxonomia**: hierarquia canônica de 4 níveis (**Plano → Centro → Categoria → Subcategoria**); `budget-plans` é dono do **planejável** (escopado por plano), `financial` lê a árvore **do plano do documento** via public-api (OHS+ACL) e retém só o **operacional** (`ajuste`/`Estorno` — sem origem legada). Define a regra do ETL. Fecha o follow-up do #341 (#448); complementa ADR-0048 §D1 | Accepted | 2026-07-15 |
| [0052](./0052-rbac-bypass-flag.md)                             | **Modo `AUTH_RBAC_MODE=bypass`**: desliga a autorização por permissão (todo autenticado é super-usuário), **mantendo** a autenticação. Bypass **total** — inclui a auto-gestão de RBAC (permite recuperação do #462). Guardas anti-silêncio: fail-secure (só `bypass` exato liga; typo → `enforced`), banner de boot, default `enforced`. Ligável em produção (decisão do dono); trade-off aceito de escalação persistida | Accepted | 2026-07-16 |

---

## 6. Status Possíveis

| Status                   | Significado                                                |
| :----------------------- | :--------------------------------------------------------- |
| `Proposed`               | Em discussão, ainda não aprovado                           |
| `Accepted`               | Decisão vigente                                            |
| `Deprecated`             | Não vale mais, mas não foi substituído por novo ADR (raro) |
| `Superseded by ADR-XXXX` | Substituído por outro ADR                                  |

---

> 📚 Inspirado no formato de Michael Nygard ([Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)).
