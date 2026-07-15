# W0 — Testes RED · BGP-MONTH-PERSIST (#413)

**Agente/Skill:** `tdd-strategist` · **Outcome:** **RED** · **Data:** 2026-07-15

## Suítes escritas

| Arquivo | Cobre |
| :--- | :--- |
| `tests/modules/budget-plans/domain/budget-result/budget-result.test.ts` (**estendido**) | CA6, CA7, CA8 — herdados da fatia 1 |
| `tests/modules/budget-plans/adapters/persistence/budget-result-repository.suite.ts` (**estendido**) | CA1, CA2, CA3, CA9 |

## Decisão de arquitetura de teste: estender a **suíte parametrizada**, não escrever teste por adapter

`budget-result-repository.suite.ts` é uma suíte **backend-agnóstica** já rodada pelos **dois** adapters:

- `budget-result.inmemory.test.ts` → in-memory
- `budget-result.drizzle-mysql.test.ts` → MySQL real (opt-in `MYSQL_INTEGRATION=1`)

Estendê-la faz o **CA9 (paridade in-memory ↔ drizzle) ser satisfeito por construção**, em vez de por dois testes gêmeos que divergem com o tempo. É o padrão do projeto (`.claude/rules/testing.md` §"Suítes parametrizadas reutilizáveis").

## RED — falha por inexistência da API

```
=== agregado (unit) ===
ℹ tests 6 · pass 3 · fail 3          ← 'month' não existe em CreateBudgetResultParams

=== suíte in-memory ===
ℹ tests 8 · pass 1 · fail 7
  TypeError: repo.save is not a function
  TypeError: repo.save is not a function
```

**É o RED correto:** `save` não existe (o port tem `add`) e o agregado não aceita `month`. Nada passa por acidente.

## Cobertura por critério de aceite

| CA | Teste | Estado |
| :-- | :--- | :--- |
| **CA1** — insere quando não existe | `save + listByBudgetId` round-trip com mês | RED |
| **CA2** — **recalcular ATUALIZA, não duplica** | mesmo `(budget, subcat, mês)` 2× → **1 linha**, `id` preservado, valor novo | RED |
| **CA3** — 12 meses coexistem, `SUM` = ×12 | 12 saves → 12 linhas, soma **4.405.104** | RED |
| **CA4** — CHECK rejeita mês inválido | INSERT direto no MySQL | **W3** (exige DB real) |
| **CA5** — row corrompida → `budget-result-corrupt` | mapper | **W1** (o mapper ainda não lê `month`) |
| **CA6** — `create` sem `month` = erro de tipo | compilador | **W3** (`typecheck`) |
| **CA7** — meses distintos = entidades distintas | março × abril, ids e valores independentes | RED |
| **CA8** — `clone` preserva o mês | clone para outro orçamento | RED |
| **CA9** — paridade in-memory ↔ drizzle | **a mesma suíte roda nos dois** | RED |

## Testes além dos CAs (justificados)

- **`alterar um mês não afeta os demais` (FR-004):** salva fev/mar/abr, altera **só** março, e verifica que fevereiro e abril ficam intactos. É o que impede um upsert com chave errada (ex.: só `budget_id`) de passar despercebido.
- **`contas distintas no mesmo mês coexistem`:** trava a chave do upsert em `(budget, subcategoria, mês)`. Sem ele, uma chave `(budget, mês)` — erro plausível — passaria em todos os outros casos.
- **Prova da P.O. (#454):** 12 × R$ 3.670,92 = **R$ 44.051,04**, no agregado **e** na persistência.

## Nota sobre o CA2 — trava um bug que já existe

Antes desta fatia, o repo faz `INSERT` puro e o schema **não tem `UNIQUE`**: recalcular grava **duas linhas** e o total por Rede **conta em dobro**. O CA2 é a rede que impede isso de voltar. Nunca estourou porque nenhum ambiente tem plano (#374).

## Próxima wave

**W1** — `drizzle-schema-author` (schema + migration) e `ts-domain-modeler` (agregado + mapper + repos). **Mínimo até GREEN.**
