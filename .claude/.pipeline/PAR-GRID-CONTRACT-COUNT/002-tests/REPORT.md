# W0 — Testes RED · PAR-GRID-CONTRACT-COUNT

> Skill: `tdd-strategist` · Outcome: **RED** · Driver: memory (`fastify.inject`)

## Arquivo

`tests/modules/partners/adapters/http/grids-contract-count.routes.test.ts` (novo).

## Cobertura (CAs → `it()`)

| Grid | Rota | CA1 (`=N`) | CA2 (`=0`) | CA3 (read-model only) |
| :--- | :--- | :---: | :---: | :---: |
| Colaboradores | `GET /api/v1/collaborators` | ✓ | ✓ | ✓ (teste dedicado, `activeCount=7`) |
| Fornecedores | `GET /api/v1/suppliers` | ✓ | ✓ | implícito (valor só do seed) |
| Financiadores | `GET /api/v1/financiers` | ✓ | ✓ | implícito |
| Atos | `GET /api/v1/acts` | ✓ | ✓ | implícito |

- **CA1** — contractor semeado em `contractCounts` → linha traz `contractCount = N` (3/2/5/4 por grid).
- **CA2** — contractor sem entrada no read-model → `contractCount = 0` (nunca `null`/ausente).
- **CA3** — o app de teste **não monta o módulo `contracts`**; o valor exibido (`7`) só pode vir do
  read-model `par_contract_count_view` semeado (ADR-0006: partners não consulta contracts).

## Resultado (RED esperado)

```
✖ collaborators · CA1+CA2   → undefined !== 3 / !== 0
✖ collaborators · CA3       → undefined !== 7
✖ suppliers     · CA1+CA2   → undefined !== 2
✖ financiers    · CA1+CA2   → undefined !== 5
✖ acts          · CA1+CA2   → undefined !== 4
# tests 5 · fail 5 · pass 0
```

**RED pela razão certa:** toda falha é `AssertionError: undefined !== N` — a coluna `contractCount`
não existe em nenhum DTO de grid. Nenhuma falha por import/símbolo inexistente ou crash de runtime
(os imports de `*HttpPlugin`, permissions e domínio já existem; o seed `contractCounts` é campo extra
silenciosamente ignorado pelo composition atual).

## Contrato que o W1 deve satisfazer (GREEN)

1. **Seed (driver memory):** `PartnersSeed.contractCounts?: readonly { contractorRef: string; activeCount: number }[]`
   — popula o `ContractCountStore` InMemory no `buildMemoryPools`.
2. **Wiring:** injetar `ContractCountStore` nos `Pools` (InMemory p/ memory, `createDrizzleContractCountStore` p/ mysql)
   e expor a leitura em `PartnersHttpDeps`.
3. **DTO + handler:** cada linha dos 4 grids ganha `contractCount: number` (default `0`), lido do read-model.
   Evitar N+1 na borda paginada (decisão de design do 000-request: avaliar `getCounts(refs[])` batch).

## Próxima wave

W1 (GREEN) — skill `ts-domain-modeler`/`ports-and-adapters` + borda HTTP. Implementar o mínimo até os 5 testes passarem, sem regressão nos grids existentes.

## Adendo — Round 2 (sugestões do W2)

Suíte estendida de 5 → **12 testes**: CA3 dedicado nos 4 grids + teste de detalhe (`GET /:id`) nos 4
grids (RED por `contractCount` ausente no detalhe → GREEN após Sugestão 1 do W1 round 2).
