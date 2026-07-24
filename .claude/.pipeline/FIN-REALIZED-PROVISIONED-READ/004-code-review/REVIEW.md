# Code Review — Ticket FIN-REALIZED-PROVISIONED-READ — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (W2, read-only)
**Data:** 2026-07-21
**Fatia:** 2/3 de `REPORTS-REALIZED-VS-PLANNED`

**Escopo revisado:**

- `src/modules/financial/public-api/realized-provisioned-projection.ts` (novo)
- `src/modules/financial/public-api/index.ts` (+export)
- `tests/modules/financial/public-api/realized-provisioned-boundary.test.ts` (novo)
- `tests/modules/financial/public-api/realized-provisioned.drizzle-mysql.test.ts` (novo)
- `scripts/ci/test-integration.ts` (+1 registro)
- Cruzado com: `realized-by-plan-projection.ts` (molde #416), `adapters/persistence/schemas/mysql.ts`

> **Nota de método:** integração/EXPLAIN **não** avaliados (é W3; sem MySQL — issue #500), conforme
> instrução. A verificação abaixo é estática: leitura do SQL emitido pelo query-builder, do schema e
> do `git diff`. As 5 notas dirigidas do W1 foram todas endereçadas.

---

## Veredito por foco (na ordem pedida)

### 1. Chave de costura sem separador (linhas 63-65) — 🔵 Minor (fragilidade defensável, NÃO Blocker)

`keyOf = ${budgetPlanRef}${categoryRef ?? 'null'}${month}` concatena sem delimitador. Auditei os
caminhos de colisão com o contrato de dado real (schema `fin_documents`):

- `budget_plan_ref` / `category_ref` são `varchar(36)` (linhas 88-89 do schema), populados com UUID v4
  = **largura fixa 36**. `month` vem de `DATE_FORMAT(..., '%Y-%m')` = **largura fixa 7** (o ano MySQL
  em `DATE` é sempre 4 dígitos no range 1000-9999).
- Com P (36, fixo), M (7, fixo) e C no meio, a decomposição por offsets fixos das duas pontas é
  **injetiva independentemente do comprimento de C** (inclusive quando C é a sentinela `'null'` de 4
  chars). Ou seja: **com dados reais UUID, NÃO há colisão e as somas estão corretas.** O argumento do
  W1 procede.
- **Único caminho de colisão residual:** um `categoryRef` que seja **literalmente a string `'null'`**
  (4 chars) colidiria com a sentinela de `categoryRef = NULL` — dois buckets logicamente distintos
  (categoria ausente vs. categoria de valor `'null'`) fundiriam e somariam errado. Mas `'null'` (4
  chars) **não é um UUID**; nenhum produtor de ref do módulo `categories` emite esse valor. Como
  `category_ref` é ref **opaco** sem CHECK (ADR-0014 — o financial não o valida), não é *impossível*
  via ETL/legado, mas **não é alcançável no contrato de dado corrente**.

**Decisão com rigor:** é **Minor**, não Blocker. Não há colisão silenciosa sobre o dado real (UUID de
largura fixa); o resíduo exige `categoryRef === 'null'` literal, fora do contrato. Recomendo (não
bloqueante) endurecer com um separador que não ocorre em UUID nem em `'YYYY-MM'` (ex.: `|`), tornando a
chave injetiva por construção e imune a refs de largura variável no futuro. Some-se a isso um nit de
comentário: a linha 61 diz "Separador  não ocorre em UUID/mês" mas o código **não usa** separador — o
texto contradiz o código; alinhar comentario↔código junto do fix se ele for feito.

### 2. Invariante ⊻ (CA4) — ✅ correto, sem achado

O `NOT EXISTS` (linhas 155-169) exclui do provisionado **qualquer** payable com item de conciliação
`Active` — é o garantidor real do ⊻, não o `status='Approved'`. Simétrico: o realizado (linhas
111-139) exige item `Active`; um payable sem item Active nunca cai no realizado. Logo **nenhum título
entra nas duas medidas**, mesmo o hipotético `Approved`-com-item-`Active` por inconsistência (o
`NOT EXISTS` o tira do provisionado; apareceria só no realizado). O `NOT EXISTS` não fana: é subquery
correlacionada booleana por título — escolha certa vs. `LEFT JOIN ... IS NULL` (que fanaria com
múltiplos itens). Confirmado.

### 3. Dois eixos de data — ✅ correto, não trocado

- Realizado: `month` e filtro `year` ambos sobre `finReconciliations.reconciledAt` (linhas 110, 135). ✓
- Provisionado: `month` e filtro `year` ambos sobre `finPayables.dueDate` (linhas 142, 174). ✓

Cada medida no seu eixo; os eixos não se cruzam (queries separadas, costura só por `(plano, categoria,
mês)`). Nenhuma troca.

### 4. Fan-out no realizado — ✅ correto, sem duplicação

O `FROM` é `finReconciliationItems` (grão = item de conciliação). O `SUM` é de
`reconciled_value_cents` **do item**. Os JOINs a payables/documents são N:1 — não multiplicam o valor.
Um payable com múltiplos itens `Active` contribui a soma dos seus `reconciled_value_cents` (o total
conciliado daquele título) — **correto**, e nunca o valor do documento/título em dobro (o SUM é do
campo do item, não de `payable.value`/`document`).

### 5. ADR-0006 / ADR-0014 (CA7) — ✅ sem vazamento

- Vive em `public-api/`; devolve **plain rows** (`RealizedProvisionedRow`: `string`/`number`/`null`),
  zero agregado de domínio. ✓
- Só toca `fin_*` (`finDocuments`, `finPayables`, `finReconciliations`, `finReconciliationItems`). ✓
- `budgetPlanRef`/`categoryRef` devolvidos crus, nenhum nome resolvido (refs opacos). ✓
- Imports: só o próprio módulo (`../adapters/...`) + `#src/shared/primitives/result.ts`. Nenhum
  `domain/`/`application/` de outro módulo. ✓
- O boundary test (estrutural) trava (a) existência do seam, (b) ausência de import cross-módulo, (c)
  ausência de prefixos `bgp_`/`ctr_`/`par_`/`auth_`/`prg_`. Cobertura adequada.

### 6. CA9 regressão zero — ✅ confirmado no `git diff`

- `realized-by-plan-projection.ts`: **zero diff** (intocado — consumidor vivo #416). ✓
- `adapters/persistence/schemas/mysql.ts`: **zero diff**. ✓
- `public-api/index.ts`: **aditivo** (+8 linhas — só o bloco de export do novo reader). ✓
- `scripts/ci/test-integration.ts`: **aditivo** (+1 registro no grupo `financial`). ✓

### 7. CA8 (erro nunca `throw`; slug kebab EN) — ✅ correto

- Conn malformada → `openMysqlFinancial` devolve `Result` err, propagado como `err(handleR.error)`
  (linha 102). O surface test prova `r.ok === false` com slug `/^[a-z][a-z0-9-]*$/`. ✓
- Falha de query → `catch` (linhas 197-200) devolve `err('realized-provisioned-read-failure')` — kebab
  EN, sem `throw` cruzando a borda; a causa vai só pro `stderr`. ✓

---

## Conformidade transversal (CLAUDE.md / rules)

- Sem `throw`, sem `class` (o `interface Bucket` é DTO mutável de acumulação em camada de infra —
  permitido fora do `domain/`), sem `any`, sem `enum`, sem `require`. ✓
- Imports com extensão `.ts`; `import { type Result, ... }` (verbatimModuleSyntax). ✓
- Funções exportadas com return type explícito; arrows de `list`/`close` contextualmente tipados por
  `RealizedProvisionedReader`. ✓
- Mutação de `Bucket` via `+=` ocorre no reader (infra), não no domínio — conforme `rules/adapters.md`. ✓
- SQL usa só features permitidas por ADR-0020 (INNER JOIN, SUM/GROUP BY, `DATE_FORMAT`/`YEAR`,
  `NOT EXISTS`). ✓
- Boot-scoped (CA1): pool 1× via `openMysqlFinancial({ applyMigrations: false })`, `close()` encerra. ✓
- `month`/eixos nunca nulos: `reconciledAt` e `dueDate` são `NOT NULL` no schema. ✓
- `GROUP BY` por `categoryRef` agrupa NULL num único grupo (MySQL) e a costura o mapeia por sentinela —
  consistente; linha com `budget_plan_ref` NULL é pulada por desenho (relatório por plano, padrão #416). ✓

---

## O que está bom

- **⊻ à prova de inconsistência:** o `NOT EXISTS` como garantidor (não confiar só em `status`) é a
  escolha correta e está bem justificada no cabeçalho (linhas 18-22).
- **Duas queries em vez de FROM único:** decisão certa e documentada — evita cruzar os eixos de data e
  o fan-out item×payable.
- **Regressão zero real:** `#416` e schema literalmente intocados (provado no diff), não só declarado.
- **Cabeçalho do arquivo** documenta eixos, anti-join e JOIN base com precisão — ótimo para o próximo
  leitor (fatia 3).
- **Testes** com AAA claro, UUIDs válidos, asserções de valor (16000/40000/26000/30000, buckets
  mar/abr) — não "não-lança"; integração corretamente gated por `MYSQL_INTEGRATION`.

---

## Achados por severidade

| # | Severidade | Arquivo:linha | Resumo |
| :- | :- | :- | :- |
| 1 | 🔵 Minor | `realized-provisioned-projection.ts:61-65` | Chave de costura sem separador — injetiva com UUID de largura fixa (correto no dado real); resíduo teórico se `categoryRef === 'null'` literal. Separador `|` endurece. Comentário L61 cita "Separador" inexistente. Não bloqueante. |

Nenhum Blocker. Nenhum Major.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (`ts-quality-checker`): `typecheck` +
  `format:check` + `lint` + `test`. A integração MySQL deve ser registrada como **não-executada**
  (issue #500), nunca verde — junta na leva das 3 fatias.
- O achado Minor #1 pode virar hardening na fatia 3 (costura) ou seguir como está; a decisão do
  separador não é bloqueante e não exige nova rodada.

---

## Pós-review — Minor #1 aplicado (fio principal, fora da wave read-only)

O **Minor #1** (chave de costura) foi endereçado antes do W3. Ao aplicar, descobri que o W1 tinha usado
**caracteres de controle invisíveis**: um SOH no comentário (o "Separador") e um STX como prefixo da
sentinela (`'null'`). Funcionava — a sentinela já era distinta de um `'null'` literal — mas era
**ilegível**: ninguém enxerga o separador lendo o código, e um editor pode comê-lo num diff.

Correção: separador **`|` visível** entre os três campos e sentinela de categoria nula `'\u0000'`
(NUL, que jamais aparece num `varchar` de dado real). A decomposição vira inequívoca **mesmo se um
ref deixar de ser UUID de largura fixa** (remove a premissa frágil que o revisor apontou) e não colide
com um `categoryRef` literal `'null'` (o resíduo teórico do achado). O comentário agora descreve o
separador que o código de fato usa.

Gates revalidados no fio principal: `typecheck` · `lint` · `format:check` verdes; os 5 testes do
módulo (boundary + superfície) verdes. O achado do W2 fica **resolvido**, não apenas registrado.
