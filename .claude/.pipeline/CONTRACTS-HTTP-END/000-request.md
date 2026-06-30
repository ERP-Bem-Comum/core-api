# CONTRACTS-HTTP-END — rota HTTP `POST /contracts/:id/end` (encerrar contrato)

> **Size:** S · **ADR:** ADR-0024/0025/0026/0027/0028 (borda HTTP, Zod contract-first, RW split).
> **Épico:** EPIC-CONTRACTS-HTTP (entregue). Este ticket fecha o último write de ciclo de vida do
> contrato ainda sem rota. Substitui a intenção do superseded `CTR-CLI-ACTIVAR-CONTRATO` (ativação
> já é HTTP via `POST /contracts/:id/activate`) estendendo a mesma borda para o **encerramento**.

## Contexto

UC-07 (`handbook/domain/contratos/03-gestao-contratos-context.md:70-74`): "Encerrar Contrato — Sistema
(chegada da data fim) ou Gestor (distrato). Status → Encerrado ou Distratado."

O use case `endContract` (`application/use-cases/end-contract.ts`) **já existe e está testado**; falta só
a borda HTTP. Espelha exatamente o padrão das writes de `CONTRACTS-HTTP-WRITES-CORE` (ex.: `POST
/contracts/:id/activate` em `adapters/http/plugin.ts:272-289`).

## Estado atual (o que já existe — NÃO reimplementar)

- **Domínio:** `Contract.expire(active, at)` e `Contract.terminate(active, at)`; eventos `ContractEvent`
  `kind: 'Expired' | 'Terminated'` (`domain/contract/events.ts:23`).
- **Application:** `endContract(deps)(cmd)` em `application/use-cases/end-contract.ts`:
  - `EndContractCommand = { contractId: string; kind: 'Expire' | 'Terminate' }`
  - Deps: `contractRepo: ContractRepository`, `clock: Clock`
  - Output: `{ contract: ExpiredContract | TerminatedContract; event: ContractEvent }`
  - Erro `EndContractError`: `ContractIdError | 'contract-not-found' | ContractError | ContractRepositoryError`
    (os subtipos de `ContractError` relevantes: `ContractNotActive`, `ContractCannotExpireYet`,
    `ContractCannotExpireIndefinitePeriod`).
- **Borda HTTP:** `adapters/http/plugin.ts` (writes C2), `composition.ts` (`ContractsHttpDeps` + `makeDeps`,
  `clock` já instanciado, `contractWriterRepo` já disponível), `schemas.ts` (Zod). Mapeamento erro→HTTP +
  Sets `CONFLICT_CODES`/`NOT_FOUND_CODES`/`REPO_UNAVAILABLE_CODES` em `plugin.ts:64-109`.
  **`ContractNotActive` já está em `CONFLICT_CODES` (→409); `contract-not-found` já em `NOT_FOUND_CODES`
  (→404); `contract-repo-unavailable` já em `REPO_UNAVAILABLE_CODES` (→503).**

## O que este ticket entrega

1. **Schema** `endContractBodySchema = z.object({ kind: z.enum(['Expire', 'Terminate']) })` em
   `adapters/http/schemas.ts` (espelha `activateContractBodySchema`).
2. **Wiring** de `endContract` em `adapters/http/composition.ts`: importar o use case, adicionar
   `endContract: ReturnType<typeof endContract>` em `ContractsHttpDeps`, instanciar em `makeDeps` com
   `{ contractRepo: pools.contractWriterRepo, clock }` (write → writer pool, ADR-0026).
3. **Rota** `POST /contracts/:id/end` em `adapters/http/plugin.ts`:
   - `preHandler: [hooks.requireAuth, hooks.authorize('contract:write')]`
   - `schema: { params: contractIdParamSchema, body: endContractBodySchema, response: { 200: contractDetailSchema } }`
   - handler invoca `deps.endContract({ contractId: req.params.id, kind: req.body.kind })`; erro →
     `sendDomainError`; sucesso → `sendResult(reply, ok(contractToListItem(result.value.contract)), { ok: 200 })`.
4. **Teste E2E** novo (`tests/modules/contracts/adapters/http/contracts-end.routes.test.ts`) espelhando
   `contracts-writes.routes.test.ts` (seed de contrato `Active` via composição memory).

## Decisão de mapeamento de erro (SPEC C2 §3)

| Erro do domínio | Status | Onde |
| --- | --- | --- |
| `ContractNotActive` (contrato Pending/Expired/Terminated) | **409** | já em `CONFLICT_CODES` |
| `ContractCannotExpireYet` (Expire antes da data fim) | **422** | default (invariante semântica) |
| `ContractCannotExpireIndefinitePeriod` (Expire sem data fim) | **422** | default (invariante semântica) |
| `contract-not-found` | **404** | já em `NOT_FOUND_CODES` |
| `contract-repo-unavailable` | **503** | já em `REPO_UNAVAILABLE_CODES` |
| body inválido (`kind` ausente/fora do enum) | **400** | Zod validator |

Nenhum code novo precisa entrar nos Sets — `ContractNotActive` já está; os `Cannot*` são invariantes
semânticas e caem corretamente no default 422.

## Critérios de aceitação

- **CA1 (Terminate, happy):** `POST /api/v2/contracts/:id/end` com `{ "kind": "Terminate" }` sobre contrato
  `Active` → **200**, corpo `contractDetail` com status `Terminated`/`Distratado`.
- **CA2 (Expire, happy):** mesmo contra contrato `Active` cuja data fim já passou (via clock seedado) com
  `{ "kind": "Expire" }` → **200**, status `Expired`.
- **CA3 (validação):** `kind` ausente ou fora de `['Expire','Terminate']` → **400** (Zod).
- **CA4 (not-found):** id de contrato inexistente → **404** (`contract-not-found`).
- **CA5 (estado):** contrato não-`Active` (Pending/Expired/Terminated) → **409** (`ContractNotActive`).
- **CA6 (expire prematuro):** `Expire` antes da data fim → **422** (`ContractCannotExpireYet`).
- **CA7 (authz):** sem `contract:write` → **403**; sem auth → **401** (herdado dos hooks, espelha writes).
- **CA8 (OpenAPI):** o documento OpenAPI expõe `POST /api/v2/contracts/{id}/end` (regressão).

## Fora de escopo

- DELETE de documento (`deleteDocument`) — eventual ticket HTTP separado.
- Agendamento automático de expiração por data (cron) — o use case usa `clock.now()` (MVP).
- Borda CLI de encerramento.
