# W1 — REPORT (BDG-COST-STRUCTURE, #316) — PARCIAL

> Camada de **domínio GREEN + auditada**. Persistência + borda HTTP = próximo bloco do W1.

## Feito (domínio puro — `src/modules/budget-plans/domain/cost-structure/`)
- **VOs** `cost-direction.ts` / `launch-type.ts` — union de literais (não `Brand<string>`, decisão do
  `typescript-language-expert`): `'A PAGAR'|'A RECEBER'` e os 4 launchTypes (`IPCA`/`CAED`/`DESPESAS_PESSOAIS`/
  `DESPESAS_LOGISTICAS`), com `isCostDirection`/`isLaunchType` (exaustividade p/ o `switch` da US3).
- **IDs** `cost-center-id`/`category-id`/`subcategory-id` — branded UUID v4 (molde `budget-plan-id`).
- **`types.ts`** — CostStructure→CostCenter→Category→Subcategory, imutável (Readonly). Árvore FIXA 3 níveis.
- **`errors.ts`** — union: `budget-plan-not-editable` · `cost-node-name-required` · `cost-node-parent-not-found` · `cost-node-invalid-direction` · `cost-node-invalid-launch-type`.
- **`cost-structure.ts`** — `empty`/`addCostCenter`/`addCategory`/`addSubcategory` puros, editabilidade por status.

## Testes (W0 → GREEN)
`launch-type` 2 · `cost-direction` 2 · `cost-structure` 6 (CA1 árvore, CA2 edição/nome/órfão/direction, CA3 APROVADO bloqueia) = **10/10**.
Gate parcial: typecheck ✅ · lint ✅ · format ✅.

## Auditoria de type system (typescript-language-expert)
Aplicado: VOs → union literal (exaustividade a jusante) + type predicates. Confirmado manter: duplicação dos
3 IDs (module-as-namespace, house style) e inputs `direction/launchType: string` validados no domínio (fail-closed).

## Pendente do W1 (próximo bloco)
- **Schema Drizzle** `bgp_cost_centers`/`bgp_categories`/`bgp_subcategories` (adjacency FK CASCADE, UUID `utf8mb4_bin`) + migration → skill `drizzle-schema-author` + validar com agente `mysql-database-expert`.
- **Repo** in-memory + Drizzle + mappers (contrato de persistência) + reconstrução da árvore por 3 SELECTs.
- **Borda HTTP** — GET árvore + POST/PATCH/DELETE nós (editabilidade por status) + use-cases.
- Depois: W2 (`code-reviewer` + `drizzle-orm-expert`) + W3 (`ts-quality-checker` + integração).

---

## W1-A — Persistência (GREEN)

> Fatia A do restante do W1: **camada de persistência** da árvore de custos. Aplicação + borda HTTP = W1-B (próxima fatia). W1 segue **in-progress** (não fechado).

### Rota de skills (uma por vez)
`ports-and-adapters` (port) → `drizzle-schema-author` (schema+migration) → implementação dos adapters (repos/mappers, sob `ports-and-adapters`).

### Disciplina fail-first
Suíte RED escrita primeiro (consome o port inexistente) → `pnpm test` RED confirmado por `ERR_MODULE_NOT_FOUND` (`cost-structure-repository.in-memory.ts` ausente). Só então port→schema→mapper→repos até GREEN.

### Arquivos criados
- **Port** `src/modules/budget-plans/domain/cost-structure/repository.ts` — `CostStructureRepository { findByBudgetPlanId, save }` + `CostStructureRepositoryError = 'cost-structure-repo-unavailable'`. `findByBudgetPlanId` devolve `empty(id)` (nunca null) quando não há nós.
- **Mapper** `adapters/persistence/mappers/cost-structure.mapper.ts` — `costStructureToRows` (achata árvore → 3 listas de rows) e `costStructureFromRows` (rows→domínio, fail-closed via `CostCenterId/CategoryId/SubcategoryId.rehydrate` + `CostDirection.parse`/`LaunchType.parse`; agrupa filhos por FK com `groupBy`). Erro: `CostStructureMapperError` (5 variantes).
- **Repo in-memory** `adapters/persistence/repos/cost-structure-repository.in-memory.ts` — `Map<string, CostStructure>` chaveado por budgetPlanId (armazenar a estrutura inteira já é replace-all).
- **Repo Drizzle** `adapters/persistence/repos/cost-structure-repository.drizzle.ts` — `findByBudgetPlanId` faz **3 SELECTs** (cost_centers WHERE budget_plan_id; categories WHERE cost_center_id IN(...); subcategories WHERE category_id IN(...)) + montagem via mapper; `save` em `db.transaction` (delete raiz → cascade derruba filhos → reinsert top-down). Wrapper `safe` (molde do budget-plan repo).
- **Suíte** `tests/.../cost-structure-repository.suite.ts` + `cost-structure.inmemory.test.ts` + `cost-structure.drizzle-mysql.test.ts` (integração atrás de `MYSQL_INTEGRATION=1`, factory semeia `bgp_budget_plans` p/ satisfazer a FK).

### Arquivos editados
- **Schema** `adapters/persistence/schemas/mysql.ts` — append das 3 tabelas `bgp_*` (varchar(36) UUID, `direction`/`launch_type` via CHECK — sem ENUM, ADR-0020; FK `.onDelete('cascade')`; índice na FK de cada filho) + exports de row types.
- **Migration** `migrations/mysql/0001_absent_randall_flagg.sql` — gerada por `pnpm run db:generate:budget-plans` + **edição manual** do `COLLATE utf8mb4_bin` nas colunas UUID (casamento p/ FK) e `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` por tabela (espelhando 0000; drizzle-kit não expõe charset/collate).

### Decisões
- Árvore vazia é válida → `findByBudgetPlanId` retorna `empty(id)`, nunca null (chamador não distingue "sem plano" de "sem nós").
- `save` replace-all sem diff incremental (coleção pequena; molde do replace dos filhos no `BudgetPlanRepository`). Sem eventos/outbox (YAGNI — escopo é só estrutura).
- Reconstrução por 3 SELECTs + montagem em app (`WITH RECURSIVE` dispensável — árvore FIXA 3 níveis).
- Mapper fail-closed: `direction`/`launchType` inválidos vindos do banco viram `CostStructureMapperError` (dentro do `safe` → `cost-structure-repo-unavailable`).
- Comparação order-insensitive na suíte (`sortById`): 3 SELECTs não garantem ordem; contrato vale p/ in-memory e Drizzle.
- `.values([...rows])` (spread) porque drizzle `.values()` não aceita `readonly[]` (mapper devolve rows readonly).

### Saída literal dos gates
```
# node --test (só cost-structure)
ℹ tests 5
ℹ pass 5
ℹ fail 0
ℹ skipped 0   (integração drizzle-mysql gated: só o teste estrutural "shape" roda)

# pnpm test (suíte inteira)
ℹ tests 3543
ℹ pass 3525
ℹ fail 0
ℹ skipped 18

# pnpm run typecheck
$ tsc --noEmit   → 0 erros

# eslint (8 arquivos tocados) → LINT_OK (0 problemas)
```

### Round-trip confirmado (in-memory)
Árvore de 3 níveis salva → `findByBudgetPlanId` reconstrói idêntica (deepEqual normalizado); plano sem nós → árvore vazia; múltiplos cost-centers/categories/subcategories preservam agrupamento; segundo `save` substitui a árvore inteira (replace-all).

### Resta (W1-B — não nesta fatia)
- **Aplicação** — use-cases (GET árvore, add/edit/remove nós com editabilidade por `BudgetPlanStatus`).
- **Borda HTTP** — rotas GET/POST/PATCH/DELETE + validação de borda.
- Validação real do Drizzle/MySQL no x99 (fiscal): rodar `cost-structure.drizzle-mysql.test.ts` com `MYSQL_INTEGRATION=1` + auditoria do SQL emitido pelo `mysql-database-expert`.

---

## W1-A — Ajustes pós-auditoria (`mysql-database-expert`, estática)

Q1/Q4-shape/Q5 = OK. 2 ajustes aceitos aplicados; Q4 (TOCTOU) anotado como pendência do W1-B.

### AJUSTE 1 (Q3 — crítico): `ORDER BY` determinístico nos 3 SELECTs
`cost-structure-repository.drizzle.ts` — os 3 SELECTs de reconstrução agora fazem `.orderBy(<tabela>.name, <tabela>.id)` (nome como chave, id como tiebreak). Sem `ORDER BY` a ordem entre irmãos é indefinida no MySQL → divergiria do in-memory (que preserva inserção) e da árvore que o W1-B expõe no GET pra UI. A suíte mantém `sortById` (comparação order-insensitive) como robustez; assertivas inalteradas, seguem GREEN.

### AJUSTE 2 (Q2 — baixa sev.): remoção dos 3 índices redundantes com a FK
`schemas/mysql.ts` — removidas as declarações `index('bgp_cost_centers_budget_plan_id_idx')`, `index('bgp_categories_cost_center_id_idx')`, `index('bgp_subcategories_category_id_idx')`. O índice implícito criado pelo InnoDB no `ADD FOREIGN KEY` já cobre o filtro (molde de `bgp_budgets`); cada tabela ganhou comentário de 1 linha explicando. Import `index` mantido (ainda usado por `bgp_budget_plans`/outbox).
- **Migration regenerada LIMPA**: `0001_absent_randall_flagg.sql` + `meta/0001_snapshot.json` deletados, entrada 0001 revertida no `_journal.json`, `pnpm run db:generate:budget-plans` gerou **`0001_normal_santa_claus.sql`**. Confirmado: **sem `CREATE INDEX`** nas 3 tabelas novas, **mantém** as 3 FKs `ON DELETE cascade` e os 2 CHECK (direction/launch_type). `COLLATE utf8mb4_bin` reaplicado nas colunas UUID (id + FKs) + header `ENGINE/CHARSET` por tabela.

### Pendência Q4 → W1-B (NÃO implementada nesta fatia)
Quando o W1-B implementar a escrita via use-case/borda, o `save` precisa **travar o header do plano** com `SELECT status FROM bgp_budget_plans WHERE id=? FOR UPDATE` e **revalidar `guardEditable(status)` DENTRO da mesma transação** (molde de `budget-plan-repository.drizzle.ts:145-149`) — senão CA3 (bloqueio de plano APROVADO) é furável por TOCTOU. O `CostStructureRepository.save` atual (replace-all puro, sem checagem de status) é adequado à fatia de persistência, mas insuficiente para o fluxo de escrita transacional do W1-B.

### Saída literal dos gates (pós-ajustes)
```
# pnpm run typecheck
$ tsc --noEmit   → 0 erros

# node --test (só cost-structure)
ℹ tests 5
ℹ pass 5
ℹ fail 0
ℹ skipped 0

# pnpm test (suíte inteira)
ℹ tests 3543
ℹ pass 3525
ℹ fail 0
ℹ skipped 18

# eslint (drizzle repo + schema) → limpo
```

---

## W1-B — Aplicação + Borda (GREEN)

> Fatia B do W1: **use-cases + borda HTTP** da árvore de custos. Fecha a pendência Q4 (TOCTOU) com escrita atômica. W1 segue **in-progress** (falta W2 review + W3 gate + integração x99). Escopo IN: GET árvore (CA1) + ADD dos 3 níveis (CA2) + bloqueio por status (CA3). OUT: edit/rename/remove de nó (fatia W1-C) e cálculo de valores (#317).

### Rota de skills (uma por vez)
`ports-and-adapters` (port `mutate` + adapters + 4 use-cases) → espelhamento da borda pelos moldes existentes (`plugin`/`schemas`/`dto`/`composition` do próprio módulo).

### Disciplina fail-first (W0 desta fatia)
Testes RED escritos ANTES do código de produção. `pnpm test` RED confirmado: **16 falhas**, todas das novas suítes (4 arquivos de use-case falhando por `ERR_MODULE_NOT_FOUND`; 3 testes `mutate` na suíte de contrato com `repo.mutate is not a function`; 9 testes de rota com 404/401/403 por rotas inexistentes), **zero regressão** (3526 pass). Só então implementei port→adapters→use-cases→dto→schemas→rotas→composition até GREEN.

### Desenho da escrita atômica (`mutate` / fecha Q4-TOCTOU)
Port ganhou `mutate(budgetPlanId, apply) → Promise<Result<CostStructure, CostStructureMutateError>>`, onde `apply: (structure, planStatus) => Result<CostStructure, CostStructureError>` (a op de domínio `add*`). `CostStructureMutateError = CostStructureRepositoryError | CostStructureError | 'budget-plan-not-found'`.
- **Adapter Drizzle** — numa única `db.transaction`: `SELECT status FROM bgp_budget_plans WHERE id=? FOR UPDATE` (molde `budget-plan-repository.drizzle.ts:145-149`); linha ausente → `err('budget-plan-not-found')`; status corrompido → throw → `cost-structure-repo-unavailable` (fail-closed); carrega a árvore DENTRO da tx (helper `selectTree(tx, id)` reusado do `findByBudgetPlanId`); `applied = apply(structure, status)`; se `!applied.ok` devolve o erro SEM escrever (rollback natural por não tocar linha alguma); senão reescreve via `writeTree(tx, applied.value)` (delete-cascade + reinsert, reusado do `save`) na MESMA tx. Helpers `selectTree`/`writeTree` extraídos e compartilhados por find/save/mutate (sem duplicação).
- **Adapter in-memory** — construtor agora recebe `readPlanStatus?: (id) => Promise<BudgetPlanStatus | null>` (default → sempre `null`, mantém verde a suíte W1-A que só usa save/find). `mutate`: `status = await readPlanStatus(id)`; `null` → `budget-plan-not-found`; aplica sobre a árvore atual (ou `empty(id)`); se ok, persiste e devolve `ok(applied.value)`.
- `findByBudgetPlanId` (GET) e `save` (round-trip W1-A) **mantidos**; `save` documentado como primitivo low-level NÃO guardado; `mutate` é o único caminho de escrita de negócio.

### Arquivos criados
- **Use-cases** (`application/use-cases/`): `get-cost-structure.ts` (valida id → `planRepo.findById` null→not-found → `costStructureRepo.findByBudgetPlanId`); `add-cost-center.ts` / `add-category.ts` / `add-subcategory.ts` (factory `(deps)=>(cmd)=>`, valida ids via rehydrate → gera o id do nó → `costStructureRepo.mutate(planId, (s,st)=>add*(s,{...},st))`).
- **DTO** `adapters/http/cost-structure-dto.ts` — `costStructureToDto(structure)` serializa branded ids → string (árvore inteira; usado no GET e nos 3 POSTs).
- **Testes** — 4 de use-case (`get`/`add-cost-center`/`add-category`/`add-subcategory`) + `_cost-support.ts` (repo in-memory com status stub) + `cost-structure.routes.test.ts` (fastify.inject). Suíte de contrato estendida com 3 testes `mutate` (persiste / rollback-on-err / not-found), rodando em ambos os backends (drizzle gated).

### Arquivos editados
- **Port** `domain/cost-structure/repository.ts` — `+ mutate`, `+ CostStructureMutation`, `+ CostStructureMutateError`.
- **Adapters** in-memory (`+ readPlanStatus` + `mutate`) e drizzle (helpers `selectTree`/`writeTree` + `mutate` com FOR UPDATE).
- **Borda** `schemas.ts` (`+ addCostCenterBodySchema`/`addCategoryBodySchema`/`addSubcategoryBodySchema`/`costStructureTreeSchema`, Zod só na borda — ADR-0027); `plugin.ts` (`+4 rotas` + entradas no `WRITE_ERROR_STATUS`); `composition.ts` (`+ costStructureRepo` memory/mysql, `+4 use-cases`, `+ seed.plans` p/ semear plano APROVADO — o agregado só nasce RASCUNHO).
- **Suíte/factory** in-memory atualizada para injetar `readPlanStatus`.

### Rotas criadas (sob `/api/v2/budget-plans/:id/cost-structure`)
| Método | Rota | RBAC | Sucesso |
| :-- | :-- | :-- | :-- |
| GET | `.../cost-structure` | `budget-plan:read` | 200 + árvore |
| POST | `.../cost-structure/cost-centers` | `budget-plan:write` | 201 + árvore |
| POST | `.../cost-structure/categories` | `budget-plan:write` | 201 + árvore |
| POST | `.../cost-structure/subcategories` | `budget-plan:write` | 201 + árvore |

### Mapa erro → HTTP (adicionado ao `WRITE_ERROR_STATUS`)
`budget-plan-not-editable` → **409** (CA3) · `cost-node-parent-not-found` → **400** (órfão) · `cost-node-name-required` → **400** · `cost-node-invalid-direction` / `cost-node-invalid-launch-type` → **422** · `cost-center-id-invalid` / `category-id-invalid` → **422** · `budget-plan-not-found` → **404** (já existia) · `cost-structure-repo-unavailable` → **503** · body malformado (Zod) → 400/422.

### CA verdes (testes)
- **CA1** — `getCostStructure`: plano sem nós → árvore vazia; plano com árvore de 3 níveis → reconstrói; not-found / id-invalid. Rota GET: 200 árvore vazia, 404 inexistente, 401/403.
- **CA2** — `add*`: adiciona nos 3 níveis; órfão (pai ausente) → `cost-node-parent-not-found`; nome vazio; direção/launchType inválidos; id malformado. Rota POST: cadeia cost-center→category→subcategory cada um 201 + árvore; categoria órfã → 400; body malformado → 4xx.
- **CA3** — `add*` em plano APROVADO → `budget-plan-not-editable`. Rota POST em plano APROVADO (semeado) → **409**.

### Saída literal dos gates
```
# node --test (só cost-structure, sem MYSQL_INTEGRATION)
ℹ tests 40
ℹ pass 40
ℹ fail 0
  (drizzle-mysql mutate corretamente GATED: só o teste estrutural "shape" roda; sem conexão)

# pnpm test (suíte inteira)
ℹ tests 3578
ℹ suites 1040
ℹ pass 3560
ℹ fail 0
ℹ cancelled 0
ℹ todo 0

# pnpm run typecheck
$ tsc --noEmit   → 0 erros
```

### Resta (não nesta fatia)
- **W2 review** — `code-reviewer` + auditoria da borda pelo `fastify-server-expert` + schemas Zod pelo `zod-expert` (par obrigatório).
- **W3 gate** — `ts-quality-checker` (typecheck + format:check + lint + test). Format/lint dos arquivos de sub-agente rodados na sessão principal antes do W3.
- **Integração x99** — `cost-structure.drizzle-mysql.test.ts` com `MYSQL_INTEGRATION=1` valida o `FOR UPDATE` real + auditoria do SQL pelo `mysql-database-expert`.
- **Fatia W1-C** — edit/rename e remove de nó (exige novas ops de domínio + W0 RED próprio).
