[← Voltar para ADRs](./README.md)

# ADR-0003: Banco Compartilhado com Schemas Isolados

- **Status:** Superseded by [ADR-0014](./0014-mysql-database-isolation.md) em 2026-04-28
- **Date:** 2026-04-27
- **Deciders:** Arquiteto + Time de Infra

> ⚠️ **AVISO:** Este ADR partiu da assunção incorreta de que o engine de banco era PostgreSQL. O engine real é MySQL 8 (ver [ADR-0013](./0013-mysql-database-engine.md)). A estratégia de isolamento foi adaptada para MySQL "databases" em vez de PostgreSQL "schemas" no [ADR-0014](./0014-mysql-database-isolation.md). O conteúdo abaixo permanece como evidência histórica e mantém validade conceitual — apenas a sintaxe e terminologia mudaram.

---

## Contexto

Durante a migração, `legacy-api` e `core-api` precisam acessar dados financeiros relacionados. Existem três modelos possíveis para o storage:

1. **Mesmo banco, mesmas tabelas** (database integration).
2. **Mesmo banco, schemas separados.**
3. **Bancos fisicamente separados**, sincronizados via eventos.

A infra nova já está provisionando UMA instância PostgreSQL gerenciada e fará dump do banco antigo para popular dados iniciais.

---

## Decisão

**Uma instância PostgreSQL com dois schemas isolados** (`legacy` e `core`) e **usuários distintos com GRANT estrito**:

- `legacy_app`: acesso total a `legacy.*`, **zero acesso** a `core.*`.
- `core_app`: acesso total a `core.*`, **zero acesso** a `legacy.*`.
- `readonly_bi`: SELECT em ambos para BI/relatórios.

**Comunicação cross-schema entre serviços é proibida** — a única ponte é evento via [Outbox Pattern](./0004-postgres-outbox-pattern.md).

---

## Consequências

### Positivas

- Isolamento lógico forte sem custo operacional de bancos separados.
- Backup, monitoramento e replicação unificados.
- Permissão por usuário impede acidente de dev distraído ("eu só ia dar um SELECT").
- BI/relatórios podem consultar ambos os schemas via usuário read-only.
- Custos infraestruturais menores que dois bancos.

### Negativas

- Falha do banco afeta os dois serviços simultaneamente — mas isso já era verdade no modelo do legado.
- Migrações mal-feitas podem afetar concorrência cross-schema (mitigado por ferramenta de migração e janelas de manutenção).
- Tentação latente de "só dar um SELECT cross-schema" — mitigada por GRANT, mas exige cultura.

### Neutras

- Migração futura para bancos separados é viável (exportar `core` para banco próprio) se necessário.

---

## Alternativas Consideradas

### A. Tabelas Compartilhadas (Database Integration)

**Rejeitada porque:**
- Banco vira contrato implícito de integração.
- Regras de domínio diferentes nos dois lados sobre as mesmas tabelas.
- Foreign keys cross-domain criam acoplamento permanente.
- Anti-padrão clássico, bem documentado como armadilha.

### B. Bancos Fisicamente Separados

**Rejeitada nesta fase porque:**
- Custo operacional 2x (backup, monitoramento, replicação, conexões).
- Infra já contratou UMA instância.
- Sem ganho proporcional à dor.
- Pode ser feito no futuro se houver requisito real (escala extrema, tenant separation, etc.).

---

## Garantias Técnicas Obrigatórias

| Garantia | Mecanismo |
| :--- | :--- |
| `legacy_app` não escreve em `core.*` | GRANT estrito no Postgres |
| `core_app` não escreve em `legacy.*` | GRANT estrito no Postgres |
| Foreign keys cross-schema entre tabelas de domínio dos serviços | **Proibidas** (não criar) |
| Joins cross-schema em queries de aplicação | **Proibidos** (revisão de PR) |
| Triggers que escrevem no schema vizinho | **Proibidos** (revisão de PR) |

---

## Quando Re-avaliar

- Necessidade de escalar `core` independentemente do `legacy` (ex: tenant isolation regional).
- Impacto operacional de manutenção compartilhada virar gargalo.
- Volume de dados ultrapassar limites práticos de uma única instância.

---

## Referências

- [ADR-0001](./0001-strangler-fig-over-rewrite.md) — Strangler Fig (premissa).
- [ADR-0004](./0004-postgres-outbox-pattern.md) — Outbox como única ponte entre schemas.
- [`../03-data-architecture.md`](../03-data-architecture.md) — detalhamento técnico (DDL, GRANTs).
