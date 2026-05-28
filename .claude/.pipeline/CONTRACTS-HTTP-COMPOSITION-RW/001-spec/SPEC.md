# SPEC — Composition dual-pool + plugin + list (`CONTRACTS-HTTP-COMPOSITION-RW`, C0)

> **Tipo:** ticket · **Size:** M · **Épico-pai:** `EPIC-CONTRACTS-HTTP`
> **Status da spec:** aprovada (2026-05-28, Gabriel)
> **ADRs tocados:** `ADR-0026` (RW split), `ADR-0025`/`0027` (HTTP/Zod), `ADR-0024`/`0006` (auth cross-módulo), `ADR-0014`/`0020` (MySQL)

## 1. Problema & contexto

Primeira fatia do `EPIC-CONTRACTS-HTTP`: estabelecer o **composition root de contracts com RW split**
(ADR-0026 — retoma o I1 onde rende), o **plugin factory** protegido por `requireAuth` (do auth) e a **1ª rota
read** (`GET /api/v2/contracts`). Estabelece a estrutura que C1-C4 reusam. Sem refactor do domínio.

## 2. User stories

- Como **operador (via BFF)**, quero `GET /api/v2/contracts` autenticado, para listar contratos.
- Como **mantenedor**, quero o composition contracts pronto p/ réplica (reads no reader, writes no writer), para escalar leitura sem refactor.

## 3. Critérios de aceitação (W0 — `app.inject`, driver memory)

- **CA1** — `GET /api/v2/contracts` **sem** `Authorization` → **401** (requireAuth do auth).
- **CA2** — fluxo: registrar+logar (auth) → `GET /api/v2/contracts` com `Bearer <accessToken>` → **200** com **array** (lista; vazia é válida).
- **CA3** — `GET /docs/json` contém o path `/api/v2/contracts`.
- **CA4 (RW split estrutural)** — `buildContractsHttpDeps({ driver:'mysql', writerUrl, readerUrl })` abre **handles distintos** quando `readerUrl` difere; `listContracts` é wirado ao **reader**; sem `readerUrl`, reader reusa o writer (single-node). *(Em memory, reader=writer=mesmo store — asserção estrutural: `buildContractsHttpDeps({driver:'memory'})` resolve e a rota lista.)*
- **CA5 (regressão)** — `authz-hook`/`routes`/`session` (auth) + `bootstrap`/`security-baseline` (shell) verdes.

## 4. Não-objetivos

- `GET /{id}`, `/{id}/history` (C1); mutações (C2); documentos (C3); CSV (C4); E2E (C5).
- `authorize(permission)` por rota — C0 só exige autenticação (`requireAuth`); RBAC fino entra com as mutações (C2).
- Refactor do `ContractRepository` (não dividir em Reader/Writer) — instancia-se 2× por pool (§6).
- Paginação avançada/filtros da `list` — MVP devolve a lista do `listContracts` atual.

## 5. Clarificações (decisões)

- **D1 — RW split sem refactor:** o `ContractRepository` permanece (findById/list/save juntos). O composition instancia o repo **2×** — `contractReaderRepo` (readerHandle) e `contractWriterRepo` (writerHandle) — e injeta **por intenção** no use case (`listContracts({ contractRepo: contractReaderRepo })`). O `save` do readerRepo nunca é chamado (só reads são roteados a ele). Sem tocar domínio/port. (2026-05-28.)
- **D2 — Single-node:** `readerUrl` ausente → `readerHandle = writerHandle` (1 pool, reusado). Presente → 2 pools (mesmo host hoje, réplica depois). "Zero mudança de código, só a connection string" (ADR-0026:40).
- **D3 — Proteção:** toda rota de contracts exige `requireAuth` (401 sem token). O `requireAuth` vem de `auth/public-api/http.ts` (`makeRequireAuth(authDeps.verifyAccessToken)`), injetado no `contractsHttpPlugin` pelo composition root (`server.ts`). Cross-módulo via public-api (ADR-0006).
- **D4 — `ContractsHttpDeps` = use cases instanciados** (como `AuthHttpDeps`) — o plugin não conhece adapters. C0 expõe `listContracts`; C2 adiciona os de escrita (writer).

## 6. Plano técnico

```
contracts/adapters/http/composition.ts:
  buildContractsHttpDeps({ driver, writerUrl?, readerUrl? }):
    memory: store in-memory único → readerRepo = writerRepo
    mysql:  writerHandle = openMysql(writerUrl); readerHandle = readerUrl ? openMysql(readerUrl) : writerHandle
            contractReaderRepo = createDrizzleContractRepository(readerHandle)
            contractWriterRepo = createDrizzleContractRepository(writerHandle)
    → ContractsHttpDeps { listContracts: listContracts({ contractRepo: contractReaderRepo }), shutdown }
      (writerRepo guardado p/ C2; shutdown fecha writerHandle [+ readerHandle se distinto])

contracts/adapters/http/{plugin,schemas}.ts:
  contractsHttpPlugin(deps, { requireAuth }): sub-escopo /contracts
    GET / { preHandler: requireAuth, schema: { response: { 200: contractListSchema } } }
      handler: sendResult(reply, await deps.listContracts({}), { ok: 200 })

contracts/public-api/http.ts: export contractsHttpPlugin, buildContractsHttpDeps, tipos

src/server.ts:
  authDeps = buildAuthHttpDeps(...); contractsDeps = buildContractsHttpDeps(...)
  requireAuth = makeRequireAuth(authDeps.verifyAccessToken)
  buildApp({ routes: [authHttpPlugin(authDeps), contractsHttpPlugin(contractsDeps, { requireAuth })] })
  shutdown: authDeps.shutdown() + contractsDeps.shutdown()
```

- **Read-after-write (ADR-0026:99):** não aplicável no C0 (só list). C2 cuidará (criar→ler do writer).
- Reuso: `sendResult`/envelope do shell; `listContracts` já pronto; serialização do contrato via schema Zod (mapear o agregado → DTO de resposta, sem vazar campos internos).

## 7. Constitution check

| Fonte | Exigência | Como adere |
| :-- | :-- | :-- |
| `ADR-0026:98-101` | writer/reader; um escritor; roteamento explícito | repo 2× por pool; `listContracts`→reader; save só no writer (C2) |
| `ADR-0024`/`0006` | auth via HTTP; cross-módulo só public-api | `requireAuth` de `auth/public-api/http.ts`; D3 |
| `ADR-0025`/`0027` | HTTP adapter; `/api/v2`; Zod; OpenAPI | plugin em `adapters/http/`; `/api/v2/contracts`; schema Zod |
| `ADR-0014`/`0020` | um escritor por DB; MySQL | writer pool único; reader read-only |
| `.claude/rules/adapters.md` | adapter converte erro→Result na borda | repos Drizzle já retornam Result; handler usa `sendResult` |

## 8. Riscos & mitigações

| Risco | Sev. | Mitigação |
| :-- | :-- | :-- |
| 2 pools ao mesmo host (single-node) = overhead | baixa | `readerUrl` ausente reusa o writer (1 pool) — D2 |
| Teste do C0 depende de auth (token) | baixa | monta authDeps+contractsDeps memory; registra/loga p/ obter token (espelha o E2E auth) |
| `save` chamado por engano no readerRepo | baixa | só reads roteados ao reader; C2/W2 audita o roteamento |
| Serialização vazar campos internos do agregado | média | schema Zod de resposta com shape explícito (`additionalProperties:false` implícito no Zod object) |
| RW split físico não exercitado em memory | média | validado no **C5 (E2E mysql)**; C0 cobre a estrutura + a rota |

## 9. Definition of Done

- [ ] CA1–CA5 verdes (W0→W3, memory).
- [ ] composition dual-pool (handles reader/writer; single-node reusa); `listContracts`→reader.
- [ ] `GET /api/v2/contracts` protegida (requireAuth) + no OpenAPI; `server.ts` compõe auth + contracts.
- [ ] `pnpm test`/`typecheck`/`format`/`lint` verdes; sem dep nova.
- [ ] Split físico (reader real) fica para validação no C5 (E2E).
