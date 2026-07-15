# W2 — Code Review (read-only) · BGP-MONTH-PERSIST (#413)

**Agente/Skill:** `code-reviewer` · **Data:** 2026-07-15

## Round 1 — **REJECTED**

### 🔴 Blocker-1 — A response devolve um `id` que não existe no banco (recálculo)

**Arquivos:** `application/use-cases/add-budget-result.ts:56-70` · `adapters/persistence/repos/budget-result-repository.drizzle.ts:32-44`

**A cadeia:**

```ts
// 1. use case: SEMPRE gera id novo
const result = BudgetResult.create({ id: BudgetResultId.generate(), … });

// 2. adapter: o upsert preserva o id EXISTENTE (id fica fora do SET, deliberadamente)
.onDuplicateKeyUpdate({ set: { valueCents: row.valueCents, model: row.model } })

// 3. use case: retorna o objeto criado — com o id NOVO
return ok(result.value);

// 4. borda: serializa esse id
budgetResultToDto(result) // → { id: <NOVO>, … }   ← e o schema EXPÕE o id (schemas.ts:357)
```

**Falha concreta:** o planejador recalcula março. O banco mantém a linha com `id = Y`; a resposta **201** devolve `id = X`. **X não existe em lugar nenhum.** Se o front guardar esse id (key de lista, um `DELETE` futuro), ele aponta para o vazio.

**Por que passou nos testes:** a suíte do repositório verifica o **banco** (`id` preservado — correto) e a do use case verifica o `Result` (id novo — também "correto"). **Ninguém compara os dois.** É a lacuna clássica de contrato entre camadas.

**Introduzido nesta fatia:** antes o `add` era INSERT puro — o id retornado sempre existia (às custas de duplicar a linha, o outro defeito). Ao consertar a duplicação, criei a mentira.

**Correção exigida:** o `save` deve devolver **o que foi efetivamente persistido**, não o que se pediu para persistir. `save: (result) => Promise<Result<BudgetResult, E>>`, e o use case retorna esse valor.

**Alternativa rejeitada** — colocar `id` no SET (`set: { id, valueCents, model }`), fazendo o id novo vencer: deixaria a response verdadeira e é mais barato (sem SELECT extra), **mas troca a identidade da linha a cada recálculo**, sem necessidade. O `id` é surrogate; a identidade de negócio é `(budget, subcategoria, mês)`. Churn de identidade por conveniência de implementação é o rabo abanando o cachorro.

---

## ✅ Conformidade verificada

| Regra | Fonte | Estado |
| :--- | :--- | :--- |
| Sem JSON nativo · sem ENUM nativo · sem trigger/proc | ADR-0020 | ✅ `tinyint` + `CHECK` |
| `ON DUPLICATE KEY UPDATE` permitido | ADR-0020 §"Lista normativa" | ✅ e já padrão em 5 repos do projeto |
| Migration **gerada**, nunca à mão | constituição §VI | ✅ `db:generate:budget-plans` → `0006_same_jigsaw.sql`, revisada |
| Prefixo `bgp_*` · sem FK cross-agregado replace-all | ADR-0014 | ✅ |
| Money em centavos (bigint) | ADR-0018/0020 | ✅ inalterado |
| Mapper devolve `Result`; domínio rejeita row inválida | `.claude/rules/adapters.md` | ✅ `ExerciseMonth.rehydrate` → `budget-result-corrupt` |
| Domínio puro (zero throw/class) | `.claude/rules/domain.md` | ✅ |
| Isolamento de módulo | ADR-0006 | ✅ nada fora de `budget-plans/` |
| Lint · format | — | ✅ (2 arquivos gerados pelo drizzle-kit precisaram de `prettier --write`) |

## 👍 Pontos positivos

- **A UNIQUE corrige um bug pré-existente de graça** — o par `(budget_id, subcategory_id)` estava sem chave, e recalcular contava **em dobro**. Está provado contra MySQL real.
- **`budget_id_idx` removido** com justificativa correta: o UNIQUE é índice de prefixo. Verificado no banco — `SHOW INDEX` não o lista mais.
- **CA4 provado com INSERT direto** (`ERROR 3819`), não por inferência do CHECK no schema.
- **A suíte parametrizada** garante a paridade in-memory ↔ drizzle **por construção** — 9/9 nos dois, sem testes gêmeos que divergem.
- **`id` fora do SET do upsert** é a intenção certa (identidade estável) — só falta a resposta refletir isso, que é o Blocker-1.
- **`clone` preserva o mês** — sem esse teste, o campo seria esquecido silenciosamente ao derivar cenário.

## 📋 Escopo — ampliado, e a decisão está correta

A fatia absorveu a **escrita HTTP** (`month` no Zod + 4 handlers) porque o typecheck provou que o `month` obrigatório atravessa domínio → application → borda de uma vez. **Não é scope-creep**: é o mesmo tipo, e o `tasks.md` já mapeava a **US1 = persistência + HTTP escrita**. A fatia 3 fica com a leitura (US2). Registrado no `003-impl/REPORT.md` com as alternativas rejeitadas.

---

## Round 2 — **APPROVED**

Blocker-1 corrigido: o port `save` passa a devolver `Result<BudgetResult, E>` com **o registro efetivamente persistido**; o adapter Drizzle relê a linha por `(budget_id, subcategory_id, month)` após o upsert; o in-memory devolve a entrada preservando o `id` existente; o use case retorna o valor do repositório, não o que criou. Teste novo trava a regra: **o `id` da response bate com o do banco após recálculo**.

Suíte: **10/10** in-memory e **10/10** MySQL real. Typecheck, lint e format verdes.

**Veredito: APPROVED** — pronto para o W3.
