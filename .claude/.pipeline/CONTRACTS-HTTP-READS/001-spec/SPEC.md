# SPEC — Consulta de Contrato e Timeline (CONTRACTS-HTTP-READS, C1)

> **Tipo:** ticket · **Size:** M (revisado de S) · **Épico-pai:** `EPIC-CONTRACTS-HTTP`
> **Status da spec:** aprovada (2026-05-28, Gabriel) · **revisada 2026-05-28** (bootstrap RBAC — ver §5 D4-D6)
> **ADRs tocados:** `ADR-0026` (RW split), `ADR-0025`/`0027` (HTTP/Zod), `ADR-0024`/`0006` (auth cross-módulo), `ADR-0022` (Timeline)

> **Revisão (2026-05-28):** o `authorize('contract:read')` é o **1º uso real de RBAC fino** do projeto e
> esbarrou num **bootstrap de RBAC ausente**: `registerUser` cria `roles:[]`, `assignRole` exige ator já
> privilegiado (chicken-and-egg) e o `buildAuthHttpDeps` não wira concessão. Decisão do usuário: **expandir
> o C1** com **seed RBAC no auth memory** (D4). Size revisado S→M; toca o módulo auth (via composition).

## 1. Problema & contexto

Segunda fatia do `EPIC-CONTRACTS-HTTP`: expor os endpoints de consulta detalhada (`GET /api/v2/contracts/{id}` e `GET /api/v2/contracts/{id}/history`) protegidos por RBAC (`authorize('contract:read')`). Reusa a infraestrutura de RW split (C0), enviando as leituras para o pool reader.

## 2. User stories

- Como **operador (via BFF)**, quero consultar as informações detalhadas de um contrato específico via `GET /api/v2/contracts/{id}`, para verificar vigência e valores.
- Como **operador**, quero ver o histórico temporal de transições (timeline) de um contrato via `GET /api/v2/contracts/{id}/history`, para fins de auditoria de ciclo de vida.
- Como **mantenedor**, quero que ambas as rotas exijam token JWT válido + a permissão `'contract:read'`, para garantir a segurança.

## 3. Critérios de aceitação (W0 — `app.inject`, driver memory)

- **CA1 (GET /contracts/:id)**
  - Sem `Authorization` (JWT ausente/inválido) → **401 Unauthorized**.
  - Com token válido mas sem permissão `'contract:read'` → **403 Forbidden**.
  - Com token válido e permissão → **200 OK** com os detalhes do contrato, ou **404 Not Found** se o ID do contrato não existir.
- **CA2 (GET /contracts/:id/history)**
  - Sem `Authorization` → **401 Unauthorized**.
  - Com token válido mas sem permissão `'contract:read'` → **403 Forbidden**.
  - Com token válido e permissão → **200 OK** com a lista ordenada de eventos da timeline do contrato (ou **404 Not Found** se o contrato correspondente não existir).
- **CA3 (RW Split)** — As rotas utilizam o repositório reader (`contractReaderRepo`).
- **CA4 (Zod validation & OpenAPI)** — Parâmetro `:id` validado como UUID v4. O schema OpenAPI expõe as duas novas rotas sob `/api/v2/contracts/{id}` e `/api/v2/contracts/{id}/history`.
- **CA5 (Regressão)** — Rotas anteriores do módulo auth e `GET /api/v2/contracts` (list) permanecem intactas e funcionais.

## 4. Não-objetivos

- Qualquer mutação de contratos (POST /contracts, POST /contracts/:id/activate, etc.) → C2.
- Exportação para CSV → C4.
- Testes E2E complexos em contêineres Docker (rodando server via subprocesso e testando fumaça) → C5.

## 5. Clarificações (decisões)

- **D1 (revisada) — Hook `authorize` exposto por NOME (string), não `Permission`:** `AuthHttpDeps` ganha `authorize: (permissionName: string) => preHandlerAsyncHookHandler`, criado no composition do auth via `Permission.parse(name)` + `makeAuthorize(stores.userReader)`. **Por quê string e não `Permission`:** o tipo `Permission` é branded de `auth/domain/authorization/permission.ts`; expô-lo no contrato faria o módulo contracts importar `auth/domain` — fere ADR-0006. Passar a string `'contract:read'` mantém o desacoplamento (contracts não conhece o VO; o auth valida/parseia). Nome inválido no wiring → `throw` no boot (erro de programação, fail-fast).
- **D2 — Timeline in-memory:** o read-model de timeline (ADR-0022) ainda não tem persistência Drizzle; `buildContractsHttpDeps` instancia `InMemoryTimelineRepository()` e injeta em `getContractTimeline` para **ambos** os drivers. Em mysql a timeline nasce vazia (sem projeção) — aceito como temporário; persistência real é ticket próprio.
- **D3 — DTOs estáveis:** o `GET /{id}` **reusa** o DTO do C0 (`contractToListItem` + `contractListItemSchema`) — é o mesmo agregado `Contract`. A timeline ganha `timelineEntrySchema` novo (`eventId`, `contractId`, `kind`, `occurredAt` ISO, `actor` string|null, `subjectAmendmentId` string|null) + mapper `timelineEntryToDto`.
- **D4 (nova) — Seed RBAC inline no auth memory (resolve o bootstrap):** `AuthCompositionConfig` ganha `seed?: { users: { email; password; permissions: string[] }[] }`. No boot **memory**, cada seed user é criado com um `Role` **inline** contendo as permissions (`Role.create` → `User.register({ roles:[role] })` → `userRepo.save`), **bypassando** o use case `assignRole` (que exige ator privilegiado). Como `authorize` varre `user.roles` inline (NÃO consulta `roleRepo`), o seed inline basta — **sem wirar `roleRepo`/`assignRole`**. Seed é dev/test; produção concede via banco/ticket de bootstrap dedicado.
- **D5 (nova) — Seed de contratos no composition memory:** `ContractsCompositionConfig` ganha `seed?: readonly Contract[]` (memory; ignorado em mysql), persistido via `repo.save(c, [])`. Permite o teste exercitar `GET /{id}` → **200 com dados** (sem `create`, que é C2).
- **D6 (nova) — 404 da timeline via `getContract`:** o handler de `/{id}/history` resolve a existência do contrato com `getContract` (reader) → `contract-not-found` ⇒ **404**; senão chama `getContractTimeline` → **200** + entries (lista vazia é válida). Custo: 2 reads no reader; sem use case novo.

## 6. Plano técnico

```
1. auth/adapters/http/composition.ts:
   - buildStores ganha `roleRepo`? NÃO — seed usa Role inline (D4); roleRepo dispensado.
   - AuthCompositionConfig += `seed?: { users: { email; password; permissions: string[] }[] }`
   - AuthHttpDeps += `authorize: (permissionName: string) => preHandlerAsyncHookHandler`
   - no build: `authorize` = (name) => Permission.parse(name) |> makeAuthorize(userReader)
   - applySeed(memory): p/ cada user → Role.create({id:RoleId.generate(), name, permissions})
     → User.register({id:UserId.generate(), email, passwordHash, roles:[role]}) → userRepo.save

2. auth/public-api/http.ts: re-exporta tipos atualizados (AuthHttpDeps já cobre).

3. contracts/adapters/http/composition.ts:
   - ContractsCompositionConfig += `seed?: readonly Contract[]` (memory)
   - ContractsHttpDeps += `getContract`, `getContractTimeline`
   - getContract({ contractRepo: contractReaderRepo }); timelineRepo=InMemoryTimelineRepository()
   - memory: seed via repo.save(c, []) p/ cada contrato

4. contracts/adapters/http/schemas.ts:
   - reusa contractListItemSchema p/ GET /{id} (200); idParamSchema (uuid)
   - timelineEntrySchema + timelineListSchema (novos)

5. contracts/adapters/http/contract-dto.ts (ou timeline-dto.ts): timelineEntryToDto(entry)

6. contracts/adapters/http/plugin.ts:
   - ContractsHttpHooks += `authorize: (permissionName: string) => preHandlerAsyncHookHandler`
   - GET /contracts/:id  → preHandler:[requireAuth, authorize('contract:read')] → getContract → 200|404
   - GET /contracts/:id/history → idem → getContract (404?) → getContractTimeline → 200

7. src/server.ts: contractsHttpPlugin(contractsDeps, { requireAuth, authorize: authDeps.authorize })
```

## 7. Constitution check

| Fonte | Exigência | Como adere |
| :-- | :-- | :-- |
| `ADR-0026` | Reads usam o reader | `getContract` e `getContractTimeline` injetados com `contractReaderRepo` |
| `ADR-0024`/`0006` | Auth via HTTP, modularidade | Relação via public-api do auth (`makeAuthorize` + export `authorize` hook) |
| `ADR-0025`/`0027` | Fastify + Zod na borda | Zod schemas explícitos em `schemas.ts` e Fastify routes |
| `ADR-0022` | Timeline via projeção | Timeline do contrato reusada no endpoint `/history` |

## 8. Riscos & mitigações

| Risco | Sev. | Mitigação |
| :-- | :-- | :-- |
| Timeline em memória reiniciar em deploys | Média | Já mapeado no ADR-0022 que é read-model derivado e reconstrutivo; escopo de produção do banco será resolvido em ticket posterior. |
| Incompatibilidade no tipo de `Permission` | Baixa | `Permission` de auth e contracts deve bater. Usaremos a string `'contract:read'` mapeada no módulo auth. |

## 9. Definition of Done

- [ ] Ambas as rotas criadas sob `/api/v2/contracts/{id}` e `/api/v2/contracts/{id}/history`.
- [ ] Autenticação (`requireAuth`) e autorização baseada em permissão (`authorize('contract:read')`) plenamente exercitadas e testadas.
- [ ] Testes da Wave W0 (RED) falhando. Testes da Wave W1 (GREEN) passando.
- [ ] `pnpm test`/`typecheck`/`format`/`lint` todos verdes.
