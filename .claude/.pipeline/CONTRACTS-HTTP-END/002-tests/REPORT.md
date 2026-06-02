# W0 — RED — CONTRACTS-HTTP-END

**Skill:** tdd-strategist · **Outcome:** RED

## Arquivo criado

- `tests/modules/contracts/adapters/http/contracts-end.routes.test.ts` — suíte E2E (`app.inject`,
  driver memory, sem Docker), espelhando `contracts-writes.routes.test.ts`.

## Setup do teste

- `makeApp()` monta `buildApp` com `authHttpPlugin` (seed RBAC: writer com `contract:write`) +
  `contractsHttpPlugin`. Seed de contratos:
  - `ACTIVE_PAST_ID` — Active período 2020 (data fim no passado → `Expire` feliz com `ClockReal`).
  - `ACTIVE_FUTURE_ID` — Active período 2030 (data fim no futuro → `Expire` prematuro → 422).
  - `ACTIVE_TERMINATE_ID` — Active default (distrato).
  - `PENDING_ID` — Pending (não-Active → 409).

## Testes (intenção)

| Teste | Espera | Estado RED |
| --- | --- | --- |
| CA7 sem Authorization | 401 | ✖ (404 — rota ausente) |
| CA7 token sem `contract:write` | 403 | ✖ (404) |
| CA1 Terminate sobre Active | 200 + `Terminated` | ✖ (404) |
| CA2 Expire (data fim passada) | 200 + `Expired` | ✖ (404) |
| CA3 `kind` ausente | 400 (Zod) | ✖ (404) |
| CA3 `kind` fora do enum | 400 (Zod) | ✖ (404) |
| CA4 contrato inexistente | 404 | ✔ (coincidência benigna: rota ausente também → 404; permanece válido pós-impl) |
| CA5 contrato não-Active (Pending) | 409 (`ContractNotActive`) | ✖ (404) |
| CA6 Expire antes da data fim | 422 (`ContractCannotExpireYet`) | ✖ (404) |
| CA8 OpenAPI expõe `POST /{id}/end` | path presente | ✖ (ausente) |

## Resultado

```
ℹ tests 10
ℹ pass 1
ℹ fail 9
```

**RED confirmado:** 9/10 falham por inexistência da rota `POST /contracts/:id/end` e do wiring de
`endContract`. O único verde (CA4 → 404) coincide porque rota inexistente retorna 404 — após o W1 o
contrato inexistente continuará mapeado para 404, então o teste segue correto. GREEN quando o W1
entregar `endContractBodySchema` + wiring + rota.
