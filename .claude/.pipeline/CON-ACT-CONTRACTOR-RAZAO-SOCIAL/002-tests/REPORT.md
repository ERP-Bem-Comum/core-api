# W0 — RED — CON-ACT-CONTRACTOR-RAZAO-SOCIAL

**Data:** 2026-06-15 · **Skill:** tdd-strategist · **Resultado:** RED ✅ (`pnpm test`: 2622 pass / 6 fail)

Testes que falham por inexistência da feature (opção 1: `snapshot.name` = razão social do ACT). Suíte
existente intacta; nenhum toque em `src/`.

## Arquivos de teste

### Estendidos (caso RED novo; suíte do arquivo permanece verde)
- `tests/modules/partners/public-api/contractor-view.mapper.test.ts` — `actToView` expõe
  `corporateName` (= `act.corporateName`), distinto de `name`. RED: campo inexistente na `ActView`.
- `tests/modules/partners/adapters/http/partner-aggregate-query.test.ts` — item de ACT tem
  `name === corporateName`. RED: `actItem` projeta `act.name`.
- `tests/modules/contracts/adapters/http/contractor-composition.test.ts` — ACT via `composeContractor`
  (port fake) → `snapshot.name = corporateName`; **+ não-regressão** (collaborator/financier mantêm `name`).
  RED: ramo `act` do `viewToSnapshot` usa `view.name`.

### Criados
- `tests/modules/contracts/adapters/http/contractor-act-razao-social.routes.test.ts` — `fastify.inject`,
  driver memory + `ContractorReadPort` fake: GET `/api/v2/contracts/:id` ACT → `snapshot.name` = razão
  social (CA1); POST ACT → 201 + GET subsequente expõe razão social (CA2); act ausente → `snapshot: null`
  (CA5, degradação graciosa).
- `tests/modules/partners/adapters/http/partners-aggregate-act-razao-social.routes.test.ts` —
  GET `/api/v1/partners?type=act` → item com `name` = razão social.

## Placar `pnpm test`

```
ℹ tests 2646 · pass 2622 · fail 6 · skipped 18
```

Os 6 fails são exatamente os RED do ticket (mapper `actToView`; unit `viewToSnapshot` ACT; rota detalhe
CA1; POST→GET CA2; unit aggregator; rota `/partners`). Nenhuma regressão alheia; nenhum novo passou "por
acaso".

## Decisões de contrato para a W1
1. **POST /contracts não compõe `contractor.snapshot`** (responde list-item enxuto, `plugin.ts:430`); só
   `GET /contracts/:id` compõe (`plugin.ts:265`). CA2 valida criação ACT via POST(201)→GET.
2. **`viewToSnapshot` é privado** em `contractor-composition.ts` — testado via `composeContractor`; manter
   como detalhe interno (não exportar).
3. **Sem campo novo** no snapshot/schema: só `name = view.corporateName ?? view.name` no ramo `act`.
   `ActView` ganha `corporateName` (molde da `FinancierView`).
4. Fallback `?? view.name` (snapshot) e `?? act.name` (aggregator).
5. **Não-regressão**: supplier/collaborator/financier mantêm `snapshot.name = name` (só ACT muda).
