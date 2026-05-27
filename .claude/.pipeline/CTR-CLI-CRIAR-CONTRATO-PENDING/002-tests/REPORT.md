# W0 (RED) — CTR-CLI-CRIAR-CONTRATO-PENDING

**Skill:** tdd-strategist · **Data:** 2026-05-27 · **Resultado:** 🔴 RED — 2/2 falham.

## Comando

```bash
node --test --experimental-strip-types --no-warnings tests/cli/contracts.cli.create-pending.test.ts
# tests 2 · pass 0 · fail 2
```

## Testes — `tests/cli/contracts.cli.create-pending.test.ts` (E2E driver memory)

| Teste | Exige no W1 | W0 |
| :--- | :--- | :--- |
| CA1 | `criar-contrato` **sem `--assinado-em`** → exit 0, status `Pendente`, imprime ID | 🔴 (hoje `--assinado-em` é REQUIRED → exit 64) |
| CA1b | contrato Pendente **não** exibe "Valor vigente" | 🔴 |

Regressão (criar Active com `--assinado-em`) coberta por `contracts.cli.test.ts` — verde, validar no W3.

## Mapa W1

- `cli/commands/criar-contrato.ts`: `assinado-em` sai de `REQUIRED`. Se ausente → `createPendingContract`
  ({ contractRepo, clock } do `ctx`); se presente → `createContract` (Active, atual). Formatar o
  `PendingContract` (formatter já trata Pending — ramo "aguardando documento assinado").
- Confirmar que `ctx` expõe `contractRepo` + `clock` (usados por `createPendingContract`).
