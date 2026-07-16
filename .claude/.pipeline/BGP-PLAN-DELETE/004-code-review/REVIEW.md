# W2 — Code review (#453)

> Agente: `code-reviewer` (read-only, independente) · **Round 1 de 3** · Veredito inicial: **REJEITADO** → corrigido → **APROVADO**.

## Sem Blocker

Caminho single-user correto: ordem da tx (results → plano), guarda pura, 204/404/409/400/401
testados, só `bgp_*` (ADR-0014), SQL na lista permitida do ADR-0020 (**aberto e citado**), `import
type`, extensões `.ts`, domínio sem `throw`/`class`, use case factory sem importar `adapters/`.
Sem colisão de rota (`/budget-plans/:id` DELETE × `/:id/budgets/:budgetId` DELETE têm profundidades
diferentes). Permissão `BUDGET_PLAN_PERMISSION.write`, igual às demais escritas.

## Achados e desfecho

| Sev | Achado | Desfecho |
| :--- | :--- | :--- |
| **Major 1** | `remove` não travava o plano — orçamento concorrente → **resultado órfão** | **CORRIGIDO** |
| **Major 2** | CA2 promete rollback e **nenhum teste provava** | **CORRIGIDO com teste** |
| Minor 6 | TOCTOU devolvia **503**, não 409 | **CORRIGIDO** |
| Minor 5 | `remove(plan)` prometia mais do que usava | **CORRIGIDO** → `remove(planId)` |
| Minor 4 | `break` invariante dentro do laço (in-memory) | **CORRIGIDO** |
| Minor 3 | in-memory não apaga a árvore de custo | **Aceito** — ver abaixo |
| Minor 7 | teste "guarda é pura" quase tautológico | **Mantido** — ver abaixo |

### Major 1 — o furo era exatamente o defeito que o ticket existe para impedir

O `SELECT` dos budgets dentro da tx é leitura **consistente** (snapshot); o `DELETE` do plano é
**current read**. Sem travar o cabeçalho, um writer concorrente escapa:

> T1 `DELETE P` → `BEGIN`, lê budgets → `[B1]`. T2: `addBudget` (cria B2) + lança resultado R2 para
> B2 → commit. T1 apaga results `WHERE budget_id IN (B1)` — só B1 — e apaga P → CASCADE leva B1 **e
> B2** → **R2 sobrevive órfão e segue somando no total por Rede.**

`upsertPlanInTx` (`:73-77`) já usava `.for('update')`; o `remove` era o **único** caminho de escrita
do módulo sem trava. Fix: `SELECT id … FOR UPDATE` como 1º statement — precedente no próprio arquivo.

### Major 2 — o CA2 estava afirmado por comentário, não por teste

O W0 chamou a atomicidade de "coração do ticket" e os dois casos eram caminho feliz + escopo. Um
refactor para dois `await` soltos **manteria tudo verde** enquanto corrompe dado. O irmão do #377
tem caso de rollback; este não tinha.

Gatilho usado (sugestão do revisor): um plano **filho** faz o FK RESTRICT derrubar o `DELETE` do
plano — que roda **depois** do delete dos results, na mesma tx. Havendo rollback, os results voltam.
O truque do #377 (evento de outbox malformado) não servia: `remove` não recebe `events`.

O teste tem dentes: sem tx, o passo 1 já teria commitado e o assert de `countResults === 1` falha.
De quebra, valida a detecção do errno **1451** contra o erro real do MySQL.

### Minor 6 — 503 mandava o cliente tentar para sempre

Na corrida entre `listChildren` (fora da tx) e o delete, quem barra é a FK RESTRICT → `safe()`
achatava em `budget-plan-repo-unavailable` → **503**. A integridade se preservava, mas 503 significa
"tente de novo depois" e o retry **nunca** passaria. Agora `safeRemove` distingue: 1451 na
`bgp_budget_plans_parent_id_fk` → `budget-plan-has-children` → **409**, o mesmo que a guarda devolve.
Os dois caminhos convergem para a mesma resposta.

### Minor 5 — o contrato ficou honesto

`remove(plan)` usava só `plan.id` no drizzle e `plan.budgets` no in-memory: um agregado velho mudava
o comportamento **entre adapters**, em silêncio, e os 2 casos da suíte (plano sem budgets) não
pegariam. Agora `remove(planId)`; o in-memory lê os budgets do **próprio store**, como o mysql lê do
banco.

### Minor 3 — aceito com justificativa

O in-memory não apaga `cost_centers → categories → subcategories` (no mysql saem por CASCADE). Não é
observável: `getCostStructure` valida `findById` antes → 404. É vazamento só no driver `memory`
(dev/testes), e injetar o `costStructureRepo` no repositório de planos é escopo que o ticket não pede.
**Produção (drizzle) está correta.** Registrado aqui em vez de corrigido — ADR-0040.

### Minor 7 — mantido de propósito

`guarda é pura: rejeitar não muda o plano` só falharia se alguém introduzisse mutação — que é
exatamente o que ele existe para impedir (`.claude/rules/domain.md`: imutabilidade absoluta). Custo
zero, trava uma invariante de camada.

## Perguntas do W2 respondidas pelo revisor (verificadas, não assumidas)

- **`inArray` estoura?** Não. Budgets são 1 por Rede (27 UFs + municípios); milhares de UUIDs ficam
  em centenas de KB, longe do `max_allowed_packet` (64MB no 8.4).
- **`budgetRows` vazio?** Seguro nos dois caminhos: a guarda pula o delete e, mesmo sem ela, o
  Drizzle 0.45.2 renderiza `inArray(col, [])` como `sql\`false\`` → `DELETE … WHERE false`, no-op.

## Re-verificação após as correções

`typecheck` ✓ · `lint` ✓ · `format:check` ✓ · `pnpm test` → **4116 testes, fail 0**.
MySQL real (8.4, descartável): **23/23** — contrato do port nos 2 adapters + `remove-plan-atomic`
(4 casos, incl. rollback) + `remove-budget-atomic` (#377, sem regressão) + `plan-lifecycle`.
Infra dev parada e **restaurada** (`Up (healthy)` conferido).

## Veredito final: **APROVADO** — round 1

Os 2 Majors corrigidos com precedente local; Minors 4/5/6 corrigidos; 3 e 7 aceitos com razão
declarada.
