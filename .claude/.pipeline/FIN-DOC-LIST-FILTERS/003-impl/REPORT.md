# W1 — GREEN (FIN-DOC-LIST-FILTERS)

**Agente:** drizzle-orm-expert (read-model). **Outcome:** GREEN

## Mudanças
- **Domínio** `document/query.ts` — `DocumentListFilter` += `supplierRefs`/`types` (multi), `contractRef`, `programRef`, `valorMin`/`valorMax`, `sort`/`order`; tipos `DocumentListSort`/`DocumentListOrder`.
- **Borda** `schemas.ts` — `type`/`supplierRef` aceitam single OU array; +`contractRef`/`programRef`/`valorMin`/`valorMax`/`sort`/`order`.
- **Handler** `plugin.ts` — normaliza single/array → campo certo; repassa novos filtros.
- **Drizzle** `document-repository.drizzle.ts` — `inArray` (multi, precedência sobre single), `eq` (contract/program), `gte/lte` (netValue), `orderBy` dinâmico (dueDate/netValue/supplierName + asc/desc, desempate id asc).
- **In-memory** `document-repository.in-memory.ts` — `matchesFilter` cobre os novos filtros; sort dinâmico (dueDate/netValue; supplierName cai no default em memória → x99).

## Testes
- HTTP (memory) CA1–CA4 GREEN; #167 sem regressão (7/7). typecheck limpo.
- x99 CA5 (netValue range + sort=supplierName, sem duplicar) atrás de `MYSQL_INTEGRATION=1`.

## Fora de escopo
numDoc/cnpjCpf (#167 q); Visões Salvas (#351).
