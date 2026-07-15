# Research — Feature 036: Orçamento mensal (#413)

> Fase 0 do `/speckit-plan`. Resolve as decisões técnicas listadas em `spec.md` §"Próximo passo spec-kit".
> Todas as afirmações sobre o estado atual foram **medidas no código/banco**, não presumidas.

## D1 — Forma relacional da dimensão mensal: **linha por mês**

**Decisão:** `bgp_budget_results` ganha a coluna `month TINYINT NOT NULL` (1..12 + CHECK). Cada `(rede, subcategoria, mês)` é **uma linha**. O grid de 12 colunas é **apresentação**, montada na leitura.

**Rationale:**

- **Normalização.** 12 colunas (`jan_cents`, `fev_cents`, …) é um _repeating group_ — viola a 1NF. "Mês" é um **valor**, não um nome de coluna.
- **Acrescentar mês não exige DDL.** Com coluna-por-mês, qualquer mudança de calendário vira `ALTER TABLE`.
- **Indexável.** `WHERE month = ?` (o passador de mês, US2) usa índice. Com coluna-por-mês, "total de março" seria `SUM(mar_cents)` — não generalizável.
- **Agregação anual é trivial e única:** `SUM(value_cents) … GROUP BY subcategory_id` — atende o FR-007 (anual = soma dos meses) sem segunda fonte de verdade.
- **Coerente com o módulo:** todas as tabelas `bgp_*` são normalizadas; nenhuma usa colunas repetidas.
- **O `model` continua por linha**, o que permite (sem custo extra) o edge case "troca de modelo entre meses" registrado na spec.

**Alternativas rejeitadas:**

| Alternativa                                                 | Por que não                                                                                                                     |
| :---------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **12 colunas** (`jan_cents`…`dez_cents`)                    | Repeating group (1NF); DDL para mudar calendário; `month` deixa de ser filtrável; `model` teria de ser replicado 12× ou perdido |
| **JSON de 12 posições** (sugerido na issue #413, "opção 1") | **PROIBIDO** — ADR-0020 veta JSON nativo. Registrado na spec §"Impacto Arquitetural"                                            |
| **Tabela separada** `bgp_budget_result_months`              | Cria um agregado sem identidade própria; o valor mensal **é** o `BudgetResult`, não um filho dele                               |

**Tipo:** `TINYINT` (1..12 cabe em 1 byte) + `CHECK (month BETWEEN 1 AND 12)` — sem ENUM nativo (ADR-0020).

---

## D2 — Chave única e escrita idempotente: **`UNIQUE (budget_id, subcategory_id, month)` + `ON DUPLICATE KEY UPDATE`**

**Decisão:** criar `uniqueIndex('bgp_budget_results_budget_subcategory_month_uq').on(budgetId, subcategoryId, month)` e trocar o `add` (INSERT puro) por um **upsert** via `ON DUPLICATE KEY UPDATE`.

### 🔴 Achado: um bug de contagem em dobro **já existe hoje**, e esta feature o corrige

Medido no código (não presumido):

```ts
// application/use-cases/add-budget-result.ts:56-66 — SEMPRE gera id novo, SEMPRE insere
const result = BudgetResult.create({ id: BudgetResultId.generate(), … });
const saved = await deps.budgetResultRepo.add(result.value);

// adapters/persistence/repos/budget-result-repository.drizzle.ts:32-35 — INSERT puro, sem upsert
add: async (result) => safe('add', async () => {
  await db.insert(schema.budgetResults).values(budgetResultToInsert(result));
}),
```

E o schema **não tem nenhum `uniqueIndex`** — só `budget_id_idx` e `subcategory_id_idx` (`schemas/mysql.ts:225-227`). O repo **não tem update**: só `add`, `listByBudgetId`, `deleteByBudgetId`.

**Consequência atual:** rodar o mesmo cálculo duas vezes para `(budget, subcategoria)` grava **duas linhas** com ids diferentes. O `listByBudgetId` devolve as duas, e **o total por Rede conta em dobro**. Não há guard em nenhuma camada.

Não estourou ainda porque **nenhum ambiente tem plano** (spec §"Verificação de volume": zero linhas em dev e QA — causa: #374).

**Isto está no escopo desta feature, não é scope-creep:** a chave que o mês exige — `(budget_id, subcategory_id, month)` — **contém** o par que hoje está desprotegido. Corrigir junto é consequência da modelagem correta, e separar exigiria migrar duas vezes a mesma tabela.

### Por que `ON DUPLICATE KEY UPDATE` e não SELECT-then-UPDATE-or-INSERT

- **Atômico** — sem janela de corrida entre o SELECT e o INSERT. Relevante: dois planejadores podem recalcular o mesmo mês (edge case "Concorrência" da spec).
- **Permitido explicitamente** por ADR-0020 (§"Lista normativa" — `ON DUPLICATE KEY UPDATE` está entre as features permitidas).
- **Já é padrão no projeto** para escrita idempotente por chave natural: `payable-view-store.drizzle.ts`, `supplier-view-store.drizzle.ts`, `cedente-account-store.drizzle.ts`, `rejected-suggestion-repository.drizzle.ts`, `amendment-repository.drizzle.ts`.
- **A convenção "SELECT-then-UPDATE-or-INSERT" do módulo é de outra tabela e outro motivo:** o comentário em `schemas/mysql.ts:32-34` a aplica a `bgp_budget_plans`, que **não é replace-all** e cujo save reconstrói um agregado inteiro. Aqui a escrita é de **uma linha endereçada por chave natural** — caso canônico de upsert.

**Semântica:** ao recalcular, `value_cents` e `model` são sobrescritos; o `id` da linha existente é **preservado** (não se gera novo). Isso mantém o FR-004 (alterar um mês não afeta os outros) e o FR-011 (zero informado ≠ não orçado — "não orçado" é a **ausência de linha**).

---

## D3 — Contrato HTTP: `month` no alvo, herdado pelos 4 modelos

**Decisão:** `budgetResultTargetSchema` ganha `month`; os 4 POSTs herdam por `.extend()`, sem tocar nos inputs de cada modelo.

```ts
// adapters/http/schemas.ts — hoje (:282-285 na dev)
const budgetResultTargetSchema = z.object({ budgetId: z.uuid(), subcategoryId: z.uuid() });
// passa a:
const budgetResultTargetSchema = z.object({
  budgetId: z.uuid(),
  subcategoryId: z.uuid(),
  month: z.int().min(1).max(12), // ← única adição; herdada por ipca/caed/personal/logistics
});
```

**Rationale:** é exatamente o que a #454 pede — _"o mês precisa entrar no contrato, não só no armazenamento"_ — e destrava os 4 formulários de "Calculando Gastos", hoje órfãos porque 12 POSTs colidiriam na mesma chave.

**Breaking, e aceito sem versionamento:** a spec mede **zero planos em todos os ambientes**, logo não há cliente com dado a preservar; e o front já espera o campo (#454). Versionar seria cerimônia sobre o vazio.

`z.int()` (não `z.coerce`) no body: o front envia JSON; coerção mascararia `"banana"` → erro tardio. Na **query** do grid (se houver filtro de mês) usa-se `z.coerce.number().int().min(1).max(12)`, seguindo o padrão já vigente em `listBudgetPlansQuerySchema`.

**Leitura do grid:** `GET /budget-plans/:id/budgets/:budgetId/budget-results` devolve os resultados da rede com `month`; o front monta as 12 colunas. Sem filtro obrigatório de mês — o volume por rede é pequeno (ver D4), então uma ida traz o ano inteiro e o "passador de mês" (US2) é navegação **client-side**, sem round-trip. Filtro opcional `?month=` fica disponível para quem quiser.

---

## D4 — Cardinalidade (SC-006)

| Recorte                                                   |             Linhas |
| :-------------------------------------------------------- | -----------------: |
| **Grid de uma rede** (o que a tela carrega)               | subcategorias × 12 |
| Pior caso realista por rede (158 subcategorias do legado) |          **1.896** |
| Plano inteiro, 27 estados × 158 × 12                      |            ~51.192 |

**Conclusão:** o grid — que é **por rede**, uma de cada vez (Assumption da spec) — carrega ~1.9k linhas no pior caso do legado. É trivial para MySQL com o índice `(budget_id, month)`. O plano inteiro (~51k) só é tocado por agregação (`SUM … GROUP BY`), nunca materializado na tela.

**Índices:** o `uniqueIndex (budget_id, subcategory_id, month)` já serve como índice de prefixo para `WHERE budget_id = ?` — o `budget_id_idx` atual **torna-se redundante** e deve ser removido na mesma migration. O `subcategory_id_idx` permanece (query "por subcategoria", CA3 do #317).

---

## D5 — Spec 030: só o Success Criteria de paridade

**Decisão:** alterar **apenas** `specs/030-budget-plans-reproducao/spec.md:74`. O `FR-003` (cálculo server-side como fonte única) **fica intacto** — o FR-008 desta spec o preserva.

O `:74` diz _"Os 4 modelos de cálculo reproduzem o legado (teste de paridade contra Apêndice B)"_. Precisa distinguir:

- **Paridade de fórmula:** continua exigida (o cálculo segue persistindo).
- **Paridade de grão:** abandonada por decisão (FR-013) — o legado orça em `categoria × mês`; esta feature orça em `subcategoria × mês`.

---

## D6 — ✅ A clarification da 030 foi RESOLVIDA (P.O., #460)

`specs/030-budget-plans-reproducao/spec.md:37`:

> **⚠️ Clarification pendente:** na folha (`DESPESAS_PESSOAIS`) a UI mostra "Qtd de {subcategoria}", mas a fórmula legada **não multiplica por quantidade** (metadado) — confirmar antes do W1.

**Por que volta a ser bloqueante:** o FR-008 mantém o cálculo **persistindo**. Uma divergência de fórmula **corrompe dado real** — e agora 12× por conta, não 1×. Se o cálculo fosse preview (a leitura errada que a spec 036 descartou), uma divergência seria cosmética.

**RESOLVIDA em 2026-07-15 (#460): (A) — a Qtd é metadado, não multiplica.** Segue o legado; o front é que se ajusta (web-app PR #241). **O backend já estava certo** — a quantidade nunca foi parâmetro do `CalcModelInput`. A trava entrou como teste de paridade contra o print do legado (Qtd 1, R$ 34.336,73 → anual R$ 412.040,76) em `calc-model.test.ts`. **Não bloqueia mais nada.** A spec 030 `:74` não muda: a paridade de fórmula continua valendo para este modelo.

---

## Resumo das decisões

| #      | Decisão                                                                 | Efeito                                                                |
| :----- | :---------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **D1** | Linha por mês (`month TINYINT` + CHECK)                                 | Normalizado; mês filtrável; sem DDL futuro                            |
| **D2** | `UNIQUE (budget_id, subcategory_id, month)` + `ON DUPLICATE KEY UPDATE` | Idempotência real; **corrige bug de contagem em dobro pré-existente** |
| **D3** | `month` em `budgetResultTargetSchema`                                   | Destrava os 4 formulários órfãos; breaking aceito (zero dado)         |
| **D4** | Grid por rede (~1.9k linhas)                                            | SC-006 atendido; `budget_id_idx` vira redundante                      |
| **D5** | 030: só o SC `:74`                                                      | FR-003 preservado                                                     |
| **D6** | Clarification da 030 volta a bloquear                                   | Bloqueia W1 de `DESPESAS_PESSOAIS`, não o tasks                       |
