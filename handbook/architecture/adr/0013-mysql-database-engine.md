[← Voltar para ADRs](./README.md)

# ADR-0013: Engine de Banco de Dados — MySQL 8 (correção de assunção)

- **Status:** Accepted
- **Date:** 2026-04-28
- **Deciders:** Arquiteto técnico + Gabriel Aderaldo
- **Supersedes engine choice in:** ADR-0003, ADR-0004 (referências indiretas em ADR-0008 também são corrigidas por este)

---

## Contexto

ADRs anteriores (especialmente [0003](./0003-shared-db-isolated-schemas.md), [0004](./0004-postgres-outbox-pattern.md) e [0008](./0008-bradesco-integration-architecture.md)) referenciaram **PostgreSQL** como engine de banco de dados.

Em revisão de 2026-04-28 confirmou-se que essa referência foi **assunção incorreta**: o legado roda **MySQL 8**, conforme:

- `legacy_project/package.json` declara `"mysql2": "^3.6.1"`.
- `legacy_project/CLAUDE.md` afirma literalmente: *"ERP financeiro brasileiro construído com NestJS 10 + TypeORM 0.3 + MySQL 8."*
- A própria comunicação com a Codebit (operadora de infra) sempre se referiu ao stack atual como MySQL.

A pergunta arquitetural que se impôs: **migrar para PostgreSQL** ou **manter MySQL** no novo `core-api`?

Análise honesta da decisão:

- [ADR-0001](./0001-strangler-fig-over-rewrite.md) alerta explicitamente contra "batalhas simultâneas". Trocar engine de banco no meio de uma migração de paradigma de domínio (Document-Driven Finance), arquitetura nova (Strangler Fig), e cultura de código nova (`Result`, ports/adapters) é exatamente o tipo de risco adicional a evitar.
- O handbook não tem requisito de domínio que MySQL 8 não atenda (transações ACID, JSON, isolação, auditoria — todos disponíveis).
- Conversão MySQL → PostgreSQL adiciona projeto à parte (tipos, syntax, índices, FKs).
- Operacionalmente: time + infra (Codebit) + RDS atual já operam MySQL.

---

## Decisão

**MySQL 8 é o engine de banco único** para legado e `core-api` novo.

| Item | Escolha |
| -------- | -------- |
| Engine | MySQL 8 (preferencialmente 8.4 LTS) |
| Driver Node | `mysql2` |
| ORM | `drizzle-orm/mysql2` |
| Migrations | `drizzle-kit` (mode MySQL) |
| Hospedagem | Managed (RDS / Cloud SQL / equivalente) |
| Topologia | Uma instância, dois databases isolados (`legacy` + `core`) — ver [ADR-0014](./0014-mysql-database-isolation.md) |
| Outbox | MySQL Outbox Pattern — ver [ADR-0015](./0015-mysql-outbox-pattern.md) |

---

## Consequências

### Positivas

- **Zero conversão de dados.** Dump MySQL → MySQL é trivial.
- **Time + infra mantêm expertise operacional**, sem nova curva de aprendizado.
- **Reduz vetores de risco simultâneos** durante Strangler Fig (honra ADR-0001).
- **Codebit já opera MySQL** para a Bem Comum — sem mudança de fornecedor ou prática.
- **`mysql2` é maduro** e amplamente adotado.

### Negativas

- **JSON em vez de JSONB.** Funcional, mas com performance e features menores que JSONB do PostgreSQL.
- **Sem partial indexes.** Outbox precisa de índice composto em vez de partial — adaptado em ADR-0015.
- **Sem `LISTEN/NOTIFY` nativo.** Worker da outbox vai por polling apenas — já era o plano.
- **Schemas reais não existem.** Em MySQL "schema" = "database" — usaremos databases como unidade de isolamento (ADR-0014).
- **Ecossistema PostgreSQL mais inovador** (PostGIS, pgvector, extensões) — irrelevante para nosso escopo.

### Neutras

- O estilo de código (Drizzle, Result, ports/adapters) é **idêntico** entre MySQL e PostgreSQL.
- Caso futuro precise migrar para PostgreSQL, a abstração via Drizzle facilita — adapter de driver é trocável, embora custo de migração de dados permaneça.

---

## Alternativas Consideradas

### A. Migrar para PostgreSQL

**Rejeitada porque:**

- Conversão MySQL → PostgreSQL é projeto à parte, com riscos de bugs sutis em queries traduzidas (tipos, ENUM, sintaxe, colação).
- Adiciona "uma briga a mais" durante migração de arquitetura — viola ADR-0001.
- Time precisa de re-treinamento operacional.
- Sem requisito de domínio que justifique a mudança.

### B. Heterogêneo (legado MySQL + core-api PostgreSQL)

**Rejeitada porque:**

- Dois engines em produção simultaneamente = dobra superfície operacional.
- Outbox cross-engine não trivial.
- Custo enorme sem benefício proporcional.

### C. Manter MySQL — **ESCOLHIDA**

Único caminho que respeita simultaneamente:
- Continuidade operacional do legado.
- ADR-0001 (uma batalha de cada vez).
- Capacidade técnica de MySQL 8 para o domínio do handbook.
- Realidade de infra (Codebit, expertise do time).

---

## Impacto nas decisões anteriores

| ADR | Status | Ação |
| -------- | -------- | -------- |
| [ADR-0003](./0003-shared-db-isolated-schemas.md) | Superseded | Substituído por [ADR-0014](./0014-mysql-database-isolation.md) — adaptação para MySQL "databases" em vez de PostgreSQL "schemas" |
| [ADR-0004](./0004-postgres-outbox-pattern.md) | Superseded | Substituído por [ADR-0015](./0015-mysql-outbox-pattern.md) — adaptação para MySQL outbox |
| [ADR-0008](./0008-bradesco-integration-architecture.md) | Mantido | Apenas a referência ao driver `pg` deve ser lida como `mysql2`. Conteúdo arquitetural permanece válido |
| [Inquiry-0008](../../inquiries/0008-postgres-driver-pg-vs-postgres.md) | Histórica | Marcada como decisão obsoleta — engine real é MySQL |

---

## Quando Re-avaliar

A escolha do engine deve ser revisitada (gerando ADR novo que `supersedes` este) se:

- Surgir requisito de domínio que MySQL 8 não atenda (raro).
- Bem Comum decidir consolidar stack em PostgreSQL para outros sistemas.
- MySQL entrar em estagnação que prejudique manutenção (improvável dado o respaldo da Oracle).

---

## Referências

- [ADR-0001](./0001-strangler-fig-over-rewrite.md) — Strangler Fig (princípio de uma batalha de cada vez).
- [ADR-0014](./0014-mysql-database-isolation.md) — Isolamento por database em MySQL.
- [ADR-0015](./0015-mysql-outbox-pattern.md) — MySQL Outbox Pattern.
- `legacy_project/package.json` — confirmação `mysql2` como driver.
- `legacy_project/CLAUDE.md` — confirmação MySQL 8.
- [Inquiry-0008](../../inquiries/0008-postgres-driver-pg-vs-postgres.md) — análise histórica obsoleta.
