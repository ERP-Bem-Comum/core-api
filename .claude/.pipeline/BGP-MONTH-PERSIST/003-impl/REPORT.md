# W1 — Implementação GREEN · BGP-MONTH-PERSIST (#413)

**Agente/Skill:** `drizzle-schema-author` (schema/migration) + `ts-domain-modeler` (agregado) · **Outcome:** **GREEN** · **Data:** 2026-07-15

## Resultado

```
in-memory + agregado : ℹ tests 14 · pass 14 · fail 0
MySQL real (9/9)     : ℹ tests  9 · pass  9 · fail 0
typecheck            : 0 erros
```

## ⚠️ Escopo ampliado durante o W1 — a fatia absorveu a **escrita HTTP**

O escopo previa parar no repositório. **Não é possível:** o `month` obrigatório atravessa **as três camadas de uma vez**.

```
add-budget-result.ts:56  → BudgetResult.create exige month  → command precisa de month
plugin.ts:392,415,439,475 → os 4 POSTs passam o command      → schema Zod precisa de month
```

O typecheck reprovou nos 4 handlers. Não há saída limpa: manter o command sem `month` exigiria um valor inventado no use case (gambiarra), e deixar o typecheck vermelho viola o gate W3 (§II).

**Decisão:** absorver `month` no `budgetResultTargetSchema` + os 4 handlers. **Isso alinha com o `tasks.md`**, que já mapeava a **US1 = persistência + HTTP escrita** (T018–T021) — era o fatiamento de *tickets* do `plan.md` que estava mais granular que a realidade do tipo. A fatia 3 (`BGP-MONTH-HTTP`) fica com a **leitura do grid** (US2): `month` na response e `?month=` na query.

**Lição (2ª vez nesta feature):** mudança de assinatura de agregado **não se fatia por camada** — o tipo vaza para todos os call sites de uma vez. O fatiamento útil aqui é por **vertical slice** (escrita × leitura), não por camada. Mesma lição do #373.

## Entregue

| Camada | Arquivo | Mudança |
| :--- | :--- | :--- |
| Domínio | `budget-result.ts` | `+month` em `BudgetResult`, `CreateBudgetResultParams`, `create` e **`clone`** (copia da origem) |
| Domínio | `budget-result/repository.ts` | `add` → **`save`** (a semântica deixou de ser "acrescentar") |
| Persistência | `schemas/mysql.ts` | `+month tinyint NOT NULL`, `+CHECK 1..12`, **`+UNIQUE (budget_id, subcategory_id, month)`**, **−`budget_id_idx`** (redundante) |
| Persistência | `migrations/mysql/0006_same_jigsaw.sql` | **gerada** por `db:generate:budget-plans` |
| Persistência | `budget-result.mapper.ts` | `month` no insert; `ExerciseMonth.rehydrate` na leitura → `budget-result-corrupt` |
| Persistência | `budget-result-repository.drizzle.ts` | `INSERT` puro → **`ON DUPLICATE KEY UPDATE`** |
| Persistência | `budget-result-repository.in-memory.ts` | upsert por chave composta, **paridade** com o drizzle |
| Application | `add-budget-result.ts` | `+month` no command + `ExerciseMonth.parse`; `repo.add` → `repo.save` |
| Application | `clone-plan-content.ts` | `repo.add` → `repo.save` |
| Borda | `http/schemas.ts` | `+month: z.int().min(1).max(12)` em `budgetResultTargetSchema` (herdado pelos 4 modelos) |
| Borda | `http/plugin.ts` | os 4 handlers repassam `month` |
| Testes | 5 arquivos | `month` nas fixtures + `add` → `save` |

## A migration (gerada, revisada — nunca escrita à mão)

```sql
DROP INDEX `bgp_budget_results_budget_id_idx` ON `bgp_budget_results`;
ALTER TABLE `bgp_budget_results` ADD `month` tinyint NOT NULL;
ALTER TABLE `bgp_budget_results` ADD CONSTRAINT `bgp_budget_results_budget_subcategory_month_uq` UNIQUE(`budget_id`,`subcategory_id`,`month`);
ALTER TABLE `bgp_budget_results` ADD CONSTRAINT `bgp_budget_results_month_chk` CHECK (`bgp_budget_results`.`month` BETWEEN 1 AND 12);
```

4 statements, nada a mais. `ADD month NOT NULL` **sem default** é seguro porque a tabela está vazia em todos os ambientes (greenfield — causa: #374).

## Validação em MySQL real (x99 offline → OrbStack)

**Método** (o `pnpm test:integration:*` **destruiria a infra dev** — `docker compose up` + _"SEMPRE derruba e limpa"_): `docker stop core-api-mysql` → MySQL avulso 8.4 na 3306 com a senha do teste → validação → `docker rm -f` → `docker start core-api-mysql`. **Volume dev intacto** (69 tabelas conferidas depois).

**Estrutura confirmada no banco:**

```
UNIQUE KEY `bgp_budget_results_budget_subcategory_month_uq` (`budget_id`,`subcategory_id`,`month`)   ← 3 colunas
`month` tinyint NOT NULL
CONSTRAINT `bgp_budget_results_month_chk` CHECK ((`month` between 1 and 12))
```

`bgp_budget_results_budget_id_idx` **não existe mais** — como previsto, o UNIQUE é o índice de prefixo.

**CA4 provado com INSERT direto:**

```
month=13 → ERROR 3819 (HY000): Check constraint 'bgp_budget_results_month_chk' is violated.
month=0  → ERROR 3819 (HY000): Check constraint 'bgp_budget_results_month_chk' is violated.
```

## Critérios de aceite

| CA | Estado | Evidência |
| :-- | :--- | :--- |
| **CA1** — insere quando não existe | ✅ | round-trip preserva cents, model e mês (MySQL real) |
| **CA2** — **recalcular ATUALIZA, não duplica** | ✅ | 1 linha, `id` preservado, valor novo (MySQL real) |
| **CA3** — 12 meses coexistem, `SUM` = ×12 | ✅ | 12 linhas, **4.405.104** centavos (MySQL real) |
| **CA4** — CHECK rejeita mês inválido | ✅ | `ERROR 3819` em 13 e 0 |
| **CA5** — row corrompida → `budget-result-corrupt` | ✅ | `ExerciseMonth.rehydrate` no mapper |
| **CA6** — `create` sem `month` = erro de tipo | ✅ | typecheck |
| **CA7** — meses distintos = entidades distintas | ✅ | agregado |
| **CA8** — `clone` preserva o mês | ✅ | agregado |
| **CA9** — **paridade in-memory ↔ drizzle** | ✅ | **a mesma suíte roda nos dois**, 9/9 em cada |

## Decisões de implementação

- **`ON DUPLICATE KEY UPDATE` com `set: { valueCents, model }`** — o `id` fica **fora** do SET de propósito: recalcular sobrescreve o valor, nunca a identidade da linha. O in-memory replica isso (`{ ...result, id: previous.id }`).
- **Escolhido sobre SELECT-then-UPDATE-or-INSERT:** atômico (sem janela de corrida entre dois planejadores recalculando o mesmo mês), permitido pelo ADR-0020 e já padrão no projeto (5 repos). A convenção SELECT-then-* do módulo é do `bgp_budget_plans`, que reconstrói um agregado inteiro — aqui a escrita é de **uma linha por chave natural**.
- **`z.int()` e não `z.coerce`** no body: é JSON; coerção mascararia `"banana"` → `NaN`.
- **`clone` copia o mês da origem** — clonar move o lançamento de orçamento, nunca de mês.

## Próxima wave

**W2** — `code-reviewer` (read-only, máx 3 rounds).
