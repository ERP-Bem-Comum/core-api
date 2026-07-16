# BGP-COST-STRUCTURE-EDIT — escopo (#454 gap 3)

> Editar (renomear) e desativar os 3 níveis da árvore de custos. Size **M**.
> Issue **#454** (gap 3, sem issue própria) · guarda-chuva **#404**.

## Problema

O modal **"Centros de Custo"** tem **"Editar"** e **"Desativar"** por linha. **Os dois são fachada** —
o contrato só tem criação:

```
GET   /budget-plans/:id/cost-structure
POST  /budget-plans/:id/cost-structure/{cost-centers,categories,subcategories}
—     nenhum PATCH, nenhum desativar
```

**Criar funciona; errar não tem volta.** Nome errado fica errado para sempre; nó que não serve mais
não sai da cascata — e essa cascata alimenta o Lançar Documento e a Conciliação.

**Front pronto** (feature 061): modal, formulários, switch e árvore existem; editar/desativar são
front-first e **não persistem**. Ligam assim que as rotas existirem.

## Decisões

### D1 — `DELETE` **não entra**. Só desativar (soft)

Decidido por evidência, não por preferência (a issue já preferia soft):

- **`bgp_budget_results.subcategoryId` aponta para subcategorias e NÃO tem FK.** Excluir um nó
  deixaria lançamentos órfãos apontando para uma subcategoria inexistente — o mesmo defeito que o
  #453 gastou uma transação inteira para evitar.
- Nó já usado por lançamento não pode sumir do histórico.

Se um dia `DELETE` fizer sentido, precisa da regra de "em uso" — **fora deste ticket**.

### D2 — Desativar Centro: filhos ficam **inativos por herança** (decisão do Gabriel, 2026-07-15)

Só o nó alvo grava `active = false`. A leitura entrega o estado **efetivo** (inativo se ele **ou**
um ancestral estiver inativo), que é exatamente o que a árvore do front já mostra.

Por que não cascata na escrita: ela **destrói informação**. Ao reativar o Centro, ou tudo volta
(revivendo nós desativados de propósito), ou nada volta (e o usuário reativa um a um). Herança é
reversível e preserva a intenção de cada nó.

### D3 — Reativar existe

O front tem **switch**, não botão. `PATCH { active: true }`.

### D4 — Plano `APROVADO` bloqueia (herdado, não é decisão nova)

A árvore já recusa escrita em plano aprovado (`plugin.ts`: *"Plano APROVADO bloqueia escrita → 409"*).
`PATCH` entra pelo mesmo `mutate`, então herda o guard **de graça** — e há teste para provar.

## Escopo

1. **Migration** — `active` nos 3 níveis (`bgp_cost_centers`, `bgp_categories`, `bgp_subcategories`).
   `NOT NULL DEFAULT TRUE` (nó existente nasce ativo). Gerada por `pnpm run db:generate:budget-plans`
   — **nunca à mão**.
2. **Domínio** (`cost-structure.ts`) — `renameCostCenter/Category/Subcategory` e
   `setCostCenterActive/…` puros sobre a árvore. `types.ts` ganha `active: boolean` nos 3.
3. **Port** — **nenhum método novo**: `mutate(planId, apply)` já é a escrita atômica guardada por
   status. É o ponto de extensão que a Fatia 2 deixou pronto.
4. **Application** — `rename-cost-node.ts` + `set-cost-node-active.ts` (ou equivalente), via `mutate`.
5. **Borda** — `PATCH /budget-plans/:id/cost-structure/{cost-centers,categories,subcategories}/:nodeId`
   com body `{ name?, active? }`. O **GET** passa a expor o `active` **efetivo**.

## Critérios de aceite

- [ ] **CA1** — **Dado** um centro/categoria/subcategoria, **Quando** `PATCH { name }`, **Então**
      **200** e o nome muda; a árvore mantém o resto (id, direção, launchType, filhos).
- [ ] **CA2** — **Dado** um nó ativo, **Quando** `PATCH { active: false }`, **Então** ele volta do
      GET como inativo — e **continua existindo** (soft, nada some).
- [ ] **CA3** — **Dado** um **Centro** desativado, **Quando** o GET lê a árvore, **Então** as
      categorias/subcategorias abaixo vêm **inativas por herança**, mesmo tendo `active = true` na
      própria linha.
- [ ] **CA4** — **Dado** um Centro desativado com um filho que **já era** inativo por si,
      **Quando** o Centro é reativado, **Então** esse filho **continua inativo** (a herança não
      apaga a intenção do nó) e os irmãos voltam a ativo.
- [ ] **CA5** — **Dado** um plano **`APROVADO`**, **Quando** `PATCH` em qualquer nível, **Então**
      **409** e nada muda.
- [ ] **CA6** — **Dado** um nó inexistente (ou de outro plano), **Quando** `PATCH`, **Então**
      **404** — e nunca tocar em nó de plano alheio.
- [ ] **CA7** — **Dado** `PATCH { name: '' }` ou body vazio, **Então** **400** (a criação já valida
      `name`; a edição usa a mesma regra).
- [ ] **CA8** — **Dado** um lançamento (`bgp_budget_results`) numa subcategoria, **Quando** ela é
      desativada, **Então** o lançamento **continua íntegro** — desativar não é apagar.

## Fora de escopo

- **`DELETE` de nó** (D1) — precisa da regra "em uso"; registrar se pedirem.
- **Filtrar nó inativo no Lançar Documento/Conciliação** — consumo é do `financial`; e a leitura
  cross-módulo da árvore (ADR-0051) **ainda não existe** (`budget-plans/public-api` não expõe a
  árvore, e o `financial` não a importa). Quando existir, o `active` efetivo já estará lá.
- Reordenar nós, mover nó entre pais.
- Front (ligar os handlers) — outro repo.

## Invariantes

- Domínio puro: sem `throw`, sem `class`, `Result<T,E>`, erros EN kebab-case.
- Escrita só via `mutate` (fecha a race read-check-write — Q4 da Fatia 2).
- ADR-0014 (só `bgp_*`) · ADR-0020 (dialeto; **sem ENUM nativo**) · ADR-0006.
- Migration gerada por drizzle-kit, nunca escrita à mão.
- Regressão zero: baseline **4116** testes, 0 falhas.
- Validação em **MySQL real** (x99 offline → container descartável; `test:integration:*` **destrói a
  infra dev**).

## Waves

| Wave | Agente/Skill | Saída |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | `002-tests/REPORT.md` — RED |
| **W1** | `ts-domain-modeler` (árvore) + `drizzle-schema-author` (migration) | `003-impl/REPORT.md` |
| **W2** | `code-reviewer` | `004-code-review/REVIEW.md` — máx 3 rounds |
| **W3** | `ts-quality-checker` | `005-quality/REPORT.md` |
