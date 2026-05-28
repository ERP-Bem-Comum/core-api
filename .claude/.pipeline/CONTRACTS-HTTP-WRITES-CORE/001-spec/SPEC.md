# SPEC — CONTRACTS-HTTP-WRITES-CORE (C2)

> Refina [`000-request.md`](../000-request.md). Resolve as tensões de dependência (activate/homologate ↔
> documento), fixa o mapeamento erro→HTTP e o shape do seed de teste. Aprovação humana antes do W1.

## 1. Endpoints

Todos sob `/api/v2/contracts`, `[requireAuth, authorize('contract:write')]`, escrita no **writer**;
resposta lida do **writer** (read-after-write, CA6 — os use cases já devolvem o agregado pós-save).

| # | Método + path | Use case | Sucesso | Body |
| :-- | :-- | :-- | :-- | :-- |
| E1 | `POST /contracts` | `createContract` \| `createPendingContract` | **201** | discriminado por `mode` (ver §2) |
| E2 | `POST /contracts/:id/activate` | `activateContract` | **200** | `{ signedAt }` |
| E3 | `POST /contracts/:id/amendments` | `createAmendment` | **201** | discriminado por `kind` (ver §2) |
| E4 | `POST /contracts/:id/amendments/:amendmentId/homologate` | `homologateAmendment` | **200** | `{ homologatedBy }` |

## 2. Schemas Zod de entrada (`schemas.ts`)

- **E1 body** — discriminador `mode`:
  - `mode: 'Pending'` → `{ sequentialNumber, title, objective, originalValueCents, periodStart, periodEnd: string|null }`
  - `mode: 'Active'` → idem + `signedAt` (mapeia para `CreateContractCommand`; note os nomes
    `originalPeriodStart`/`originalPeriodEnd` no command — o handler traduz).
- **E3 body** — discriminador `kind` (`Addition`|`Suppression`|`TermChange`|`Misc`) + `amendmentNumber`,
  `description`; `Addition`/`Suppression` → `impactValueCents`; `TermChange` → `newEndDate`.
- **E2 body** — `{ signedAt: string }`. **E4 body** — `{ homologatedBy: string }`.
- **Params** — reusa `contractIdParamSchema` (uuid); E4 soma `amendmentId` (uuid).
- **Respostas** — E1/E2/E4 reusam `contractDetailSchema` (contrato). E3 precisa de **`amendmentSchema`**
  novo + mapper `amendment-dto.ts` (não existe ainda).

## 3. Mapeamento erro de domínio → HTTP (canônico — o W0 asserta estes códigos)

| Classe de erro (`Result`) | HTTP | Exemplos |
| :-- | :-: | :-- |
| Zod shape inválido (body/param) | **400** | falta campo, `kind` desconhecido, `:id` não-uuid |
| Recurso inexistente | **404** | `contract-not-found`, `amendment-not-found` |
| Conflito de estado / transição / unicidade | **409** | `contract-sequential-number-duplicated`, `contract-not-pending`, `contract-not-active`/`ContractNotActive`, `amendment-contract-mismatch`, `activate-contract-no-signed-document`, `amendment-retroactive-to-contract-start` |
| Invariante semântica (passou no Zod, falha no domínio) | **422** | período/valor inválido, `*-invalid-signed-at`, `amendment-suppression-exceeds-current-value`, `create-amendment-term-change-not-extending`, `create-amendment-cannot-extend-indefinite`, IDs residuais |
| Repositório indisponível | **503** | `contract-repo-unavailable`, `amendment-repo-*`, `document-repo-*` |

Sem `500` para erro de negócio. Reusar `toErrorCode` (string-literal | tagged-record) do `plugin.ts`.

## 4. Decisões (resolvem as tensões do request)

### D1 — Read-after-write no writer
A resposta de cada mutação serializa o agregado devolvido pelo use case (já é o estado pós-save). Nenhuma
releitura via reader. (Confirma CA6.)

### D2 — `seed` do composition migra para objeto extensível
`ContractsCompositionConfig.seed` passa de `readonly Contract[]` para:
```ts
seed?: Readonly<{
  contracts?: readonly Contract[];
  amendments?: readonly Amendment[];
  documents?: readonly Document[];
}>;
```
Aplicado nos repos do **writer** (memory). Migra o único call site do C1
(`seed: [c]` → `seed: { contracts: [c] }`) — regressão controlada, coberta por CA8.

### D3 — Caminhos de sucesso de E2/E4 dependem de documento → montados via `seed` (test-only)
- **E2 (activate 200):** exige doc `signed_contract` `Active` no `documentRepo` (RN-CV-02). O upload HTTP de
  documento é o **C3**; no C2 o pré-requisito é montado via `seed.documents`.
- **E4 (homologate 200):** exige aditivo `PendingWithDocument` (`Amendment.parsePendingWithDocument`). Idem:
  montado via `seed.amendments` (usar `buildPendingAmendmentWithDoc` das fixtures).
- **Justificativa:** mantém as 4 rotas exercitáveis ponta-a-ponta no C2 sem antecipar o C3; `seed` é
  dev/test only (padrão já estabelecido no C1). Em produção o estado nasce do fluxo HTTP real (C3).
- **Alternativa rejeitada:** diferir E2/E4-happy-path para o C3 — deixaria duas rotas sem cobertura de
  sucesso no ticket que as introduz, contra a spec-mãe (§10 lista as 4 no C2).

### D4 — `authorize('contract:write')`
Permissão nova. O seed RBAC (auth) já aceita lista arbitrária de permissões — basta os testes semearem
`permissions: ['contract:write']`. Sem mudança no auth.

### D5 — Composition expõe os repos do writer
`Pools`/`ContractsHttpDeps` ganham `contractWriterRepo`, `amendmentRepo`, `documentRepo` (writer). Os 5 use
cases de escrita são instanciados com eles + `Clock`. O writer pool já é aberto pelo C0.

## 5. Critérios de aceitação (consolidados)

- **CA1 (authz, todas as rotas):** sem token → 401; token sem `contract:write` → 403.
- **CA2 (E1):** `Active` válido → 201 + `status:'Active'`; `Pending` válido → 201 + `status:'Pending'`;
  Zod inválido → 400; `sequentialNumber` duplicado → 409; valor/período inválido → 422.
- **CA3 (E2):** `Pending` + doc `signed_contract` seedado → 200 `Active`; inexistente → 404; não-`Pending`
  → 409; sem doc assinado → 409; `signedAt` inválido → 422.
- **CA4 (E3):** contrato `Active` + body válido → 201 aditivo `Pending`; contrato inexistente → 404;
  contrato não-`Active` → 409; `Suppression` > valor vigente → 422; `TermChange` não-extensivo → 422; Zod → 400.
- **CA5 (E4):** aditivo `PendingWithDocument` seedado + contrato `Active` → 200 contrato recalculado
  (RN-06/07); aditivo/contrato inexistente → 404; `amendment-contract-mismatch` → 409.
- **CA6 (read-after-write):** resposta reflete o writer imediatamente.
- **CA7 (Zod & OpenAPI):** `/docs/json` contém as 4 rotas novas.
- **CA8 (regressão):** reads C0/C1 e seu seed migrado seguem verdes.

## 6. Arquivos previstos (W1)

- `schemas.ts` — bodies E1/E3/E2/E4 + `amendmentSchema` + param `amendmentId`.
- `amendment-dto.ts` (novo) — mapper `Amendment` → DTO.
- `plugin.ts` — 4 rotas novas + mapa erro→status por rota.
- `composition.ts` — seed objeto (D2) + repos do writer (D5) + 5 use cases.
- `contracts-writes.routes.test.ts` (W0) + migração de `contracts-reads.routes.test.ts` (seed).

## 7. Fora de escopo

Upload/gestão de documento (C3), export CSV (C4), E2E docker (C5), `end-contract` (ticket próprio).
