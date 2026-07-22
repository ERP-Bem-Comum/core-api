# W3 — Gate de qualidade (#453)

> Agente: `ts-quality-checker` · Resultado: **VERDE**.

## Gate

| Comando | Exit |
| :--- | :--- |
| `pnpm run typecheck` | **0** |
| `pnpm run format:check` | **0** |
| `pnpm run lint` | **0** |
| `pnpm test` | **0** |

`pnpm test`: **4116 testes · pass 4093 · fail 0 · skipped 18** (baseline 4097 + 19).

## MySQL real (8.4) — container descartável

x99 offline. O `remove-plan-atomic` respeita `BUDGET_PLANS_DATABASE_URL` e rodou na **3308**, sem
tocar a infra dev. O `drizzle-mysql.test.ts` (consumidor da suíte de contrato) **hardcoda
`127.0.0.1:3306`** — convenção do projeto —, então exigiu a receita documentada: parar
`core-api-mysql` → descartável na 3306 → validar → **restaurar** (feito; `Up (healthy)` conferido).
Nunca `pnpm test:integration:*` — destrói a infra dev.

**23/23 verdes:** contrato do port nos **2** adapters · `remove-plan-atomic` (4 casos) ·
`remove-budget-atomic` (#377 — sem regressão) · `plan-lifecycle`.

## CAs

| CA | Prova |
| :--- | :--- |
| CA1 | `RASCUNHO` sem filhos → **204**, some da leitura |
| CA2 | plano + orçamentos + resultados somem juntos · **rollback devolve os results** · delete escopado (não toca outro plano) |
| CA3 | `APROVADO` → **409**, e o plano **continua lá** |
| CA4 | com filho (calibração **ou** cenário, inclusive sob `RASCUNHO`) → **409**, pai e filho intactos; apagado o filho, o pai sai |
| CA5 | inexistente → **404** `budget-plan-not-found` (o código, não o 404 de rota ausente) |
| CA6 | id malformado → **400** |
| CA7 | `EM_CALIBRACAO` sem filhos → **204** |

## O que este ticket não é

Não é "adicionar uma rota". O schema **não apaga tudo sozinho**: `bgp_budget_results` não tem FK
nenhuma, então um `DELETE` ingênuo do plano cascatearia os orçamentos e deixaria os lançamentos
órfãos — **lixo que ainda soma no total por Rede**. Trocaríamos *"não dá pra excluir"* por
*"excluir corrompe"*. Daí a transação com `FOR UPDATE`, a ordem (results → plano) e os 4 casos de CA2.

## Decisões de produto travadas em teste

- **D1 `APROVADO` não sai** — o Consolidado ABC agrega aprovados (apagar reescreveria resultado já
  reportado) e `fin_documents.budget_plan_ref` aponta para planos **sem FK**.
- **D2 filhos saem antes do pai** — vale também para `RASCUNHO` com cenário, caso que só existe
  porque `createScenery` exige pai **não**-aprovado.

Os dois 409 convergem: guarda de domínio no caminho normal, FK RESTRICT na corrida.

## Follow-up registrado (ADR-0040 — não corrigido aqui)

- **In-memory não apaga a árvore de custo** (`cost_centers → categories → subcategories`); no mysql
  saem por CASCADE. Não observável via HTTP (`getCostStructure` valida `findById` → 404) e restrito
  ao driver `memory`. Produção correta.

## Ticket

Pronto para `close` e PR. **Front:** basta remover `'delete'` de `ACTIONS_WITHOUT_ENDPOINT` — outro repo.
