# W0 — Testes RED (#453)

> Agente: `tdd-strategist` · Resultado: **RED** · 4 arquivos, 20 casos.

## Comando

```bash
node --test --experimental-strip-types --no-warnings --test-reporter=tap \
  'tests/modules/budget-plans/domain/budget-plan/remove-plan.test.ts' \
  'tests/modules/budget-plans/adapters/http/plan-delete.routes.test.ts'
# 0 pass — tudo RED por inexistência da API
```

## Arquivos

| Arquivo | CAs | Camada |
| :--- | :--- | :--- |
| `domain/budget-plan/remove-plan.test.ts` | CA1/CA3/CA4/CA7 | unit (guarda pura) |
| `adapters/persistence/budget-plan-repository.suite.ts` (+2 casos) | contrato do port | contract (roda nos **2** adapters) |
| `adapters/persistence/remove-plan-atomic.drizzle-mysql.test.ts` | CA2 | integração (MySQL real, opt-in) |
| `adapters/http/plan-delete.routes.test.ts` | CA1/CA3/CA4/CA5/CA6 | borda (`fastify.inject`) |

## O falso-verde que o W0 pegou em si mesmo

A 1ª versão do **CA5** (`id inexistente → 404`) **passou de primeira** — e pelo motivo errado: sem a
rota, o **404 é o do Fastify**, indistinguível do 404 do domínio. Teria ficado verde no W0 e no W3
sem nada implementado.

Corrigido: o teste agora exige o **código** no envelope (`error.code === 'budget-plan-not-found'`).
Rota ausente devolve o 404 genérico, sem código → RED. Todos os 20 casos falham agora.

## Por que o teste de MySQL real é o coração do ticket

O schema **não apaga tudo sozinho**:

```
bgp_budget_plans (parent_id → self, RESTRICT)
├── bgp_budgets        (→ plan, CASCADE)                      ✔ o banco cuida
├── bgp_cost_centers   (→ plan, CASCADE) → categories → subcategories   ✔ o banco cuida
└── bgp_budget_results (budget_id, subcategory_id — SEM FK)    ✘ ORFANA
```

`bgp_budget_results` **não tem FK nenhuma** (decisão do #377: o pai sofre replace-all). Um `DELETE`
do plano cascateia os orçamentos e deixa os resultados apontando para um budget que não existe mais —
**lixo invisível que ainda soma no total por Rede**. Trocaríamos *"não dá pra excluir"* por
*"excluir corrompe"*. Por isso o CA2 verifica a contagem de `bgp_budget_results` **depois** do
delete, e não só o sumiço do plano.

O 2º caso do CA2 (*"apagar um plano não apaga dado de outro"*) trava o erro oposto: um `DELETE` de
results sem escopo — que passaria no 1º caso.

## Achado do W0: o banco já é o backstop de D2

`bgp_budget_plans.parent_id` tem FK auto-referente **`onDelete('restrict')`**, com o comentário
literal *"restrict — não há delete de plano"*. Ou seja, o banco **já** recusa apagar um plano com
filhos. Isso **não dispensa** a guarda de domínio: o erro de FK viraria **500**, e o CA4 exige
**409**. O RESTRICT vira rede de segurança — se a guarda falhar, o banco não deixa corromper.

## Decisões cobertas por teste (as duas são de produto)

- **D1 (APROVADO bloqueia)** — CA3 no domínio e na borda. A borda verifica também que o plano
  **continua lá** depois do 409: um 409 não vale nada se o dado sumiu assim mesmo.
- **D2 (filhos bloqueiam)** — CA4. Inclui o caso **`RASCUNHO` com cenário**, que só existe porque
  `createScenery` exige pai **não**-aprovado. Sem ele, alguém "otimizaria" a guarda para checar
  filhos só quando `APROVADO` e o cenário sumiria junto com o pai, sem ninguém ver.
- **Precedência** — `APROVADO` **E** com filhos → `already-approved`. Trava a mensagem que o
  usuário lê quando os dois motivos coexistem.

Há ainda o caminho de saída do 409 (`CA4: apagado o cenário, o pai passa a aceitar DELETE`): sem ele
o bloqueio poderia ser permanente e nenhum teste notaria.

## Gating

O caso MySQL fica atrás de `MYSQL_INTEGRATION=1` (padrão do módulo). No `pnpm test` puro só o teste
estrutural roda. Validação em container **descartável** no W3 — x99 offline e `test:integration:*`
**destrói a infra dev**.

## Próxima wave

**W1** — `ts-domain-modeler` (guarda) + `drizzle-orm-expert` (transação).
