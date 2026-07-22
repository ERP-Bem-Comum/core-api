# BGP-PLAN-DELETE — escopo (#453)

> `DELETE /budget-plans/:id` — excluir o plano inteiro. Size **S**. Issue **#453** (gap 2 do **#454**),
> guarda-chuva **#404**.

## Problema

O item **"Excluir Plano"** existe no menu da lista de Planejamento e **não faz nada**: a rota não
existe. O front já o mantém `disabled` + tooltip pela regra da P.O. (*"o que não tiver, deixe
desativado"*) — `ACTIONS_WITHOUT_ENDPOINT` inclui `'delete'`. **O front não é o gargalo**; é remover
uma entrada de um Set assim que o contrato existir.

⚠️ **Não confundir com o #377**: aquele é `DELETE /:id/budgets/:budgetId` — apagar um **orçamento
(Rede)** dentro do plano. Este é o **plano inteiro**.

## Decisões de domínio (a issue as deixou em aberto — respondidas em 2026-07-15)

As três estavam sem resposta: #453 e #454 apontavam uma para a outra. Duas eram de produto e foram
decididas com o Gabriel; a terceira não era decisão.

### D1 — Plano `APROVADO`: **bloqueia** (409 `budget-plan-already-approved`)

Coerente com o módulo inteiro (Aprovado é imutável: editar valor exige Calibração). Evidência que
pesou, e que não estava na issue:

- O **Consolidado ABC** (US5, `listApprovedByYear`) agrega planos `APROVADO` — apagar um **reescreve
  retroativamente** resultado já reportado.
- **`fin_documents.budget_plan_ref`** (`financial/…/schemas/mysql.ts:88`) aponta para planos e **não
  tem FK** (isolamento por módulo, ADR-0014). O **Realizado** (#416) é projetado por plano
  (`financial/public-api/realized-by-plan-projection.ts`). Apagar um plano referenciado deixa despesa
  real sem âncora de planejamento, **em silêncio** — não há constraint que segure.

Bloquear é **reversível** (liberar depois é fácil); apagar não.

### D2 — Plano com filhos: **bloqueia** (409 `budget-plan-has-children`)

Apaga-se de baixo pra cima. Nunca destrói trabalho que não está na tela, e cada exclusão passa pelas
mesmas regras — nada escapa por estar aninhado.

> A árvore chega a 3 níveis e filhos existem nos **dois** ramos — não só sob Aprovado:
> `startCalibration` exige `parent.status === 'APROVADO'` (gera **calibração**);
> `createScenery` exige `parent.status !== 'APROVADO'` (gera **cenário**, até `MAX_SCENERIES`).
> Logo um `RASCUNHO` **pode** ter cenários, e D2 não é consequência de D1.

### D3 — Orçamentos + `budget_results` + estrutura de custo: **cascata atômica** (não era decisão)

Precedente direto: `removeBudget` (#377) já persiste o plano-sem-o-budget e apaga os
`bgp_budget_results` na **mesma transação**. Aqui é o mesmo princípio, com o plano como raiz.

### Efeito combinado (que simplifica o ticket)

Como D1 e D2 bloqueiam, o DELETE só remove uma **folha** `RASCUNHO`/`EM_CALIBRACAO`. **Não há
cascata de planos** — só as tabelas dependentes do próprio plano.

## Escopo

1. **Domínio** — guarda de exclusão no agregado (`BudgetPlan.remove` ou equivalente): decide sobre
   status e presença de filhos. Erros novos em `errors.ts`: `budget-plan-has-children`
   (`budget-plan-already-approved` **já existe**).
2. **Port** — `BudgetPlanRepository.remove(plan)`: apaga plano + `bgp_budgets` + `bgp_budget_results`
   + estrutura de custo **numa transação** (molde: `removeBudget`). Adapters mysql + in-memory.
3. **Application** — `delete-budget-plan.ts` (molde: `delete-budget.ts`): valida → `findById` →
   `listChildren` → domínio → persist.
4. **Borda HTTP** — `DELETE /budget-plans/:id` no `plugin.ts`; **204** no sucesso; mapeamento
   404/409; permissão igual às demais rotas de escrita do módulo.

## Critérios de aceite

- [ ] **CA1** — **Dado** um plano `RASCUNHO` sem filhos, **Quando** `DELETE /budget-plans/:id`,
      **Então** **204** e o plano some da lista.
- [ ] **CA2** — **Dado** um plano com orçamentos e resultados, **Quando** apagado, **Então**
      `bgp_budgets`, `bgp_budget_results` e a estrutura de custo dele somem **na mesma transação**
      (nada órfão; rollback total se algo falha).
- [ ] **CA3** — **Dado** um plano `APROVADO`, **Quando** `DELETE`, **Então** **409**
      `budget-plan-already-approved` e **nada** é apagado.
- [ ] **CA4** — **Dado** um plano com filhos (calibração **ou** cenário), **Quando** `DELETE`,
      **Então** **409** `budget-plan-has-children` e **nada** é apagado — inclusive quando o pai é
      `RASCUNHO` (cenário via `createScenery`).
- [ ] **CA5** — **Dado** um id inexistente, **Quando** `DELETE`, **Então** **404**
      `budget-plan-not-found`.
- [ ] **CA6** — **Dado** um id malformado, **Quando** `DELETE`, **Então** **400** (borda).
- [ ] **CA7** — **Dado** um plano `EM_CALIBRACAO` sem filhos, **Quando** `DELETE`, **Então** **204**
      — abandonar calibração é legítimo, e libera o guard `budget-plan-calibration-open` do pai.

## Fora de escopo

- **Checar `fin_documents` antes de apagar** (a 3ª opção de D1) — exigiria consulta cross-módulo ao
  `financial` no caminho de escrita. D1 bloqueia o caso perigoso (`APROVADO`) sem esse acoplamento.
- **Soft delete / lixeira** — a issue pede exclusão; nada no módulo tem soft delete hoje.
- Front (remover `'delete'` do `ACTIONS_WITHOUT_ENDPOINT`) — outro repo.
- Cascata de planos: **eliminada** por D2.

## Invariantes

- Domínio puro: sem `throw`, sem `class`, `Result<T,E>`, erros EN kebab-case.
- Application não importa `adapters/`; use case é factory function.
- ADR-0014 (só `bgp_*`) · ADR-0020 (dialeto MySQL) · ADR-0006 (sem tocar outro módulo).
- Regressão zero: baseline **4097** testes, 0 falhas.
- Validação em **MySQL real** (x99 offline → container descartável; `test:integration:*` **destrói a
  infra dev**).

## Waves

| Wave | Agente/Skill | Saída |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | `002-tests/REPORT.md` — RED |
| **W1** | `ts-domain-modeler` (guarda) + `drizzle-orm-expert` (transação) | `003-impl/REPORT.md` |
| **W2** | `code-reviewer` | `004-code-review/REVIEW.md` — máx 3 rounds |
| **W3** | `ts-quality-checker` | `005-quality/REPORT.md` |
