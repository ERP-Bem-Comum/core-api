# W0 (RED) — CONTRACTS-HTTP-COMPOSITION-RW (C0)

> Skill: `tdd-strategist` · Driver: memory (sem Docker) · Outcome: **RED**

## Testes escritos

| Arquivo | Cobre | CA |
| :-- | :-- | :-- |
| `tests/modules/contracts/adapters/http/contract-dto.test.ts` | mapper `contractToListItem` (puro) — 4 variantes do agregado + Period Indefinite + não-vazamento de `homologatedAmendmentIds` | CA2 (shape de resposta) |
| `tests/modules/contracts/adapters/http/contracts-list.routes.test.ts` | borda via `app.inject`: 401 sem token, 401 token inválido, 200+array com Bearer válido, `/docs/json` contém o path, composition memory resolve, branch mysql rejeita sem Docker | CA1, CA2, CA3, CA4 |

## Estratégia

- **Mapper testado por unidade** porque a list em memory é vazia (C0 não expõe `create`): o `contractToListItem` só seria exercitado com itens reais. Teste unit cobre as 4 variantes (`Pending`/`Active`/`Expired`/`Terminated`) com os fixtures de persistência (`fixtures.ts`), garantindo serialização `Money→{cents}`, `Period→{kind,start,end?}` (ISO via `PlainDate.toISOString`), `Date→ISO`, sem vazar `homologatedAmendmentIds`.
- **Borda testada por integração** (`app.inject`) espelhando `tests/modules/auth/adapters/http/routes.test.ts`. Token obtido do fluxo real auth (register+login), com `requireAuth = makeRequireAuth(authDeps.verifyAccessToken)` injetado no `contractsHttpPlugin` — exatamente o wiring que o `server.ts` fará.
- **Branch mysql sem Docker:** `buildContractsHttpDeps({driver:'mysql'})` sem `writerUrl` e com `writerUrl` inválido devem **rejeitar** — `openMysql` valida a connection string por regex antes de qualquer I/O de rede, então o branch é exercitado sem container. Split físico (reader real) fica para o **C5 (E2E mysql)**.

## Evidência RED

```
✖ tests 2 · pass 0 · fail 2
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/modules/contracts/public-api/http.ts'
```

Ambos falham por **inexistência da API** (`contracts/public-api/http.ts` e `contracts/adapters/http/contract-dto.ts` não existem) — RED por design fail-first, não por asserção. GREEN quando o W1 entregar composition + schemas/DTO + plugin + public-api + wiring no `server.ts`.

## API pública que o W1 deve entregar (chain p/ W1)

```ts
// contracts/adapters/http/contract-dto.ts
export type ContractListItemDto = /* discriminated union por status */;
export const contractToListItem: (c: Contract) => ContractListItemDto;

// contracts/adapters/http/schemas.ts
export const contractListItemSchema; // Zod discriminatedUnion('status', [...])
export const contractListSchema;     // z.array(contractListItemSchema)

// contracts/adapters/http/composition.ts
export type ContractsDriver = 'memory' | 'mysql';
export type ContractsCompositionConfig = { driver; writerUrl?; readerUrl? };
export type ContractsHttpDeps = { listContracts; shutdown };
export const buildContractsHttpDeps: (c) => Promise<ContractsHttpDeps>;

// contracts/adapters/http/plugin.ts
export const contractsHttpPlugin: (deps, { requireAuth }) => FastifyPluginAsync;

// contracts/public-api/http.ts  → reexporta plugin + builder + tipos
// src/server.ts                 → compõe auth + contracts; requireAuth do auth
```
