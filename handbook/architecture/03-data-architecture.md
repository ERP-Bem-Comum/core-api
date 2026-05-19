[← Voltar para Arquitetura](./README.md)

# 🗄️ Arquitetura de Dados

> **Status:** vigente | **Última revisão:** 2026-05-14 (achados do dump real — ver [Inquiry-0014](../inquiries/0014-schema-legado-vs-modelo-alvo.md) e [`../domain/10-mapeamento-legado-schema.md`](../domain/10-mapeamento-legado-schema.md))

---

## 1. Modelo Físico

Uma única instância **MySQL 8**, dois databases isolados:

| Database | Dono | Conteúdo |
| -------- | -------- | -------- |
| `legacy` | `legacy-api` | Dump do banco antigo MySQL, mantido vivo durante a migração. **Nome real do database de origem:** `abc-erp-financeiro-prod` (Cloud SQL MySQL 8.4.7-google em GCP). 32 tabelas, sem views/procedures/triggers. Ver [`../domain/10-mapeamento-legado-schema.md`](../domain/10-mapeamento-legado-schema.md). |
| `core` | `core-api` | Database novo, cresce conforme módulos e BCs são implementados |

> Decisão de engine: [ADR-0013](./adr/0013-mysql-database-engine.md). Decisão de isolamento: [ADR-0014](./adr/0014-mysql-database-isolation.md).

> ⚠️ **Em MySQL, "schema" e "database" são sinônimos.** A unidade de isolamento é o **database**, não um conceito separado de schema como em PostgreSQL.

### 1.1. Organização interna do `core` por módulo

O `core-api` é um Modular Monolith ([ADR-0006](./adr/0006-modular-monolith-core-api.md)) que hospeda dois módulos com **prefixo de tabela** delimitando o domínio (não outro database — o isolamento físico ocorre em `legacy` vs `core`):

| Módulo | Prefixo de tabela | BCs internos |
| -------- | -------- | -------- |
| 💰 **Financeiro** | `fin_*` | `fin_documentos`, `fin_titulos`, `fin_remessas_cnab`, `fin_eventos_processados`, … |
| 📦 **Contratos** | `ctr_*` | `ctr_contratos`, `ctr_aditivos`, `ctr_eventos_timeline`, `ctr_documentos`, … |
| Compartilhado | `outbox`, `outbox_dead_letter`, `auditoria` | Cross-módulo |

> 📚 Domínio do módulo Financeiro: [`../domain/`](../domain/). Domínio do módulo Contratos: [`../domain/contratos/`](../domain/contratos/).

> ⚠️ **Mesma regra de ouro vale em nível de módulo:** tabelas `fin_*` só são escritas pelo módulo Financeiro; `ctr_*` só pelo Contratos. Cross-módulo via outbox + evento, **mesmo dentro do mesmo processo** — preserva o caminho de extração futura.

---

## 2. Usuários e Permissões

```sql
-- Cada serviço tem seu próprio usuário com GRANT estrito.

CREATE DATABASE legacy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE core   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'legacy_app'@'%'  IDENTIFIED BY '<<provisionado por Secrets Manager>>';
CREATE USER 'core_app'@'%'    IDENTIFIED BY '<<provisionado por Secrets Manager>>';
CREATE USER 'readonly_bi'@'%' IDENTIFIED BY '<<provisionado por Secrets Manager>>';

-- legacy_app: GRANT só em legacy
GRANT ALL PRIVILEGES ON legacy.* TO 'legacy_app'@'%';

-- core_app: GRANT só em core
GRANT ALL PRIVILEGES ON core.* TO 'core_app'@'%';

-- readonly_bi: SELECT em ambos (relatórios, BI)
GRANT SELECT ON legacy.* TO 'readonly_bi'@'%';
GRANT SELECT ON core.*   TO 'readonly_bi'@'%';

FLUSH PRIVILEGES;
```

> ⚠️ **Esse isolamento é a única coisa que impede um dev distraído de violar a regra de ouro.** Não negocie nem flexibilize "para destravar uma tarefa".

> ⚠️ **Charset/Collation:** sempre `utf8mb4` + `utf8mb4_unicode_ci` (ou `utf8mb4_0900_ai_ci`). O default histórico do MySQL pode ser `latin1` ou `utf8mb3` — ambos quebram emojis e alguns caracteres. **Esquecer disso é fonte clássica de bugs em sistemas brasileiros.**
>
> 📎 **Realidade do legado (2026-05-14):** o dump confirma collation **`utf8mb4_0900_ai_ci`** (padrão MySQL 8, accent-insensitive). Manter compatível em `legacy` para evitar conversão na carga; usar a mesma em `core` para uniformidade.

---

## 3. Regra de Ouro

> **Cada database tem UM único escritor. Sempre. Sem exceção.**

- `legacy.*` → só `legacy-api` escreve.
- `core.*` → só `core-api` escreve.
- Eventos (via [Outbox Pattern em MySQL](./04-integration-events.md)) são o **único** canal de comunicação cross-database entre serviços.

---

## 4. Migrações

Cada serviço gerencia migrações do **próprio database**:

- `legacy-api` migra `legacy.*` (com TypeORM 0.3, ferramenta atual do legado).
- `core-api` migra `core.*` (com `drizzle-kit` em modo MySQL).

Não há requisito de uniformizar ferramentas — cada serviço usa o que faz sentido para seu time/stack.

---

## 5. Migração inicial — Dump do legado

A infra provisiona o banco e carrega o **dump do MySQL atual** dentro do database `legacy`. O `core` é criado vazio.

```bash
# No banco antigo:
mysqldump -h source -u root --single-transaction --routines --events legacy_db > legacy.sql

# No banco novo:
mysql -h target -u root legacy < legacy.sql
```

> **Importante:** o dump preserva a infraestrutura legada funcionando. **Não é migração de domínio.**
>
> O modelo do handbook (Fato Gerador soberano) só nasce em tabelas novas dentro de `core.*`.

> ✅ Como ambos os bancos são MySQL, **não há conversão de tipos, sintaxe ou index**. O dump é direto. Esta é uma das razões da decisão de manter MySQL ([ADR-0013](./adr/0013-mysql-database-engine.md)).

---

## 6. Backup e Recuperação

| Item | Requisito mínimo (prod) |
| -------- | -------- |
| Backup | Snapshot diário + binlog para PITR (Point-in-Time Recovery) |
| Retenção | >= 30 dias |
| Teste de restore | Exercitado em staging antes do primeiro mês em prod, repetido semestralmente |
| Auditoria DB | MySQL Enterprise Audit / RDS Database Activity Streams / equivalente do provedor |
| Retenção de audit logs | >= 5 anos (requisito fiscal) |

> **Auditoria em MySQL:** diferente do PostgreSQL (`pgaudit`), MySQL exige plugin específico ou feature do provedor cloud (RDS Database Activity Streams na AWS, Cloud SQL Audit Logs no GCP). Confirmar com Codebit qual é a estratégia disponível.

---

## 7. Anti-padrões proibidos

| Anti-padrão | Por que evitar |
| -------- | -------- |
| Tabelas compartilhadas entre serviços | Banco vira contrato implícito; regras de domínio divergem |
| Joins cross-database em queries de aplicação | Acopla serviços invisivelmente |
| Um serviço executando UPDATE/INSERT/DELETE no database do outro | Quebra a regra de ouro |
| Foreign keys cross-database entre tabelas de domínio dos serviços | Acoplamento permanente (em MySQL é tecnicamente possível mas proibido) |
| Triggers que escrevem no database vizinho | "Mágica" invisível, impossível de testar |

---

## 8. Padrões permitidos

| Padrão | Por que é OK |
| -------- | -------- |
| Read replica usada por BI (`readonly_bi`) consultando ambos databases | Read-only, sem mutação |
| Backup unificado | Operacional, não compromete isolamento de domínio |
| Outbox local em cada database (`legacy.outbox`, `core.outbox`) | Cada serviço dono do próprio outbox |
| Foreign keys **dentro** de cada database | São naturais e necessárias |
| Triggers internos a um database | OK desde que não cruzem fronteira |

---

## 9. Tipos de dados — convenções MySQL

Pra padronização interna do `core.*`:

| Conceito | Tipo MySQL recomendado |
| -------- | -------- |
| ID (UUID) | `CHAR(36)` (simples) ou `BINARY(16)` com `UUID_TO_BIN/BIN_TO_UUID` (espaço otimizado) |
| ID auto-increment (raro no novo) | `BIGINT UNSIGNED AUTO_INCREMENT` |
| Datetime com TZ | `DATETIME(6)` em UTC (MySQL não tem `TIMESTAMP WITH TIMEZONE`; converter na aplicação) |
| Boolean | `TINYINT(1)` |
| JSON | `JSON` (não há JSONB em MySQL) |
| Texto curto | `VARCHAR(255)` |
| Texto longo | `TEXT` ou `MEDIUMTEXT` |
| Money / Decimal | `DECIMAL(15, 2)` (nunca `FLOAT`/`DOUBLE` para valores financeiros) |
| Enum (estado pequeno) | `ENUM(...)` ou `VARCHAR` com check via aplicação (preferimos `VARCHAR` por flexibilidade) |

---

## 10. Tamanhos esperados (estimativa inicial)

| Database | Tamanho estimado em 6 meses | Crescimento mensal |
| -------- | -------- | -------- |
| `legacy` | Tamanho atual + ~5% (só leitura, pouca escrita) | Pequeno |
| `core` | Crescimento conforme BCs migrados | Médio na fase 1, alto a partir da fase 3 |

---

## 11. Referências

- [ADR-0013](./adr/0013-mysql-database-engine.md) — escolha do engine MySQL.
- [ADR-0014](./adr/0014-mysql-database-isolation.md) — isolamento por database.
- [ADR-0015](./adr/0015-mysql-outbox-pattern.md) — outbox em MySQL.
- [04-integration-events.md](./04-integration-events.md) — outbox como única ponte entre databases.
- [`../infrastructure/01-infra-handoff.md`](../infrastructure/01-infra-handoff.md) — provisionamento.
