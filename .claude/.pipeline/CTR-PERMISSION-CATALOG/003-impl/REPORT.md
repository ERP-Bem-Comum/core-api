# W1 — GREEN — CTR-PERMISSION-CATALOG

**Skill:** typescript-language-expert · **Outcome:** GREEN

## Arquivos

1. **`src/modules/contracts/public-api/permissions.ts`** (novo)
   - `CONTRACT_PERMISSION` (`const` object: `read`/`write`/`massApprove`) + `type ContractPermission` (union derivada via `[keyof typeof ...]`).
2. **`src/modules/contracts/public-api/index.ts`**
   - `+ export { CONTRACT_PERMISSION }` + `export type { ContractPermission }` (ADR-0006 — único ponto de import externo).
3. **`src/modules/contracts/adapters/http/plugin.ts`**
   - `+ import { CONTRACT_PERMISSION }`.
   - 4× `authorize('contract:read')` → `authorize(CONTRACT_PERMISSION.read)`.
   - 9× `authorize('contract:write')` → `authorize(CONTRACT_PERMISSION.write)`.

## Decisão de design

Forma escolhida (síntese security + TS + 3 especialistas externos): `const` object em vez de constante solta (consistência — read/write/mass-approve juntos) e em vez de catálogo central em auth (evita acoplamento/drift com o banco). Acesso nomeado dá autocomplete + typo vira erro de `tsc`. Branded `Permission` da borda intacto; `authorize: (string)` aceita o subtipo sem cast.

## Resultado

```
# suíte do ticket
ℹ tests 3 · pass 3 · fail 0

# regressão — rotas HTTP de contracts (authorize refatorado)
ℹ tests 97 · pass 97 · fail 0
```

GREEN. Sem magic string de permission no `plugin.ts`. `contract:mass-approve` disponível tipado para a ETL importar via public-api.
