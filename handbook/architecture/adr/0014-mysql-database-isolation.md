[← Voltar para ADRs](./README.md)

# ADR-0014: Isolamento por Database em MySQL (supersedes ADR-0003)

- **Status:** Accepted
- **Date:** 2026-04-28
- **Supersedes:** [ADR-0003](./0003-shared-db-isolated-schemas.md)
- **Deciders:** Arquiteto técnico

---

## Contexto

[ADR-0003](./0003-shared-db-isolated-schemas.md) definiu **PostgreSQL com schemas isolados** (`legacy.*` e `core.*`) e usuários distintos com GRANT estrito.

Após [ADR-0013](./0013-mysql-database-engine.md) confirmar que o engine é **MySQL 8** (não PostgreSQL), a estratégia de isolamento precisa de adaptação semântica e sintática.

Em MySQL, "schema" e "database" são **sinônimos** — não existem schemas como entidade separada de databases. A unidade de isolamento natural é o database.

---

## Decisão

**Uma instância MySQL com dois databases isolados** e usuários distintos com GRANT estrito.

### Estrutura

| Database | Dono | Conteúdo |
| -------- | -------- | -------- |
| `legacy` | `legacy-api` | Dump do banco antigo, mantido vivo durante a migração |
| `core` | `core-api` | Database novo, cresce conforme BCs são implementados |

### Provisionamento (DDL)

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

> **Esse isolamento é a única coisa que impede um dev distraído de violar a regra de ouro.** Não negocie.

---

## Regra de ouro (mantida do ADR-0003)

> **Cada database tem UM único escritor. Sempre. Sem exceção.**

- `legacy.*` → só `legacy-api` escreve.
- `core.*` → só `core-api` escreve.
- Eventos (via [Outbox Pattern em MySQL — ADR-0015](./0015-mysql-outbox-pattern.md)) são o **único** canal de comunicação cross-database.

---

## Diferenças vs ADR-0003 (PostgreSQL → MySQL)

| Aspecto | PostgreSQL (ADR-0003) | MySQL (este ADR) |
| -------- | -------- | -------- |
| Unidade de isolamento | `SCHEMA` dentro de uma DATABASE | `DATABASE` (= "schema" em terminologia MySQL) |
| Sintaxe `CREATE` | `CREATE SCHEMA legacy` | `CREATE DATABASE legacy` |
| Sintaxe `GRANT` | `GRANT USAGE ON SCHEMA ...` + `GRANT ALL ON ALL TABLES IN SCHEMA ...` | `GRANT ALL PRIVILEGES ON legacy.* TO ...` |
| Default privileges | `ALTER DEFAULT PRIVILEGES IN SCHEMA ...` | Não necessário — `GRANT ON db.*` cobre tabelas futuras |
| Reload | Imediato | `FLUSH PRIVILEGES` (em alguns cenários) |
| Charset/Collation | UTF-8 default | Definir explicitamente: `utf8mb4` + `utf8mb4_unicode_ci` (importante!) |

### Charset/Collation

> ⚠️ **Atenção crítica em MySQL:** sempre criar databases com `CHARACTER SET utf8mb4` e `COLLATE utf8mb4_unicode_ci` (ou `utf8mb4_0900_ai_ci` em MySQL 8). O default histórico (`latin1` ou `utf8` que é alias de `utf8mb3`) **quebra emojis e alguns caracteres**. Esquecer disso é fonte clássica de bugs em sistemas brasileiros.

---

## Migrações

Cada serviço gerencia migrações do **próprio database**:

- `legacy-api` migra `legacy.*` (com TypeORM 0.3, conforme legado).
- `core-api` migra `core.*` (com `drizzle-kit`).

Não há requisito de uniformizar ferramentas.

---

## Migração inicial — dump do legado

A infra (Codebit) provisiona o banco e carrega o **dump do MySQL atual** dentro do database `legacy`. O `core` é criado vazio.

**Não há conversão MySQL → PostgreSQL** (que seria o caso na ADR-0003 errada). O dump MySQL → MySQL é direto:

```bash
mysqldump -h source -u root --databases legacy > legacy.sql
mysql -h target -u root < legacy.sql
```

---

## Backup e Recuperação

| Item | Requisito mínimo (prod) |
| -------- | -------- |
| Backup | PITR habilitado (binlog em RDS / Cloud SQL) |
| Retenção | >= 30 dias |
| Teste de restore | Exercitado em staging antes do primeiro mês em prod, repetido semestralmente |
| Auditoria DB | MySQL audit log plugin (ou equivalente do provedor cloud) ativo em DDL e DML de tabelas financeiras críticas |
| Retenção de audit logs | >= 5 anos (requisito fiscal) |

> **Nota sobre auditoria:** PostgreSQL usa `pgaudit`. MySQL usa o **MySQL Enterprise Audit** (Oracle) ou alternativas como **MariaDB Audit Plugin**. Em RDS MySQL existe a opção `Database Activity Streams` da AWS. Confirmar com Codebit qual é a estratégia disponível no ambiente provisionado.

---

## Anti-padrões proibidos (mantidos do ADR-0003)

| Anti-padrão | Razão |
| -------- | -------- |
| Tabelas compartilhadas entre serviços | Banco vira contrato implícito; regras de domínio divergem |
| Joins cross-database em queries de aplicação | Acopla serviços invisivelmente |
| Um serviço fazendo `UPDATE/INSERT/DELETE` no database do outro | Quebra a regra de ouro |
| Foreign keys cross-database entre tabelas de domínio dos serviços | Acoplamento permanente (em MySQL é tecnicamente possível mas proibido) |
| Triggers que escrevem no database vizinho | "Mágica" invisível, impossível de testar |

---

## Padrões permitidos

| Padrão | Por que é OK |
| -------- | -------- |
| Read replica usada por BI (`readonly_bi`) consultando ambos databases | Read-only, sem mutação |
| Backup unificado | Operacional, não compromete isolamento de domínio |
| Outbox local em cada database (`legacy.outbox`, `core.outbox`) | Cada serviço dono do próprio outbox |
| Foreign keys **dentro** de cada database | Naturais e necessárias |

---

## Referências

- [ADR-0013](./0013-mysql-database-engine.md) — escolha de MySQL como engine.
- [ADR-0015](./0015-mysql-outbox-pattern.md) — outbox como única ponte entre databases.
- [ADR-0003](./0003-shared-db-isolated-schemas.md) — versão PostgreSQL anterior (superseded).
- [`../03-data-architecture.md`](../03-data-architecture.md) — detalhamento técnico atualizado.
