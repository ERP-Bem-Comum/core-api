# BGP-READ-PORT — W2 (REVIEW read-only) · Round 1

> Skill: `code-reviewer`. Auditoria **read-only** — nenhuma linha de `src/` ou `tests/` foi tocada
> nesta wave. Fatia 1/3 de `REPORTS-REALIZED-VS-PLANNED`.

## Veredito

**APPROVED** — 0 Blocker, 0 Major, 4 Minor (todos não-bloqueantes; 2 deles são apenas registro,
1 é sugestão de robustez barata, 1 é insumo para o W3).

## Superfície auditada

| Arquivo | Linhas | Papel |
| :-- | :-- | :-- |
| `src/modules/budget-plans/application/ports/planned-amounts-read.ts` | 53 | contrato do port |
| `src/modules/budget-plans/adapters/persistence/repos/planned-amounts-read.drizzle.ts` | 161 | reader Drizzle |
| `src/modules/budget-plans/public-api/read.ts` | 55 | composição boot-scoped |
| `tests/modules/budget-plans/public-api/budget-plans-read-port.integration.test.ts` | +8 −4 | 2 fixtures reordenadas (W1) |

`git status` confirma o escopo: 3 arquivos novos em `src/` + 1 teste modificado + artefatos da
pipeline. **Nenhum outro arquivo do `budget-plans` mudou** (CA7 — ver §8).

---

## 1. O desvio no teste (foco nº 1) — **justificativa é real, não conveniência**

O W1 inverteu guard e assert em `openPort()` (l. 229-237) e `rowsOf()` (l. 239-248).

**A justificativa foi verificada no fonte dos tipos, não aceita de palavra.** O arquivo importa
`import { strict as assert } from 'node:assert'`, e em `@types/node/assert/strict.d.ts:102` o
namespace strict reexporta literalmente:

```
strictEqual as equal,
```

e `assert.d.ts:556` declara:

```ts
function strictEqual<T>(actual: unknown, expected: T, message?: string | Error): asserts actual is T;
```

Logo `assert.equal(built.ok, true, ...)` é **assertion signature** e estreita `built.ok` para `true`;
depois dela o ramo `!built.ok` é `never` e `built.error` não existe → `TS2339`. A afirmação do W1
("é o tipo do `assert`, não o do port") **procede**: nenhuma implementação de `read.ts` evitaria o
erro. No W0 o arquivo inteiro estava vermelho por `ERR_MODULE_NOT_FOUND`, então o problema só podia
aparecer no W1.

**Nenhuma expectativa foi enfraquecida:**

- As **duas** asserções continuam no arquivo — nada foi apagado, nada virou `skip`.
- O runtime é equivalente: em ambas as ordens, `ok === false` **encerra o teste com falha**; muda só
  quem lança primeiro (o `Error` da fixture, que ainda carrega `built.error`/`r.error` na mensagem —
  diagnóstico **melhor**, não pior).
- O bloco vive dentro de `if (integrationEnabled())`; nada foi movido para fora do gate.
- Nenhum outro ponto do teste foi tocado: o diff é exatamente +8/−4, restrito às 2 fixtures.
- As 17 asserções de contrato (12 meses, soma das Redes, unicidade `(sub, mês)`, AND dos filtros,
  48 linhas sem filtro, plain row) permanecem **idênticas**.

→ **Sem achado.** Ver Minor-1 apenas para o resíduo estético.

---

## 2. A grade de 12 meses (CA3) — **garantida por construção**

SQL emitido (capturado do próprio reader, sem MySQL, via o `try/catch` da borda):

```sql
FROM       bgp_budget_plans
INNER JOIN bgp_cost_centers  ON bgp_cost_centers.budget_plan_id = bgp_budget_plans.id
INNER JOIN bgp_categories    ON bgp_categories.cost_center_id  = bgp_cost_centers.id
INNER JOIN bgp_subcategories ON bgp_subcategories.category_id  = bgp_categories.id
CROSS JOIN ( SELECT 1 AS m UNION ALL ... SELECT 12 ) AS cal
LEFT  JOIN bgp_budgets        ON (...)
LEFT  JOIN bgp_budget_results ON (...)
```

A ordem é a que o contrato exige: a árvore vem **do plano** (INNER JOIN), o calendário multiplica
**antes** de qualquer lançamento entrar, e `bgp_budget_results` só chega por `LEFT JOIN`. A
cardinalidade da estrutura é fixada em `subcategorias × 12` **antes** de haver qualquer dependência
do dado lançado, e `coalesce(sum(...), 0)` converte o "não casou" em `0`.

**Caminhos em que uma linha da estrutura poderia sumir — todos verificados:**

| Caminho | Existe? | Por quê |
| :-- | :-- | :-- |
| Predicado sobre `bgp_budget_results` no `WHERE` | **não** | o `WHERE` só tem `bgp_budget_plans.{id,year,program_ref}` |
| Predicado de Rede no `WHERE` | **não** | está no `ON` (§3) |
| `INNER JOIN` com `bgp_budgets` ou `bgp_budget_results` | **não** | ambos são `LEFT JOIN` |
| Plano com **zero** Redes (`bgp_budgets` vazio) | não mata | `b.id` vira NULL, o results não casa, sai `0` nos 12 meses |
| `HAVING` filtrando soma | **não existe** | nenhum `HAVING` na query |
| Mês fora de 1..12 no dado | impossível | `CHECK bgp_budget_results_month_chk BETWEEN 1 AND 12`; e o calendário é a fonte do `month` |

Nó sem lançamento sai com 12 linhas zeradas — é o que o teste `'subcategoria sem NENHUM lancamento
ainda aparece'` assevera (12 linhas, todas `plannedCents === 0`).

Observação (não é achado): plano **sem nenhum centro de custo** não devolve linha — consequência
correta do INNER JOIN, já que não há nó a reportar.

---

## 3. Filtro de Rede no `ON`, não no `WHERE` — **confirmado no SQL emitido**

Com `{ budgetPlanId, year, partnerStateRef }` a query sai literalmente:

```sql
left join `bgp_budgets`
  on (`bgp_budgets`.`budget_plan_id` = `bgp_budget_plans`.`id`
      and `bgp_budgets`.`partner_kind` = ?
      and `bgp_budgets`.`partner_ref`  = ?)
...
where (`bgp_budget_plans`.`id` = ? and `bgp_budget_plans`.`year` = ?)
-- params: state, ST, PLAN, 2026
```

Os dois predicados de Rede estão **dentro do `ON`**; o `WHERE` contém **apenas** filtros de plano
(`id`, `year`, `program_ref`). A armadilha nº 1 do ticket **não** foi cometida. Os literais
`'state'`/`'municipality'` batem com o `CHECK bgp_budgets_partner_kind_chk` do schema.

---

## 4. `SUM` sobre múltiplas Redes — **sem dupla contagem, sem fan-out perdido**

`LEFT JOIN bgp_budgets ON b.budget_plan_id = p.id` de fato multiplica cada `(sub, mês)` pelas N Redes
do plano. O que impede a dupla contagem é o `r.budget_id = b.id` no `ON` do segundo LEFT JOIN,
combinado com o `UNIQUE (budget_id, subcategory_id, month)`
(`bgp_budget_results_budget_subcategory_month_uq`, schema l. 273-277): cada tripla `(budget, sub,
mês)` casa **no máximo uma** linha de resultado. Portanto:

- cada linha do fan-out contribui com **um** `value_cents` (ou NULL);
- o `GROUP BY (plano, centro, categoria, sub, cal.m)` colapsa o fan-out em uma linha;
- `SUM` = soma **das Redes**, exatamente o esperado (estado 200 + município 50 = 250).

Não há multiplicação prévia: nenhuma outra tabela entra no `FROM` capaz de duplicar. O `GROUP BY`
lista **todas** as colunas não-agregadas do `SELECT` — seguro sob `ONLY_FULL_GROUP_BY`.

Efeito colateral correto e desejado do `r.budget_id = b.id`: lançamento cujo `budget_id` não pertence
ao plano corrente (ou é órfão — não há FK, D1 do #317) **não** entra na soma. Ver Minor-3.

---

## 5. Pool boot-scoped (CA1 / Incident-0001) — **conforme**

- `openBudgetPlansMysql` aparece **uma única vez** em `read.ts:42`, no corpo de
  `buildBudgetPlansReadPort` — e em nenhum outro ponto do caminho de leitura.
- `createDrizzlePlannedAmountsReader(handle)` **recebe** o handle; o reader não conhece
  `createPool`/`openBudgetPlansMysql` (checado no fonte: só importa `and/asc/eq/sql`, `Result`, tipos
  do port, o **tipo** do handle e o schema).
- `close: async () => handle.close()` → `pool.end()` (driver l. 133-135). Fecha de fato.
- Depois do `close()`, a query lança e o `try/catch` da borda devolve `err(...)` — **não** há
  reabertura. O teste `'apos close() nova leitura NAO abre pool novo'` cobre exatamente isso.
- `applyMigrations: false` — leitura pura, molde `buildProgramsReadPort`/`buildPartnersReadPort`
  (comparado lado a lado com `src/modules/programs/public-api/read.ts`: mesma estrutura).
- Herda o builder compartilhado `buildPoolOptions`, que garante `maxIdle < connectionLimit` —
  a invariante-mãe do post-mortem do Incident-0001.

---

## 6. ADRs

**ADR-0006 (CA6):** `read.ts` vive na `public-api/`, importa **só** driver + repo + tipos do port —
nenhum `from '../domain/`. O teste estrutural que lê o próprio fonte passa (rodado nesta wave).
`PlannedAmountRow` é `Readonly<{...}>` de `string`/`number` puros — zero VO, zero `Money`, zero
`Result` aninhado.

**ADR-0014:** o SQL emitido toca exclusivamente `bgp_budget_plans`, `bgp_cost_centers`,
`bgp_categories`, `bgp_subcategories`, `bgp_budgets`, `bgp_budget_results`. Nenhum `par_*`/`prg_*`.
`partnerStateRef`/`partnerMunicipalityRef` entram como **ref opaco** comparado a
`bgp_budgets.partner_ref` — nenhum nome de Rede é resolvido, nem prometido no tipo de saída.

**ADR-0020:** só features permitidas — `SELECT`, `INNER/LEFT/CROSS JOIN`, derivada com `UNION ALL`,
`COALESCE`, `SUM`, `GROUP BY`, `ORDER BY`, parâmetros ligados. Sem JSON, sem ENUM nativo, sem stored
proc/trigger, sem isolation level explícito, sem DDL. **Zero mudança de schema.**

**Regras de camada:** port é `type` (`Readonly<{...}>` de funções), sem `class`/`interface`
implementada; o adapter é a única camada com `try/catch`, e converte na borda para `Result`;
application não importa `adapters/`. Conforme `.claude/rules/application.md` e `adapters.md`.

---

## 7. CA5 — erro nunca cruza a borda como `throw`

- Caminho de build: `openBudgetPlansMysql` já é `Result`; `read.ts:46` propaga com `err(...)`. Os 4
  slugs do driver (`budget-plans-mysql-driver-*`) casam `/^budget-plans-[a-z-]+$/`.
- Caminho de leitura: todo o `await db.select(...)` está dentro de `try`; o `catch` devolve
  `err('budget-plans-read-query-failed')` — kebab EN com o prefixo exigido.
- A montagem dos filtros (antes do `try`) não tem caminho de exceção: são `eq(...)` sobre valores já
  provados `!== undefined`, com spread condicional respeitando `exactOptionalPropertyTypes`.
- Verificado **empiricamente** nesta wave: forçando a query contra um host inexistente, a chamada
  **retornou** (não lançou) e escreveu a diagnose em `stderr` — mesmo padrão do driver do módulo.
- O teste estrutural de conn malformada passa sem DB.

---

## 8. CA7 — regressão zero

`git status --porcelain`: apenas os 3 arquivos **novos** em `src/` e o teste do próprio ticket.
`src/modules/budget-plans/adapters/persistence/schemas/mysql.ts` **não** aparece no diff — schema
`bgp_*` intocado, nenhuma migration nova. Nenhum arquivo existente do módulo (ETL, http, events,
migrate, permissions, repos, use cases) foi modificado. `read.ts` é aditivo à `public-api/`.

---

## Achados

### Minor-1 — asserção vacante depois do guard (estético)

`tests/.../budget-plans-read-port.integration.test.ts:235` e `:246`

Depois da inversão, `assert.equal(built.ok, true, ...)` roda apenas quando `built.ok` **já** é `true`
— nunca pode falhar. É uma asserção sem poder de detecção (o guard acima é quem falha). Não
enfraquece nada (a cobertura migrou para o `throw` da fixture, com mensagem melhor), mas fica um
resíduo que pode confundir quem ler depois. Alternativa equivalente e mais enxuta seria manter só o
guard, com a mensagem que já carrega `built.error`. **Não bloqueia; não justifica reabrir o W1.**

### Minor-2 — `month` é o único campo que confia no tipo declarado

`planned-amounts-read.drizzle.ts:47,150`

`plannedCents` é normalizado com `Number(...)` porque `SUM` sobre `BIGINT` volta string no mysql2 —
correto. Já `month` vem de `sql<number>\`cal.m\`` e é repassado **sem** normalização (l. 150). A
anotação `SQL<number>` é uma asserção não verificada: se o driver devolvesse os literais do calendário
como string, `month` sairia string e o contrato (`assert.deepEqual(months, ALL_MONTHS)`) quebraria em
runtime sem que o typecheck visse. Um `Number(r.month)` custaria nada e eliminaria a assimetria.
Não é bloqueante porque o teste de integração do W3 é a prova empírica exata desse ponto.

### Minor-3 — lançamento órfão é silenciosamente ignorado (registro, não defeito)

`planned-amounts-read.drizzle.ts:108-115`

Como `bgp_budget_results` não tem FK (D1 do #317), uma linha cujo `budget_id` não exista em
`bgp_budgets` (ou pertença a outro plano) simplesmente não entra na soma — sem erro e sem sinal. O
comportamento é o **correto** para este port (a alternativa, juntar só por `subcategory_id`, contaria
em dobro entre planos), mas vale registrar: divergência de total contra o legado, se aparecer no W3,
tem aqui um suspeito natural. Nenhuma ação nesta wave.

### Minor-4 — insumo para o W3 (não é pedido de `EXPLAIN` nesta wave)

O fan-out intermediário é `subcategorias × 12 × Redes_do_plano` antes do `GROUP BY`. Com o volume
real migrado (390 subcategorias, 5 planos) e um plano com muitas Redes, a chamada **sem filtro**
materializa um intermediário grande. O port não impõe filtro obrigatório nem `LIMIT` — e isso é
contrato deliberado (o teste `'sem filtro nenhum devolve a grade de todos os planos'` assevera 48
linhas). Fica apenas como insumo para a auditoria de plano que o W0 (nota 4) já alocou ao W3.

---

## Pontos explicitamente NÃO tratados como achado

- **`partnerStateRef` + `partnerMunicipalityRef` juntos → grade zerada** (nota 5 do W1). É decisão de
  produto pendente da P.O. (ADR-0040), não defeito. **Confirmado que está documentado no fonte**:
  `planned-amounts-read.drizzle.ts:69-72` explica a conjunção literal ("uma Rede é estadual XOR
  municipal ... leitura estritamente AND, nunca OR") e o port repete a semântica AND em
  `planned-amounts-read.ts:33-36`. Documentação adequada — nada a fazer aqui.
- **`EXPLAIN`/índices** — alocado ao W3, com MySQL de pé.
- **Escopo novo** (filtro por status de plano, escolha de versão vigente, `OR` na dimensão Rede) —
  ADR-0040: vira issue, não achado. O fonte já declara a ausência como decisão (`planned-amounts-read.ts:35-36`).

---

## Audit log (gate da wave)

```
$ pnpm run lint
> eslint .
(sem saída — zero erro, zero warning)

$ pnpm run typecheck
> tsc --noEmit
(sem saída — zero erro)

$ node --test --experimental-strip-types --no-warnings \
    tests/modules/budget-plans/public-api/budget-plans-read-port.integration.test.ts
▶ BGP-READ-PORT — superficie do port (estrutural)
  ✔ exporta buildBudgetPlansReadPort como funcao (0.300791ms)
  ✔ CA5 (sem DB): connection-string malformada -> Result err com slug kebab EN, nunca throw (0.243625ms)
  ✔ CA6 (fonte): o port vive na public-api e NAO importa o dominio do modulo (ADR-0006) (2.069542ms)
✔ BGP-READ-PORT — superficie do port (estrutural) (3.238375ms)
ℹ tests 3 · suites 1 · pass 3 · fail 0 · skipped 0

$ git status --porcelain
 M .claude/.pipeline/BGP-READ-PORT/STATE.json
 M .claude/.pipeline/BGP-READ-PORT/STATE.md
 M tests/modules/budget-plans/public-api/budget-plans-read-port.integration.test.ts
?? .claude/.pipeline/BGP-READ-PORT/003-impl/
?? src/modules/budget-plans/adapters/persistence/repos/planned-amounts-read.drizzle.ts
?? src/modules/budget-plans/application/ports/planned-amounts-read.ts
?? src/modules/budget-plans/public-api/read.ts
```

Evidência adicional: o SQL emitido foi capturado a partir do **próprio reader** (probe fora do repo,
sem MySQL de pé, nada escrito em `src/`/`tests/`) — é a fonte das citações das §2/§3/§4.

## Mapa CA → veredito

| CA | Veredito | Onde foi verificado |
| :-- | :-- | :-- |
| CA1 pool 1× + `close()` | ✅ | §5 |
| CA2 árvore com id/name, escopada | ✅ | §2, §6 |
| CA3 grade de 12 com zerados | ✅ | §2 |
| CA4 filtros AND combináveis | ✅ | §3 (`WHERE` AND) + §4 |
| CA5 `Result` err kebab, sem `throw` | ✅ | §7 |
| CA6 ADR-0006 / plain rows | ✅ | §6 |
| CA7 regressão zero | ✅ | §8 |

## Próximo passo

**W3 (QUALITY)** — `ts-quality-checker`: `typecheck` + `format:check` + `lint` + `pnpm test`, e a
suíte de integração `MYSQL_INTEGRATION=1` com MySQL de pé (14 testes gated), mais o `EXPLAIN` que o
W0 alocou a esta wave (Minor-4) e a conferência contra o dado real do `ETL-BUDGET-PLANS`
(5 planos / 390 subcategorias / 5.040 linhas do export legado).

---

## Pós-review — Minor-2 aplicado (fio principal, fora da wave read-only)

O **Minor-2** (assimetria: `plannedCents` normalizado com `Number()`, `month` confiando na anotação)
foi corrigido antes do W3. A primeira tentativa — `Number(r.month)` sozinho — foi **barrada pelo
`lint`** (`@typescript-eslint/no-unnecessary-type-conversion`: "Passing a number to Number() does not
change the type or value of the number"), o que **prova o achado**: a regra confiava na anotação
`SQL<number>`, que é asserção não-verificada, exatamente o ponto do revisor.

Correção real: a anotação passou a ser honesta com o runtime.

```ts
const CALENDAR_MONTH: SQL<string | number> = sql<string | number>`cal.m`;
...
month: Number(r.month),
```

Agora `month` e `plannedCents` seguem a mesma disciplina: tipo honesto na fronteira do driver +
normalização no mapper. Gates revalidados no fio principal após a mudança:
`typecheck` limpo · `lint` limpo · `format:check` limpo · `pnpm test` **4249 tests / 4230 pass / 0 fail**.

Minor-1 (asserção vacante no teste), Minor-3 (lançamento órfão — registro) e Minor-4 (insumo de
`EXPLAIN` para o W3) permanecem como registrados, sem ação.
