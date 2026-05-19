[← Voltar para Arquitetura](./README.md)

# 🏗️ Topologia do Sistema

> **Status:** vigente | **Última revisão:** 2026-04-28 (correção MySQL — ver [ADR-0013](./adr/0013-mysql-database-engine.md))

---

## 1. Diagrama de Componentes

```
                        Internet
                           │
                           ▼
                   ┌───────────────┐
                   │ Load Balancer │  TLS, WAF
                   └───────┬───────┘
                           │
                           ▼
                   ┌───────────────┐
                   │ bff-gateway   │  Node 20+, stateless, ≥2 réplicas
                   │  (público)    │  Roteamento por prefixo, auth, rate limit
                   └───┬───────┬───┘
                       │       │
             /api/v1/* │       │ /api/v2/*
                       ▼       ▼
           ┌──────────────┐ ┌──────────────────────────┐
           │ legacy-api   │ │       core-api           │  Modular Monolith (ADR-0006)
           │ (NestJS)     │ │ ┌──────────┐ ┌─────────┐ │  Módulos:
           │              │ │ │Financeiro│ │Contratos│ │  - Comunicação intra-processo
           │              │ │ └──────────┘ └─────────┘ │    via eventos (outbox)
           │              │ │   tabelas      tabelas   │  - Sem cross-write entre
           │              │ │   fin_*        ctr_*     │    módulos
           └──────┬───────┘ └──────┬───────────────────┘
                  │   eventos      │
                  ├───(outbox)────►│
                  │◄──(outbox)─────┤
                  │                │
                  ▼                ▼
           ┌──────────────────────────┐
           │       MySQL 8            │  Managed (RDS / Cloud SQL)
           │  ┌────────┐ ┌────────┐   │  Databases isolados:
           │  │ legacy │ │  core  │   │  - legacy_app: GRANT só em legacy.*
           │  │  (db)  │ │  (db)  │   │  - core_app:   GRANT só em core.*
           │  └────────┘ └────────┘   │  - readonly_bi: SELECT em ambos
           └──────────────────────────┘
                           │
                           ▼ (egress whitelist)
                   ┌───────────────┐
                   │ VAN Bradesco  │
                   └───────────────┘
```

> 📚 Módulos do `core-api`: **Financeiro** ([`../domain/`](../domain/)) e **Contratos** ([`../domain/contratos/`](../domain/contratos/)). Detalhamento da organização de tabelas em [03-data-architecture.md](./03-data-architecture.md).

---

## 2. Componentes

### 2.1. `bff-gateway`

| Atributo | Valor |
| :--- | :--- |
| Stack | Node 20, framework leve (Hono ou Fastify) |
| Exposição | Pública (HTTPS) |
| Stateless? | Sim |
| Réplicas mínimas | 2 |
| Sizing inicial | 256 MB / 0.25 vCPU |

**Responsabilidades:**
- Roteamento por prefixo (`/api/v1/*` → legacy-api, `/api/v2/*` → core-api).
- Autenticação (validação de sessão / JWT).
- Rate limit por usuário/IP.
- Geração e propagação de `X-Request-Id`.
- Log estruturado JSON em stdout.

**NÃO faz:**
- ❌ Regra de negócio.
- ❌ Composição de respostas de múltiplos backends.
- ❌ Cache de domínio.
- ❌ Tradução entre v1 e v2.
- ❌ Acesso a banco de dados.

> Decisão: [ADR-0005](./adr/0005-thin-bff-gateway.md).

---

### 2.2. `legacy-api`

| Atributo | Valor |
| :--- | :--- |
| Stack | NestJS (existente) |
| Exposição | Interna |
| Stateless? | Sim (sessão externalizada) |
| Réplicas mínimas | 2 |
| Sizing | Conforme uso atual |

**Responsabilidades:**
- Preserva 100% do comportamento atual durante a transição.
- Adiciona tabela `legacy.outbox` para emitir eventos de fatos relevantes.
- Adiciona worker de outbox (despacha eventos).
- Adiciona consumidor de eventos vindos do `core-api` (quando aplicável).

**Mudanças aceitáveis nesta fase:**
- Apenas o necessário para integração via outbox.
- Refatorações que não alteram comportamento observável.

**NÃO se faz no legado:**
- ❌ Reescrever lógica de domínio (vai ser estrangulada de qualquer jeito).
- ❌ Adicionar features novas que não existem no plano de migração.

---

### 2.3. `core-api`

| Atributo | Valor |
| :--- | :--- |
| Stack | Node 24 LTS, Fastify, TypeScript 6 (com plano TS 7) |
| Arquitetura | Modular Monolith ([ADR-0006](./adr/0006-modular-monolith-core-api.md)) |
| Exposição | Interna |
| Stateless? | Sim |
| Réplicas mínimas | 2 |
| Sizing inicial | 512 MB / 0.5 vCPU |

**Módulos hospedados:**
- 💰 **Financeiro** — BCs `Documentos`, `Títulos & Liquidação`, `Integração Bancária`, `Ingestão & OCR`. Detalhamento em [`../domain/`](../domain/).
- 📦 **Contratos** — BCs `Gestão de Contratos`, `Aditivos`, `Timeline`, `Integração Financeira (ACL)`. Detalhamento em [`../domain/contratos/`](../domain/contratos/).

**Responsabilidades:**
- Implementar os BCs do handbook, começando por Bradesco (módulo Financeiro).
- Manter `core.outbox` e workers correspondentes.
- Consumir eventos do `legacy-api` quando relevante.
- Rotear eventos cross-módulo (Contratos ↔ Financeiro) via outbox.
- Expor endpoints HTTP versionados em `/api/v2/*`.

**Princípios obrigatórios:**
- Domínio puro, sem framework.
- `Result<T, E>` em todos os caminhos de erro.
- Ports/adapters: domínio sem dependência de infra.
- Sem cross-write entre módulos (`fin_*` só pelo Financeiro; `ctr_*` só pelo Contratos).
- Comunicação cross-módulo **sempre** via outbox + evento, mesmo intra-processo.

> Decisão de runtime: [ADR-0002](./adr/0002-keep-nodejs-runtime.md).

---

### 2.4. MySQL 8

| Atributo | Valor |
| :--- | :--- |
| Versão | 8.4 LTS (managed: RDS / Cloud SQL) |
| Estrutura | 1 instância, 2 databases isolados (`legacy`, `core`) |
| Backup | PITR habilitado (binlog), retenção ≥ 30 dias em prod |
| Auditoria | RDS Database Activity Streams / Cloud SQL Audit Logs / MySQL Enterprise Audit (definir com Codebit — ver [03-data-architecture.md](./03-data-architecture.md) §6) |

> Detalhamento em [03-data-architecture.md](./03-data-architecture.md). Decisão vigente: [ADR-0014](./adr/0014-mysql-database-isolation.md) (supersedes [ADR-0003](./adr/0003-shared-db-isolated-schemas.md), versão histórica).

---

## 3. Fluxos

### 3.1. Leitura — Tela Nova

```
Browser
   │  GET /api/v2/documentos/123
   ▼
BFF (auth, rate limit, request-id)
   │  GET /api/v2/documentos/123
   ▼
core-api
   │  SELECT FROM core.documentos WHERE id = 123
   ▼
MySQL 8 (database core)
   │
   ▼
Resposta JSON ── volta pelo mesmo caminho
```

### 3.2. Escrita Com Efeito Cross-BC

```
Browser
   │  POST /api/v2/cnab/remessa
   ▼
BFF
   │
   ▼
core-api ── BEGIN TRANSACTION
   │  INSERT INTO core.remessa_cnab (...)
   │  INSERT INTO core.outbox (event_type='RemessaCnabGerada', ...)
   │  COMMIT
   │
   ├─► [Worker assíncrono]
   │      lê core.outbox.processed_at IS NULL
   │      publica/encaminha evento
   │
   └─► Resposta 201 ao browser

[Em outro momento]
legacy-api ── consumer
   │  recebe evento (se subscrito)
   │  reage no PRÓPRIO legacy.*
```

### 3.3. Leitura — Tela Legada

```
Browser → BFF → legacy-api → legacy.* → resposta
```

---

## 4. Princípios Invioláveis

1. **BFF nunca toca em DB.** Ele só conhece HTTP.
2. **Cada serviço escreve só no próprio database.** Sem exceção.
3. **Toda comunicação cross-BC é via evento (outbox).** Sem chamada HTTP síncrona entre `legacy-api` e `core-api`.
4. **Sem joins cross-database entre serviços.** Se precisa de dado do outro, lê via API ou via projeção mantida no próprio database.
5. **Falha de um serviço não derruba o outro.** Eventos ficam empilhados na outbox até voltar.

---

## 5. Egress / Conectividade Externa

| Serviço | Destino externo | Propósito |
| :--- | :--- | :--- |
| `core-api` | VAN Bradesco | Envio CNAB / leitura retorno |
| `core-api` | Provider OCR (futuro) | Processamento de documentos |
| `legacy-api` | O que já consumia hoje | Manter funcionamento |

> IPs e portas específicos da VAN Bradesco devem ser whitelistados no firewall — ver [`../infrastructure/01-infra-handoff.md`](../infrastructure/01-infra-handoff.md).

---

## 6. Referências

- [01-migration-strategy.md](./01-migration-strategy.md) — estratégia que esta topologia materializa.
- [03-data-architecture.md](./03-data-architecture.md) — detalhamento do banco.
- [04-integration-events.md](./04-integration-events.md) — detalhamento do outbox e eventos.
- [ADR-0005](./adr/0005-thin-bff-gateway.md) — decisão sobre o BFF burro.
