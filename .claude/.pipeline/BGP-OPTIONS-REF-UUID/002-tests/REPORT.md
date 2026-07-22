# W0 — RED — BGP-OPTIONS-REF-UUID (#394)

**Skill:** `tdd-strategist` · **Data:** 2026-07-10

## Diagnóstico da causa-raiz
`GET /budget-plans/options` declara `redes[].ref: z.uuid()` (`src/modules/budget-plans/adapters/http/schemas.ts:110`), mas o `ref` de rede é, **por design (ADR-0006 ACL)**, a **chave natural do partners**: `uf` para estado (ex. `'CE'`) e **código IBGE** para município (ex. `'2304400'`) — nunca UUID. Ver comentário do adapter `partner-network.from-partners.ts:1-3` e o tipo do port `partner-network.ts:9` (`ref: string`) / `partners/application/ports/geography-read.ts:22-23`.

O teste existente **mascarava** o bug: o seed usava UUIDs (`STATE_CE_REF = '4444…'`, `MUN_FORTALEZA_REF = '5555…'`) — infiel à produção. Fake mentindo sobre o contrato real.

## Mudança do W0 (RED)
`tests/modules/budget-plans/adapters/http/budget-plans.routes.test.ts` — seed passa a usar a chave natural real:
- `STATE_CE_REF = 'CE'` (UF)
- `MUN_FORTALEZA_REF = '2304400'` (IBGE Fortaleza)

## Evidência RED
```
node --test ... --test-name-pattern="programas ativos + anos + redes"
→ ResponseSerializationError: path redes[0].ref / redes[1].ref → "Invalid UUID"
→ statusCode 500 (expected 200) · fail 1, pass 0
```

## Critério de GREEN (W1)
Relaxar `redes[].ref` de `z.uuid()` para `z.string().min(1)` em `budgetPlanOptionsSchema` (chave natural opaca). CA1 `/options` → 200; CA2 `redes[].ref` = chave natural.
