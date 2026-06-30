# W0 — RED — CTR-PERMISSION-CATALOG

**Skill:** tdd-strategist · **Outcome:** RED

## Arquivo criado

- `tests/modules/contracts/public-api/permissions.test.ts`

## Testes

1. `CONTRACT_PERMISSION` expõe `read`/`write`/`massApprove` com valores `contract:read`/`contract:write`/`contract:mass-approve`.
2. Todos os valores seguem o formato `resource:action` (mesma regra do smart constructor `Permission`).
3. É re-exportado pela `public-api/index.ts` (ADR-0006).

## Resultado (RED)

```
ℹ tests 1 · pass 0 · fail 1
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../public-api/permissions.ts'
```

RED legítimo: o módulo `permissions.ts` ainda não existe — o import falha no load.
