# W0 (RED) — CONTRACTS-HTTP-READS (C1)

> Skill: `tdd-strategist` · Driver: memory (sem Docker) · Outcome: **RED** (9 fail / 3 pass)

## Teste escrito

`tests/modules/contracts/adapters/http/contracts-reads.routes.test.ts` — 12 casos via `app.inject`, exercitando RBAC end-to-end (1º uso real de `authorize`):

| CA | Caso | Esperado |
| :-- | :-- | :-- |
| CA1 | GET /:id sem token | 401 |
| CA1 | GET /:id token sem `contract:read` (register normal) | 403 |
| CA1 | GET /:id token com `contract:read` (seed) + id existente (seed) | 200 + contrato |
| CA1 | GET /:id id inexistente | 404 |
| CA4 | GET /:id id mal-formado | 400 (Zod) |
| CA2 | GET /:id/history sem token / sem perm / com perm / inexistente | 401 / 403 / 200+array / 404 |
| CA4 | /docs/json contém `/{id}` e `/{id}/history` | sim |
| CA5 | GET /contracts (list C0) com token válido | 200 (regressão) |
| seed | `buildAuthHttpDeps` expõe `authorize` | function |

## Setup RBAC (resolve o bootstrap — D4/D5)

- **Token COM `contract:read`:** seed RBAC inline — `buildAuthHttpDeps({ driver:'memory', seed:{ users:[{ email, password, permissions:['contract:read'] }] } })`. Login direto (o seed criou o user com Role embutido).
- **Token SEM permissão:** `POST /register` normal (`roles:[]`) → 403.
- **Contrato existente (200):** seed de contratos — `buildContractsHttpDeps({ driver:'memory', seed:[buildContract({id})] })`.

## Evidência RED

```
ℹ tests 12 · pass 3 · fail 9
✖ CA-seed: authorize -> Expected 'function', got 'undefined'
✖ CA1/CA2 401/403/200, CA4 400/docs -> rotas /:id e /:id/history inexistentes
```

Falham por: `authDeps.authorize` inexistente, `seed` ignorado (token sem permissão), rotas `/:id` e `/:id/history` ausentes. Os 3 "pass" são benignos: 404 por rota-inexistente coincide com o 404 esperado (passarão pela razão certa pós-W1) e a list do C0 regride OK.

## API que o W1 deve entregar

```
auth/adapters/http/composition.ts: AuthCompositionConfig += seed; AuthHttpDeps += authorize:(name:string)=>preHandler
contracts/adapters/http/composition.ts: ContractsCompositionConfig += seed:Contract[]; ContractsHttpDeps += getContract,getContractTimeline
contracts/adapters/http/{schemas,*-dto}.ts: idParamSchema (uuid) + timelineEntrySchema + timelineEntryToDto; reusa contractListItemSchema p/ GET /{id}
contracts/adapters/http/plugin.ts: ContractsHttpHooks += authorize; rotas GET /contracts/:id e /:id/history ([requireAuth, authorize('contract:read')])
src/server.ts: passa authorize: authDeps.authorize
```
