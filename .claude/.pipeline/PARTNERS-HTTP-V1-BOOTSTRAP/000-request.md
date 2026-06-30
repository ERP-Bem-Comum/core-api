# Ticket PARTNERS-HTTP-V1-BOOTSTRAP: Bootstrap da borda HTTP `/api/v1` do módulo partners + 1ª rota (lista de colaboradores)

> Fatia **P0** do `EPIC-COLLABORATORS-HTTP-V1` (`.claude/.planning/EPIC-COLLABORATORS-HTTP-V1.md`).

## Contexto

O módulo `partners` tem domínio, use cases e persistência de **Collaborator** prontos, mas **nenhuma
camada HTTP**. Diferente de `auth`/`contracts` (que nasceram sob `/api/v2`), Colaboradores **espelha o
legado** e deve ser exposto sob **`/api/v1`** (ADR-0033). Hoje o `buildApp()` (`src/shared/http/app.ts`)
**hardcoda** `/api/v2` no registro de plugins e no hook `onSend` de `cache-control: no-store` — então a
estreia do v1 exige generalizar o shell de borda **sem regredir** auth/contracts.

Esta fatia entrega o alicerce (análogo ao C0 de contracts): generalização do `buildApp`, composition root
HTTP de partners, catálogo de permissions, registro no `server.ts` e a **1ª rota** `GET /api/v1/collaborators`.

## Escopo

- **`src/shared/http/app.ts`** — `BuildAppOptions.routes` passa de `readonly FastifyPluginAsync[]` para
  `ReadonlyArray<{ plugin: FastifyPluginAsync; prefix?: string }>` com **default `'/api/v2'`**. O hook
  `onSend` (no-store) passa a cobrir `/api/v1` **e** `/api/v2`.
- **`src/server.ts`** — adapta os call-sites de auth/contracts ao novo shape (continuam `/api/v2`);
  registra `collaboratorsHttpPlugin` sob `prefix: '/api/v1'` injetando `{ requireAuth, authorize }`.
- **`src/modules/partners/public-api/permissions.ts`** — `COLLABORATOR_PERMISSION = { read: 'collaborator:read', write: 'collaborator:write' }`.
- **`src/modules/partners/adapters/http/composition.ts`** — `buildPartnersHttpDeps(config)`: driver
  `memory|mysql` (RW split ADR-0026, reader=writer sem réplica), instancia `listCollaborators`; expõe `shutdown`.
- **`src/modules/partners/adapters/http/plugin.ts`** — `collaboratorsHttpPlugin(deps, hooks)`: rota
  `GET /collaborators` (lista paginada) com `preHandler: [requireAuth, authorize(read)]`.
- **`src/modules/partners/adapters/http/schemas.ts`** — Zod: query da lista + response paginada.
- **`src/modules/partners/adapters/http/collaborator-dto.ts`** — mapper `Collaborator` → item de lista.
- **`src/modules/partners/public-api/http.ts`** — exporta plugin + `buildPartnersHttpDeps` + tipos (ADR-0006/0028).
- **Seed RBAC E2E** — `collaborator:read`/`collaborator:write` disponíveis para o seed de teste.

## Fora de escopo

- `GET /:id` (detalhe), filtros avançados da lista → **P1**.
- `POST` cadastro / `PATCH` completar → **P2**.
- `deactivate`/`reactivate` → **P3**.
- E2E smoke com MySQL real → **P4**.
- `importCollaborators`, `link-to-profile`, auto-cadastro público (fora do épico).

## Critérios de aceite

- [ ] `buildApp({ routes: [{ plugin, prefix }] })` registra cada plugin sob o seu prefixo; chamada sem
      `prefix` cai no default `/api/v2` (retrocompat).
- [ ] auth e contracts continuam respondendo em `/api/v2/*` (sem regressão na suite existente).
- [ ] `GET /api/v1/collaborators` → **401** sem `Authorization`.
- [ ] `GET /api/v1/collaborators` → **403** autenticado sem `collaborator:read`.
- [ ] `GET /api/v1/collaborators` → **200** com token + permissão, corpo `{ items, meta }` (lista paginada).
- [ ] Resposta de `/api/v1/*` traz `cache-control: no-store`.
- [ ] `tsc --noEmit` + `format:check` + `pnpm test` + `lint` verdes (W3).

## Referências

- ADR-0033 (versionamento `/api/v1` legado), ADR-0025/0027/0028 (borda HTTP), ADR-0026 (RW split), ADR-0006/0031 (módulo/isolamento), ADR-0024 (RBAC).
- Padrão a espelhar: `src/modules/contracts/adapters/http/{plugin,composition,schemas}.ts` e `contracts/public-api/{http,permissions}.ts`.
- Spec do épico: `.claude/.planning/EPIC-COLLABORATORS-HTTP-V1.md`.
