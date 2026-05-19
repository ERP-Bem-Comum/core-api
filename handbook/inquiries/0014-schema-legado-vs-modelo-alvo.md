# Inquiry-0014: Schema legado real vs. modelo alvo do handbook

- **Status:** Open
- **Opened:** 2026-05-14
- **Opened by:** Gabriel Aderaldo
- **Asked to:** Banca interna (squad de arquitetura) + P.O.
- **Impact:** [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) (revisar), [Inquiry-0011](./0011-auditoria-fiscal-cross-periodo.md) (atualizar premissa), [`../domain/02-context-map.md`](../domain/02-context-map.md) (faltam BCs), [`../architecture/03-data-architecture.md`](../architecture/03-data-architecture.md) (collation real).

---

## 1. Contexto

Após receber o dump do banco legado (`Cloud_SQL_Export_2026-04-30 (15_09_35).sql`, 1.3MB) e extrair somente o schema (`schema-only.sql`, 49KB — sem dados pessoais, atende LGPD), foi feito o mapeamento sistemático das 32 tabelas contra o modelo alvo do handbook.

**Documento mestre da descoberta:** [`../domain/10-mapeamento-legado-schema.md`](../domain/10-mapeamento-legado-schema.md).

A análise revelou **discrepâncias estruturais** que precisam de decisão antes do início da implementação do `core-api`.

---

## 2. Achados confirmados (sem necessidade de decisão)

| # | Achado | Origem | Impacto |
| :- | :--- | :--- | :--- |
| C1 | Engine real é **MySQL 8.4.7-google** (Cloud SQL) | `mysqldump` header | Confirma legado em GCP e [ADR-0013](../architecture/adr/0013-mysql-database-engine.md). |
| C2 | Database real chama-se **`abc-erp-financeiro-prod`** | `mysqldump` header | Atualizar [`../architecture/03-data-architecture.md`](../architecture/03-data-architecture.md). |
| C3 | Collation real é **`utf8mb4_0900_ai_ci`**, não `utf8mb4_unicode_ci` | `CREATE DATABASE` no dump | Atualizar provisionamento. Diferença pequena mas relevante (0900_ai_ci = padrão MySQL 8, AI = accent-insensitive moderno). |
| C4 | ORM é **TypeORM 0.3** | Assinatura `FK_<hash>`, tabela `migrations`, tabela `query-result-cache` | Confirma [Inquiry-0010](./0010-mysql-engine-correction.md). Confirma também que adicionar `app.setGlobalPrefix('api/v1')` no NestJS legado é literalmente uma linha — viabiliza Hipótese A da [Inquiry-0012](./0012-bff-managed-api-gateway-vs-fastify.md). |
| C5 | **32 tabelas**, 0 views, 0 stored procedures, 0 triggers | `grep` no schema | Não há lógica escondida em DB — toda regra de negócio está no código aplicação. |
| C6 | Cardinalidade modesta (accounts AUTO_INCREMENT ≈ 6, dump total 1.3MB) | Inspeção | Sem pressão de performance — foco em modelagem correta. |

---

## 3. Achados que exigem decisão da banca

### Q1 — Ausência de campos NFe muda a base da Inquiry-0011?

**Achado:** o legado **não modela documento fiscal**. Não há chave NF-e (44 dígitos), número de documento original, série, modelo, CFOP ou imposto retido. O domínio é **"fluxo financeiro de obrigações"**, não **"documento fiscal soberano"**.

**Consequências:**

1. A "Hipótese D" da [Inquiry-0011](./0011-auditoria-fiscal-cross-periodo.md) (adiar com gatilho explícito + chave de correlação preservada hoje) **assumia** que existiria `numero_documento_original_legado` para preservar como ponte. Esse campo não existe.
2. [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) propõe adicionar 3 colunas (`numero_documento_original_legado`, `id_legado`, `cnpj_emitente`) em `core.fin_documentos`. Das três, apenas **`id_legado`** (FK simbólica) é preservável a partir do legado real.
3. As armadilhas listadas em [§7.3 da Inquiry-0011](./0011-auditoria-fiscal-cross-periodo.md) (CNPJ que se reorganiza, série fiscal, chave NF-e) **não se aplicam** — esses conceitos não existem no legado.

**Pergunta para banca:**

> **Q1.1.** A chave de correlação cross-período deve ser repensada como **"correlation by surrogate id + business event timestamp"** (id_legado + createdAt) em vez de chave fiscal natural?
>
> **Q1.2.** O ADR-0017 precisa ser revisado/superseded, ou apenas a justificativa precisa ser atualizada?
>
> **Q1.3.** A política de auditoria cross-período passa a depender de **manter o legado vivo + readonly** indefinidamente (o legado vira o "registro de obrigação histórica" e o core nasce com o conceito novo de Fato Gerador)? Isso muda o desenho do Strangler Fig.

> 💡 **Hipótese de trabalho do autor:** revisar ADR-0017 como `Superseded by ADR-0017a` (ou similar). Nova premissa: ID do legado é a única chave estável; auditoria cross-período exige **legado preservado em read-only** + **outbox legado → projeção `core.legacy_obligations_view`** (Reporting Database, Newman §3.5).

---

### Q2 — Como modelar `categorization`?

**Achado:** a tabela `categorization` tem 10 FKs e é o **hub analítico do legado**:

```
categorization
├── payableRelationalId      → payables       (UNIQUE)
├── receivableRelationalId   → receivables    (UNIQUE)
├── cardMovRelationalId      → cardMovimentation (UNIQUE)
├── bankRecordApiId          → bank-record-api (UNIQUE, cascade)
├── categoryId               → cost_centers_categories
├── subCategoryId            → cost_centers_sub_categories
├── costCenterId             → cost_centers
├── budgetPlanId             → budget_plans
└── programId                → programs
```

É a tabela onde **regras de rateio orçamentário estão implícitas**. O modelo alvo do handbook não tem nada equivalente — nem em [`02-context-map.md`](../domain/02-context-map.md), nem em [`contratos/`](../domain/contratos/).

**Pergunta para banca + P.O.:**

> **Q2.1.** Existe um **BC "Planejamento Orçamentário"** que deveria estar no handbook e foi omitido?
>
> **Q2.2.** Ou esse comportamento é uma **funcionalidade transversal** que será descontinuada/repensada no modelo novo (ex.: o orçamento passa a viver no `Contratos` via `budget_plans` ligado a `programs`, e a categorização vira evento derivado)?
>
> **Q2.3.** Sem decidir Q2, **não é possível migrar Financial Core** — `payables` e `receivables` aparecem em `categorization` e perderiam sentido analítico sem ela.

> 💡 **Hipótese de trabalho do autor:** abrir BC novo **`Planejamento Orçamentário`** (módulo Financeiro, supporting) cobrindo `cost_centers*` + `budget_*` + `programs` + `categorization`. Modelo alvo: agregado `PlanoOrcamentario` com VOs `CentroDeCusto`, `SubCategoria`, e operação `categorizarObrigacao(payable|receivable) → Rateio`.

---

### Q3 — `contracts` legado vs. "Contrato Mãe + Aditivos"

**Achado:** o legado representa hierarquia de contratos via `parentId` (self-FK). Não há:

- Tabela separada de "aditivo"
- Status de homologação documental
- Histórico de mudanças de valor/prazo com causa

O modelo alvo ([`../domain/contratos/04-aditivos-context.md`](../domain/contratos/04-aditivos-context.md)) **modela isso explicitamente** com aditivos homologados que disparam `EstadoContratualAtualizado`.

**Pergunta:**

> **Q3.1.** Para migrar `contracts` legados para o modelo alvo, o time aceita um **bootstrap one-shot** que cria 1 Contrato Mãe + N aditivos sintéticos "homologados" a partir do snapshot atual?
>
> **Q3.2.** Ou o legado fica vivo para "contratos anteriores ao corte" e o modelo novo só nasce para contratos novos pós-go-live? _(Aderente ao Strangler Fig, mas exige UI que apresente ambos.)_

---

### Q4 — Primeiro vertical slice

**Recomendação do autor (não bloqueia):** **Identity & Access** (`users` + `collaborators` + `collaborator_history` + `token` + `forgot_password`).

Razões:

- **Folha do grafo** — não depende de ninguém, todos dependem dele.
- **Agregado pequeno e bem definido** (~5 tabelas).
- **Chaves naturais já existem** (cpf, rg, email UNIQUE) → branded types do CLAUDE.md ficam triviais.
- **Desbloqueia auth/RBAC** do dia 1 (Zitadel + permissões).
- **Strangler limpo** — dá pra fazer write-through e migrar leitura aos poucos.

> **Q4.1.** Banca confirma Identity & Access como primeiro slice, ou prefere começar pela **Integração Bancária** (Bradesco/CNAB), conforme [`../domain/05-integracao-bancaria-context.md`](../domain/05-integracao-bancaria-context.md) e roadmap do handbook?

---

## 4. Próximos passos disparados pela inquiry

Independente da decisão da banca, foi disparado:

- [x] Documento mestre [`../domain/10-mapeamento-legado-schema.md`](../domain/10-mapeamento-legado-schema.md) publicado.
- [x] `database/.dump/schema-only.sql` extraído (sem dados pessoais, LGPD ok).
- [x] `.gitignore` criado bloqueando `database/.dump/` por completo.
- [ ] [`../architecture/03-data-architecture.md`](../architecture/03-data-architecture.md) atualizada com collation real (`utf8mb4_0900_ai_ci`) e nome real do database (`abc-erp-financeiro-prod`).
- [ ] [Inquiry-0011](./0011-auditoria-fiscal-cross-periodo.md) atualizada com Apêndice D (ausência de campos NFe).
- [ ] [`./PERGUNTAS-EM-ABERTO.md`](./PERGUNTAS-EM-ABERTO.md) atualizada com referência a esta inquiry.

---

## 5. Referências

- [`../domain/10-mapeamento-legado-schema.md`](../domain/10-mapeamento-legado-schema.md) — Documento mestre da descoberta (32 tabelas mapeadas).
- [`./0010-mysql-engine-correction.md`](./0010-mysql-engine-correction.md) — Correção de engine (MySQL).
- [`./0011-auditoria-fiscal-cross-periodo.md`](./0011-auditoria-fiscal-cross-periodo.md) — Auditoria cross-período (impactada).
- [`./0012-bff-managed-api-gateway-vs-fastify.md`](./0012-bff-managed-api-gateway-vs-fastify.md) — BFF (runtime confirmado).
- [`../architecture/adr/0017-correlation-keys-cross-period-audit.md`](../architecture/adr/0017-correlation-keys-cross-period-audit.md) — ADR de chaves de correlação (a revisar).
