[← Voltar ao README de Domínio](./README.md)

# 🗺️ Mapeamento do Schema Legado vs. Modelo Alvo

> **Status:** vigente | **Última revisão:** 2026-05-14
> **Fonte primária:** `database/.dump/schema-only.sql` (49KB, derivado de `Cloud_SQL_Export_2026-04-30 (15_09_35).sql`, 1.3MB original). Dados não foram extraídos (LGPD — somente DDL).

---

## 1. Objetivo

Documentar a **estrutura real** do banco legado e mapeá-la contra os **bounded contexts do modelo alvo** (`Financeiro` e `Contratos`). Este documento é a fonte canônica para:

- Decidir **qual BC migrar primeiro** no Strangler Fig (ver [`../architecture/01-migration-strategy.md`](../architecture/01-migration-strategy.md)).
- **Validar premissas** dos ADRs e inquiries (especialmente [ADR-0013](../architecture/adr/0013-mysql-database-engine.md), [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md), [Inquiry-0011](../inquiries/0011-auditoria-fiscal-cross-periodo.md), [Inquiry-0012](../inquiries/0012-bff-managed-api-gateway-vs-fastify.md)).
- **Identificar gaps** entre o legado e o modelo alvo (campos ausentes, conceitos não modelados).

---

## 2. Metadados do dump

| Item | Valor |
| :--- | :--- |
| Nome do database | `abc-erp-financeiro-prod` |
| Engine | MySQL **8.4.7-google** _(Google Cloud SQL — confirma legado em GCP)_ |
| Origem do dump | `mysqldump 10.13` em Linux x86_64, host `127.0.0.1` (dentro do Cloud SQL) |
| Data do dump | 2026-04-30 às 15:09:35 |
| Tamanho original | 1.3MB (com dados) → 49KB (somente schema) |
| Charset / Collation | `utf8mb4` / **`utf8mb4_0900_ai_ci`** _(default MySQL 8, não `utf8mb4_unicode_ci`)_ |
| Tabelas | **32** |
| Views / procedures / triggers | **0** |
| INSERTs no dump | 23 (extended-insert; só linhas com dados, fora do schema-only) |
| ORM detectado | **TypeORM** (assinatura: nomes `FK_<hash>`, `IDX_<hash>`, `REL_<hash>`; tabelas `migrations` e `query-result-cache`) |

> ⚠️ **Collation diverge do registrado em [`../architecture/03-data-architecture.md`](../architecture/03-data-architecture.md) §2.** Documento aceita ambas (`utf8mb4_unicode_ci` ou `utf8mb4_0900_ai_ci`), mas a realidade é `utf8mb4_0900_ai_ci`. Atualizado neste documento; vale propagar pra qualquer script de provisionamento.

---

## 3. Inventário das 32 tabelas

Agrupadas por bounded context implícito do legado:

### 3.1. Identity & Access (5 tabelas)
| Tabela | Chaves UNIQUE relevantes | FKs entrando |
| :--- | :--- | :--- |
| `users` | `email`, `cpf` | → `collaborators.id` |
| `collaborators` | `email`, `cpf`, `rg` | (raiz) |
| `collaborator_history` | — | → `collaborators.id` (cascade) |
| `token` | — | (sem FK) |
| `forgot_password` | `token`, `userId` | → `users.id` |

### 3.2. Financial Core — movimentação (8 tabelas)
| Tabela | Chaves UNIQUE relevantes | FKs externas relevantes |
| :--- | :--- | :--- |
| `accounts` | — | (raiz; auto_increment até 6 = ~5 contas) |
| `payables` | — | → `contracts`, `collaborators`, `accounts`, `suppliers` |
| `receivables` | **`identifierCode`** | → `financiers`, `contracts`, `accounts` |
| `installments` | `relatedLiquidInstallmentId` (self) | → `payables`, `receivables`, `bank-reconciliation`, self |
| `bank-reconciliation` | `recordSystemId`, `transferedById`, `recordApiId` | → `accounts`, `installments`, `bank-record-api` |
| `bank-record-api` | — | (raiz; alimentado por extratos OFX) |
| `creditCard` | — | → `accounts` (set null) |
| `cardMovimentation` | — | → `payables`, `creditCard` |

### 3.3. Chart of Accounts / Categorization (4 tabelas)
| Tabela | Observação |
| :--- | :--- |
| `cost_centers` | FK → `budget_plans` (cascade) |
| `cost_centers_categories` | FK → `cost_centers` (cascade) |
| `cost_centers_sub_categories` | FK → `cost_centers_categories` (cascade) |
| **`categorization`** | **Hub analítico — 10 FKs.** Liga `payables` / `receivables` / `cardMovimentation` / `bank-record-api` a `cost_centers` + `budget_plans`. Tabela com maior densidade de regra de negócio implícita. |

### 3.4. Budgeting & Planning (5 tabelas)
| Tabela | Observação |
| :--- | :--- |
| `budget_plans` | Hierárquico (self-FK `parentId`). UNIQUE: `(year, programId, version, parentId)` |
| `budgets` | UNIQUE: `(budgetPlanId, partnerMunicipalityId)` E `(budgetPlanId, partnerStateId)` — orçamento por município OU estado |
| `budget_results` | UNIQUE: `(budgetId, costCenterSubCategoryId, month)` — realizado mensal |
| `share_budget_plans` | Compartilhamento externo (username/password próprio, fora de Identity) |
| `programs` | UNIQUE: `abbreviation` |

### 3.5. Contracts & Counterparties (3 tabelas)
| Tabela | Observação |
| :--- | :--- |
| `contracts` | Hierárquico (self-FK `parentId`). FKs → `budget_plans`, `suppliers`, `programs`, `collaborators`, `financiers` |
| `suppliers` | UNIQUE: `cnpj` |
| `financiers` | UNIQUE: `cnpj` _(quem financia — vinculado a receivables)_ |

### 3.6. Workflow & Audit (3 tabelas)
| Tabela | Observação |
| :--- | :--- |
| `approvals` | Sobre `payables` (cascade). Aprovação por `users` ou `collaborators` |
| `history` | Audit log — FK → `contracts`, `users` |
| `files` | Anexos polimórficos — FK → `payables`, `receivables`, `contracts` |

### 3.7. Geography — lookup (2 tabelas)
| Tabela | Observação |
| :--- | :--- |
| `partner_states` | UNIQUE: `name`, `abbreviation` |
| `partner_municipalities` | UNIQUE: `(name, uf)` e `cod` _(provavelmente código IBGE de 7 dígitos)_ |

### 3.8. Infraestrutura TypeORM (2 tabelas, não-domain)
| Tabela | Observação |
| :--- | :--- |
| `migrations` | Histórico de migrations do TypeORM |
| `query-result-cache` | Cache nativo do TypeORM (raramente usado em produção; pode estar zerado) |

---

## 4. Mapeamento legado → módulos alvo

| Tabela legada | Módulo alvo | BC alvo | Comentário |
| :--- | :--- | :--- | :--- |
| `users`, `collaborators`, `collaborator_history`, `token`, `forgot_password` | **Compartilhado** | RBAC / Identity | Migra cedo (folha do grafo de FKs). Candidato a primeiro vertical slice. |
| `accounts`, `bank-reconciliation`, `bank-record-api` | 💰 Financeiro | Integração Bancária | Encaixa em [`05-integracao-bancaria-context.md`](./05-integracao-bancaria-context.md). |
| `payables`, `receivables`, `installments` | 💰 Financeiro | Títulos e Liquidação | Encaixa em [`04-titulos-liquidacao-context.md`](./04-titulos-liquidacao-context.md). **Gap:** legado não tem o conceito de "Documento Fiscal selado" — só de obrigação financeira direta. |
| `creditCard`, `cardMovimentation` | 💰 Financeiro | Títulos e Liquidação (sub-fluxo) | Sub-fluxo de cartão; pode virar VO dentro de Título ou BC próprio menor. |
| `cost_centers*`, `categorization`, `budget_plans`, `budget_results`, `share_budget_plans`, `budgets`, `programs` | 💰 Financeiro | _(BC novo a definir)_ **Planejamento Orçamentário** | **Não previsto no handbook atual.** Não há BC para "orçamento" em [`02-context-map.md`](./02-context-map.md). Esse é provavelmente o maior gap de modelagem. |
| `contracts` | 📦 Contratos | Gestão de Contratos | Encaixa em [`contratos/03-gestao-contratos-context.md`](./contratos/03-gestao-contratos-context.md). **Gap:** legado não distingue "Contrato Mãe + Aditivos" (usa self-FK `parentId`); precisa ser desnormalizado pro modelo alvo. |
| `suppliers`, `financiers` | 📦 Contratos | Gestão de Contratos | Counterparties — podem virar entidades do Contratos ou BC compartilhado pequeno. |
| `approvals`, `history`, `files` | **Compartilhado** | Auditoria + Anexos | Atende ao "trilha de auditoria transversal" dos princípios. `files` é polimórfico (payable/receivable/contract). |
| `partner_states`, `partner_municipalities` | **Compartilhado** | Lookup (Kernel) | Tabelas de referência — viram seed estático no `core` ou um pequeno serviço. |
| `migrations`, `query-result-cache` | — | (não migra) | Infra TypeORM — sai com a aplicação legada. |

---

## 5. Gaps estruturais entre legado e modelo alvo

### 5.1. ❌ Não há campos de NFe / documento fiscal
O legado **não modela documento fiscal** como cidadão de primeira classe. Não existe:

- Chave NF-e de 44 dígitos
- Número de documento original
- Série / modelo
- CFOP, regime tributário
- Imposto retido detalhado por tipo

O domínio do legado é **"fluxo financeiro de obrigações"**, não **"documento fiscal sob soberania"**. O modelo alvo (`fin_documentos` como Fato Gerador soberano) é um conceito **novo**, não uma migração.

> 📎 **Impacto direto em [Inquiry-0011](../inquiries/0011-auditoria-fiscal-cross-periodo.md) §7.3:** as armadilhas listadas (CNPJ que se reorganiza, série fiscal, chave NF-e 44 dígitos) **não se aplicam ao legado** porque esses conceitos não existem lá. A "chave de correlação cross-período" do [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) precisa ser revisitada — não há `numero_documento_original_legado` no legado, porque não há documento original.

> 📎 **Candidato a chave de correlação:** `receivables.identifierCode` (UNIQUE). Para `payables`/`installments` **não há chave natural única** — só FKs combinadas (`supplierId` + `contractId` + valores). Precisa decisão da banca.

### 5.2. ❌ Não há outbox
Nenhuma tabela `outbox`, `outbox_dead_letter` ou equivalente. O modelo de comunicação cross-módulo via evento ([ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md)) é **completamente novo**.

### 5.3. ❌ Não há máquinas de estado explícitas
Não há colunas `status` com enum bem definido cruzando todos os agregados. Cada feature parece ter resolvido isolado. O documento [`09-status-maquina-estados.md`](./09-status-maquina-estados.md) descreve um modelo alvo que **não tem equivalente direto no legado** — máquinas de estado são uma adição do modelo novo, não migração.

### 5.4. ❌ Não há "Contrato Mãe + Aditivo formalizado"
`contracts` usa `parentId` (self-FK) para indicar hierarquia, mas não há tabela separada de "aditivo" com status de homologação. Para migrar pro modelo alvo de Contratos é preciso:

- Tratar `contracts` raiz (parentId NULL) como Contrato Mãe.
- Tratar `contracts` filhos como aditivos legados.
- Reconstituir "Estado Vigente" derivado a partir do snapshot atual.
- A homologação documental do aditivo provavelmente **não está modelada** no legado — só o resultado.

### 5.5. ⚠️ `categorization` é o maior risco de subestimação
10 FKs entrando/saindo. **A regra de rateio orçamentário está implícita aqui.** Antes de migrar Financial Core é obrigatório:

- Ler o código que escreve em `categorization` no legado.
- Documentar as regras de rateio (cost_center × sub_category × budget_plan × program).
- Modelar isso explicitamente no BC Planejamento Orçamentário (gap §4).

### 5.6. ⚠️ Hierarquias (`parentId`) em `budget_plans` e `contracts`
Self-FK preserva história via versionamento (`budget_plans.version`) ou hierarquia (`contracts.parentId`). O modelo alvo usa **eventos** (`EstadoContratualAtualizado`, `EstadoOrcamentárioAtualizado`?) — exige reverse engineering das regras de versionamento.

---

## 6. Achados positivos (o que ajuda a migração)

### 6.1. ✅ Integridade referencial forte
**Todas as FKs estão presentes e nomeadas.** Não há "FKs implícitas via convenção" — TypeORM gerou. Isso significa que o grafo de dependências é confiável e dá pra ordenar a migração corretamente:

```
Folhas (migrar primeiro): users/collaborators, accounts, suppliers, financiers,
                          programs, partner_states/municipalities
       ↓
Camada 2: contracts, budget_plans, cost_centers, creditCard
       ↓
Camada 3: payables, receivables, budgets, budget_results
       ↓
Camada 4: installments, cardMovimentation, bank-reconciliation, files
       ↓
Topo: categorization, approvals, history (consumidores agregadores)
```

### 6.2. ✅ Chaves naturais relevantes existem
- `collaborators`: `cpf`, `rg`, `email` (todos UNIQUE)
- `suppliers`, `financiers`: `cnpj`
- `partner_municipalities`: `cod` (IBGE)
- `programs`: `abbreviation`
- `receivables`: `identifierCode`

Modelar branded types (`type CPF = Brand<string, 'CPF'>`, etc.) no domínio novo é direto.

### 6.3. ✅ Cardinalidade modesta
Pelo `AUTO_INCREMENT` visível em `accounts` (≈6), pelo tamanho do dump completo (1.3MB com dados de uma operação real), **a base é pequena**. Não há pressão de performance para o desenho inicial — o foco é correção de modelagem, não otimização.

### 6.4. ✅ TypeORM 0.3 + `mysql2` confirmados
Alinha com [Inquiry-0010](../inquiries/0010-mysql-engine-correction.md) e [ADR-0013](../architecture/adr/0013-mysql-database-engine.md). A "uma linha pra adicionar prefixo de rota" da [Inquiry-0012 §6.1](../inquiries/0012-bff-managed-api-gateway-vs-fastify.md) é literal — `app.setGlobalPrefix('api/v1')` no `main.ts` do NestJS resolve.

---

## 7. Recomendações imediatas

| # | Ação | Onde | Responsável |
| :- | :--- | :--- | :--- |
| R1 | Reescrever [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) considerando que **não existe** `numero_documento_original` no legado | ADR superseded ou revisado | Autor + banca interna |
| R2 | Abrir **BC novo "Planejamento Orçamentário"** no [`02-context-map.md`](./02-context-map.md) e modelar `cost_centers*` + `budget_*` + `categorization` | `domain/11-planejamento-orcamentario-context.md` (a criar) | Autor + P.O. |
| R3 | Atualizar [`../architecture/03-data-architecture.md`](../architecture/03-data-architecture.md) com collation real (`utf8mb4_0900_ai_ci`) e nome do database (`abc-erp-financeiro-prod`) | Data architecture §2 | Autor |
| R4 | Reverse-engineer as regras de rateio em `categorization` lendo o código fonte do legado | (próximo ciclo) | Autor + P.O. |
| R5 | Decidir primeiro vertical slice — recomendação: **Identity & Access** (5 tabelas folha, desbloqueia auth) | [ADR a abrir] | Banca |

---

## 8. Referências cruzadas

- [`./02-context-map.md`](./02-context-map.md) — Mapa de contextos do módulo Financeiro (modelo alvo).
- [`./contratos/02-context-map.md`](./contratos/02-context-map.md) — Mapa de contextos do módulo Contratos.
- [`../architecture/01-migration-strategy.md`](../architecture/01-migration-strategy.md) — Strangler Fig.
- [`../architecture/03-data-architecture.md`](../architecture/03-data-architecture.md) — Arquitetura de dados.
- [`../inquiries/0010-mysql-engine-correction.md`](../inquiries/0010-mysql-engine-correction.md) — Correção MySQL.
- [`../inquiries/0011-auditoria-fiscal-cross-periodo.md`](../inquiries/0011-auditoria-fiscal-cross-periodo.md) — Auditoria cross-período (impactada).
- [`../inquiries/0012-bff-managed-api-gateway-vs-fastify.md`](../inquiries/0012-bff-managed-api-gateway-vs-fastify.md) — BFF (confirmação de runtime).
- `database/.dump/schema-only.sql` — Schema bruto (não versionado).
