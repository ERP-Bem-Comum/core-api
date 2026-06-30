# W1 (GREEN) — CONTRACTS-HTTP-COMPOSITION-RW (C0)

> Agente: `fastify-server-expert` (borda) · Skills aplicadas: `ports-and-adapters` · Outcome: **GREEN**

## Arquivos entregues

| Arquivo | Papel |
| :-- | :-- |
| `src/modules/contracts/adapters/http/schemas.ts` | Zod contract-first: `contractListItemSchema` (discriminated union por `status`) + `contractListSchema` (array) + tipo `ContractListItemDto` (z.infer). Money→`{cents}`, Period→`{kind,start,end?}`. |
| `src/modules/contracts/adapters/http/contract-dto.ts` | Mapper `contractToListItem(c)` — switch exaustivo sobre `status`; serializa VOs; não vaza `homologatedAmendmentIds`. |
| `src/modules/contracts/adapters/http/composition.ts` | `buildContractsHttpDeps({driver,writerUrl?,readerUrl?})` — RW split dual-pool; `listContracts`→reader; `shutdown` fecha os pools distintos. |
| `src/modules/contracts/adapters/http/plugin.ts` | `contractsHttpPlugin(deps,{requireAuth})` — `GET /contracts` com `preHandler: requireAuth` + schema Zod de resposta. |
| `src/modules/contracts/public-api/http.ts` | Reexporta plugin + builder + tipos (único ponto de import externo da borda HTTP). |
| `src/server.ts` (edit) | Compõe auth + contracts; `requireAuth = makeRequireAuth(authDeps.verifyAccessToken)`; shutdown de ambos. |

## Evidência GREEN

- Testes do ticket: **13/13 pass** (CA1 401×2, CA2 200+array, CA3 OpenAPI, CA4 memory+mysql-reject).
- Suíte completa (CA5 regressão): **1457 pass · 0 fail · 16 skipped** (skips = gates integração MySQL, `MYSQL_INTEGRATION=1`).

## Decisões de implementação (desvios da SPEC §6, justificados)

1. **`writerRepo` não instanciado no C0.** A SPEC §6 sugere "instancia o repo 2×". Para evitar `noUnusedVars`/`noUnusedLocals` (o `save` só é chamado no C2), o C0 abre os **dois handles/pools** (writer + reader) e instancia **apenas** o `contractReaderRepo` (consumido por `listContracts`). O writer pool fica aberto e é fechado no `shutdown`; o `writerRepo` entra no C2 quando houver mutação. **Compatível com CA4** (foco em *handles* distintos, não em *repos*).

2. **Rota com path completo `/contracts` sem sub-prefixo.** Tentativa inicial (sub-prefix `/contracts` + rota `/`) gerava o path OpenAPI `/api/v2/contracts/` (trailing slash) — `prefixTrailingSlash: 'no-slash'` no register aninhado **não** corrigiu o documento gerado (só o roteamento). Solução: `register(contractsRoutes)` sem prefix + `url: '/contracts'` → path canônico `/api/v2/contracts` (sem barra), que é o que o OpenAPI documenta (CA3 verde). Sub-recursos (`/contracts/:id`) seguem o mesmo padrão no C1.

3. **`listContracts()` sem input.** O use case é `() => Promise<Result<...>>` (não recebe `{}` como a SPEC §6 escreveu informalmente) — handler chama `deps.listContracts()`.

## Notas para C1/C2

- `ContractListItemDto` (item discriminado) é reusável pelo `GET /{id}` (C1).
- Mutações (C2) instanciam `createDrizzleContractRepository(writerHandle)` e roteiam `save` ao writer; read-after-write lê do writer (ADR-0026:99).
- Split físico (reader real, réplica) é validado no **C5 (E2E mysql)**; C0 cobre estrutura + branch mysql sem Docker.
