# W1 — GREEN — CONTRACTS-HTTP-END

**Skill:** fastify-server-expert · **Outcome:** GREEN

## Arquivos editados (mínimo p/ GREEN — YAGNI)

1. **`src/modules/contracts/adapters/http/schemas.ts`**
   - `+ endContractBodySchema = z.object({ kind: z.enum(['Expire', 'Terminate']) })` (espelha
     `activateContractBodySchema`).

2. **`src/modules/contracts/adapters/http/composition.ts`**
   - `+ import { endContract }` do use case.
   - `+ endContract: ReturnType<typeof endContract>` em `ContractsHttpDeps`.
   - `+ endContract: endContract({ contractRepo: pools.contractWriterRepo, clock })` em `makeDeps`
     (write → **writer pool**, ADR-0026; `clock` já instanciado no escopo).

3. **`src/modules/contracts/adapters/http/plugin.ts`**
   - `+ import endContractBodySchema`.
   - `+ rota POST /contracts/:id/end`: `preHandler: [requireAuth, authorize('contract:write')]`;
     `schema { params: contractIdParamSchema, body: endContractBodySchema, response { 200: contractDetailSchema } }`;
     handler invoca `deps.endContract({ contractId, kind })`, erro → `sendDomainError`, sucesso →
     `sendResult(... contractToListItem ..., { ok: 200 })`.

## Mapeamento de erro (reuso da infra existente, zero código novo)

- `ContractNotActive` → **409** (já em `CONFLICT_CODES`).
- `contract-not-found` → **404** (já em `NOT_FOUND_CODES`).
- `ContractCannotExpireYet` / `ContractCannotExpireIndefinitePeriod` → **422** (default semântico).
- `contract-repo-unavailable` → **503** (já em `REPO_UNAVAILABLE_CODES`).
- `kind` inválido → **400** (Zod validator).

Nenhum novo code precisou entrar nos Sets do `plugin.ts`.

## Resultado

```
# suíte do ticket
ℹ tests 10
ℹ pass 10
ℹ fail 0

# regressão — toda a borda HTTP de contracts
ℹ tests 97
ℹ pass 97
ℹ fail 0

# tsc --noEmit → zero erros
```

Todos os CAs (CA1–CA8) verdes. Sem regressão. GREEN.
