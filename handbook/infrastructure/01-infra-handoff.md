[← Voltar para Infraestrutura](./README.md)

# 📦 Especificação de Infraestrutura — ERP Financeiro v2

> **Documento de handoff para o time de plataforma/infra.**
>
> **Status:** vigente | **Última revisão:** 2026-04-27 | **Audiência primária:** Time de Infra

---

## 1. Sumário Executivo

O projeto migra um ERP financeiro de modelo monolítico (NestJS) para uma arquitetura **Strangler Fig** com 3 serviços: `bff-gateway`, `legacy-api` (existente) e `core-api` (novo).

A infra precisa provisionar:

- **1 instância MySQL 8 gerenciada** com 2 databases isolados (`legacy`, `core`).
- **3 serviços containerizados** atrás de um Load Balancer.
- **3 ambientes** (dev, staging, prod) com topologia espelhada.
- **Observabilidade baseline** (logs, métricas, tracing, health checks).
- **Backup PITR** com retenção mínima de 30 dias em prod.
- **Egress controlado** para VAN Bradesco e provedor OCR.

> Detalhamento arquitetural: [`../architecture/02-system-topology.md`](../architecture/02-system-topology.md).

---

## 2. Topologia

```
                        Internet
                           │
                           ▼
                   ┌───────────────┐
                   │ Load Balancer │  TLS, WAF se houver
                   └───────┬───────┘
                           │
                           ▼
                   ┌───────────────┐
                   │ bff-gateway   │  Pública, ≥2 réplicas
                   │  (público)    │
                   └───┬───────┬───┘
                       │       │
             /api/v1/* │       │ /api/v2/*
                       ▼       ▼
           ┌──────────────┐ ┌──────────────┐
           │ legacy-api   │ │  core-api    │  Internos, ≥2 réplicas cada
           │              │ │              │
           └──────┬───────┘ └──────┬───────┘
                  │                │
                  ▼                ▼
           ┌──────────────────────────┐
           │       MySQL 8            │  Managed (RDS / Cloud SQL)
           │  ┌────────┐ ┌────────┐   │  PITR habilitado
           │  │ legacy │ │  core  │   │
           │  └────────┘ └────────┘   │
           └──────────────────────────┘
                           │
                           ▼ (egress whitelist)
                   ┌───────────────┐
                   │ VAN Bradesco  │
                   └───────────────┘
```

---

## 3. Catálogo de Serviços

| Serviço | Stack | Exposição | Stateless? | Réplicas mín. | Sizing inicial |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `bff-gateway` | Node 20, Hono ou Fastify | Pública (HTTPS) | Sim | 2 | 256 MB / 0.25 vCPU |
| `legacy-api` | Node 20, NestJS | Interna | Sim* | 2 | Conforme uso atual |
| `core-api` | Node 20, framework leve | Interna | Sim | 2 | 512 MB / 0.5 vCPU |

\* Se o legado tem sessão em memória, externalizar para Redis ou DB **antes** do primeiro deploy em prod, ou marcar como dívida técnica conhecida.

---

## 4. Banco de Dados

### 4.1. Provisionamento

- **Engine:** MySQL 8.x (managed: RDS / Cloud SQL / equivalente). Preferência por 8.4 LTS quando disponível.
- **Alta disponibilidade:** Multi-AZ em prod.
- **Replicação:** read replica para BI (opcional na fase inicial).
- **Charset/Collation servidor:** `utf8mb4` + `utf8mb4_unicode_ci`.

### 4.2. Databases e Usuários

> ⚠️ **Crítico:** o isolamento por usuário com GRANT estrito é a única coisa que impede um dev de violar a regra de domínio. **Não negocie.**

> **Nota:** em MySQL, "schema" e "database" são sinônimos. A unidade de isolamento é o **database**. Ver [ADR-0014](../architecture/adr/0014-mysql-database-isolation.md).

```sql
CREATE DATABASE legacy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE core   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'legacy_app'@'%'  IDENTIFIED BY '<<provisionado por Secrets Manager>>';
CREATE USER 'core_app'@'%'    IDENTIFIED BY '<<provisionado por Secrets Manager>>';
CREATE USER 'readonly_bi'@'%' IDENTIFIED BY '<<provisionado por Secrets Manager>>';

-- legacy_app: GRANT só em legacy
GRANT ALL PRIVILEGES ON legacy.* TO 'legacy_app'@'%';

-- core_app: GRANT só em core
GRANT ALL PRIVILEGES ON core.* TO 'core_app'@'%';

-- readonly_bi: SELECT em ambos
GRANT SELECT ON legacy.* TO 'readonly_bi'@'%';
GRANT SELECT ON core.*   TO 'readonly_bi'@'%';

FLUSH PRIVILEGES;
```

> ⚠️ **Charset/Collation:** sempre `utf8mb4` + `utf8mb4_unicode_ci` (ou `utf8mb4_0900_ai_ci`). Defaults históricos do MySQL quebram emojis e caracteres acentuados. Confirmar parâmetros do servidor (`character-set-server`, `collation-server`) com a Codebit.

### 4.3. Carga Inicial

A infra deve **carregar o dump do MySQL antigo dentro do database `legacy`**. O database `core` é criado vazio.

```bash
# Comando esperado:
mysqldump -h source -u root --single-transaction --routines --events legacy_db > legacy.sql
mysql -h target -u root legacy < legacy.sql
```

> ✅ **Não há conversão de tipos ou sintaxe** — origem e destino são MySQL. Esta foi uma das razões da decisão de manter MySQL ([ADR-0013](../architecture/adr/0013-mysql-database-engine.md)).

> ⚠️ Não confundir: o dump preserva o legado funcionando. **Não é migração de domínio.** Modelo novo nasce em `core.*`.

### 4.4. Backup

- **Snapshot diário + binlog para PITR**, retenção mínima:
  - dev: 7 dias
  - staging: 14 dias
  - prod: 30 dias (idealmente 35)
- **Teste de restore** exercitado em staging **antes** do primeiro mês em prod.

### 4.5. Auditoria

- **MySQL audit** ativo em prod (DDL e DML em tabelas financeiras críticas). Opções:
  - **AWS RDS:** Database Activity Streams.
  - **GCP Cloud SQL:** Cloud Audit Logs + plugin de auditoria.
  - **Self-managed:** MySQL Enterprise Audit Plugin ou MariaDB Audit Plugin.
- Retenção dos logs de auditoria: ≥ 5 anos (requisito fiscal).

> Confirmar com Codebit qual estratégia de auditoria está disponível no ambiente provisionado.

---

## 5. Rede e Segurança

### 5.1. Topologia de Rede

- **Apenas o BFF é público.** `legacy-api` e `core-api` ficam em rede interna (VPC privada / cluster interno).
- Comunicação interna pode ser HTTP simples (ou mTLS se a empresa exigir).
- Terminação TLS no Load Balancer.

### 5.2. Egress Whitelist

| Origem | Destino | Propósito |
| :--- | :--- | :--- |
| `core-api` | VAN Bradesco (IPs/portas a definir com banco) | CNAB / OFX |
| `core-api` | Provider OCR (a definir) | Processamento de documentos |
| `legacy-api` | O que já consome hoje | Manter funcionamento |
| Todos | Secrets Manager | Leitura de credenciais |
| Todos | Coletor de logs/métricas | Observabilidade |

### 5.3. WAF / Rate Limit

- WAF no Load Balancer (regras OWASP padrão).
- Rate limit por usuário/IP no `bff-gateway` (configuração via env).

---

## 6. Ambientes

> Detalhamento em [`./02-environments.md`](./02-environments.md).

| Ambiente | Propósito | Réplicas mín. | Dados |
| :--- | :--- | :---: | :--- |
| `dev` | Desenvolvimento + CI | 1 (cada) | Sintéticos / anonimizados |
| `staging` | Pré-produção | 2 (cada, espelha prod) | Dump anonimizado de prod |
| `prod` | Produção | 2+ (HA) | Reais |

---

## 7. Secrets

> Catálogo completo em [`./03-secrets-catalog.md`](./03-secrets-catalog.md).

**Ferramenta sugerida:** AWS Secrets Manager / Google Secret Manager / HashiCorp Vault.

**Slots iniciais a provisionar (vazios):**

```
DATABASE_URL_LEGACY        # postgresql://legacy_app:***@host:5432/erp_financeiro?schema=legacy
DATABASE_URL_CORE          # postgresql://core_app:***@host:5432/erp_financeiro?schema=core
DATABASE_URL_READONLY      # postgresql://readonly_bi:***@host:5432/erp_financeiro

BRADESCO_API_KEY
BRADESCO_API_SECRET
BRADESCO_CERT_PEM
BRADESCO_CERT_KEY
BRADESCO_VAN_HOST
BRADESCO_BENEFICIARIO_CONFIG

JWT_SIGNING_KEY
SESSION_SECRET
OIDC_CLIENT_ID
OIDC_CLIENT_SECRET

OCR_PROVIDER_KEY            # quando OCR for contratado
```

> Valores são preenchidos por Security/Operação após provisionamento dos slots.

---

## 8. Observabilidade

> Detalhamento em [`./04-observability-baseline.md`](./04-observability-baseline.md).

### 8.1. Mínimo Viável

- **Logs:** stdout JSON estruturado → coletor centralizado (CloudWatch / Datadog / Loki / Elastic).
- **Métricas:** endpoint `/metrics` formato Prometheus em cada serviço.
- **Tracing:** OpenTelemetry, sampling 10% em prod, 100% em staging.
- **Health:** `/health` (liveness) e `/ready` (readiness com check de DB).

### 8.2. Alertas Críticos

| Alerta | Condição | Severidade |
| :--- | :--- | :--- |
| Serviço down | `/health` falha por 1 min | Crítica |
| Latência p95 elevada | > 1s por 5 min | Alta |
| Taxa de erro 5xx | > 1% em 5 min | Alta |
| Outbox pendente crescendo | > 1000 por 10 min | Alta |
| Outbox dead-letter | qualquer entrada nova | Crítica |
| DB CPU | > 80% por 10 min | Média |

---

## 9. CI/CD

### 9.1. Requisitos

- **Pipeline por serviço** (3 pipelines independentes).
- **Build:** Docker image versionada por commit SHA.
- **Deploy automático** dev → staging em PR aprovado para `main`.
- **Deploy manual** staging → prod com aprovação + janela de release.
- **Rollback** em ≤ 5 min via deploy de versão anterior.

### 9.2. Promoção entre ambientes

```
dev ──(PR aprovado)──► staging ──(aprovação manual)──► prod
```

> **Nunca** deploy direto de dev para prod.

---

## 10. O Que Precisamos da Infra (Checklist Acionável)

### Antes do M0 (Topologia em dev)

- [ ] MySQL 8 provisionado em dev, com 2 databases e 3 usuários conforme seção 4.2.
- [ ] Dump do banco antigo carregado em `dev.legacy.*`.
- [ ] 3 serviços com slots de deploy criados (mesmo que rodem só `/health`).
- [ ] Load Balancer apontando para `bff-gateway`.
- [ ] Slots de Secrets Manager criados (vazios) conforme seção 7.
- [ ] Pipeline CI/CD básico para os 3 serviços.
- [ ] Coletor de logs configurado.

### Antes do M1 (Bradesco em prod)

- [ ] Staging provisionado (espelhando topologia de prod).
- [ ] Prod provisionado.
- [ ] Backup PITR habilitado em staging e prod.
- [ ] Teste de restore exercitado em staging.
- [ ] WAF configurado no LB de prod.
- [ ] Egress whitelist da VAN Bradesco aprovada.
- [ ] Métricas e alertas baseline funcionando.
- [ ] `pgaudit` habilitado em prod.

---

## 11. Pontos de Decisão Pendentes

> Itens que dependem de definição da infra ou outros stakeholders.

- [ ] **Cloud provider e ferramenta de IaC** (a definir).
- [ ] **Provedor de Secrets Manager** (a definir).
- [ ] **Ferramenta de observabilidade** (Datadog? Grafana stack? equivalente?).
- [ ] **Serviço de filas/eventos para fase 2+** (caso outbox saia do MySQL no futuro).
- [ ] **Provedor OCR** (negociação comercial em andamento?).

---

## 12. Contatos

| Papel | Responsável |
| :--- | :--- |
| Arquiteto técnico | (a preencher) |
| P.O. | (a preencher) |
| Líder de Infra | (a preencher) |
| Security | (a preencher) |

---

## 13. Referências

- [`../architecture/02-system-topology.md`](../architecture/02-system-topology.md)
- [`../architecture/03-data-architecture.md`](../architecture/03-data-architecture.md)
- [`../architecture/adr/0003-shared-db-isolated-schemas.md`](../architecture/adr/0003-shared-db-isolated-schemas.md)
