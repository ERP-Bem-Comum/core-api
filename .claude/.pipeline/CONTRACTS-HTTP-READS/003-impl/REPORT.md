# W1 (GREEN) — CONTRACTS-HTTP-READS (C1)

> Agente: `fastify-server-expert` · Driver: memory · Outcome: **GREEN** (12/12 na suíte canônica)

## O que foi implementado

### Auth (`src/modules/auth/adapters/http/composition.ts`)

- `AuthSeedUser` / `AuthSeed` + `AuthCompositionConfig.seed?` — seed RBAC inline (dev/test).
- `applyRbacSeed(...)` — cria cada user com um `Role` **inline** contendo as `permissions`. Bypassa o
  use case `assignRole` (que exige ator com `user:assign-role` — chicken-and-egg do bootstrap), porque
  `authorize` varre `user.roles` inline e nunca consulta o `roleRepo`.
- `AuthHttpDeps.authorize: (permissionName: string) => preHandlerAsyncHookHandler` — fábrica de
  preHandler RBAC por **nome** de permissão (`string`, não o VO `Permission`), validado internamente via
  `Permission.parse` para não vazar `auth/domain` a outros módulos (ADR-0006). Delega a `makeAuthorize`.

### Contracts (`src/modules/contracts/adapters/http/`)

- `composition.ts`: `ContractsCompositionConfig.seed?: readonly Contract[]` (memory, dev/test) +
  `ContractsHttpDeps` agora expõe `getContract` e `getContractTimeline`. Timeline usa
  `InMemoryTimelineRepository` para **ambos** os drivers (sem persistência Drizzle ainda — D2).
- `schemas.ts`: `contractIdParamSchema` (`z.uuid()` → 400 antes do domínio) + `timelineEntrySchema` /
  `timelineSchema` + `TimelineEntryDto`.
- `timeline-dto.ts` (novo): mapper `TimelineEntry` → DTO (`Date` → ISO 8601).
- `plugin.ts`: `ContractsHttpHooks` += `authorize`. Duas rotas novas, ambas
  `[requireAuth, authorize('contract:read')]`:
  - `GET /contracts/:id` → 200 (`contractListItemSchema`) | 404 (`contract-not-found`).
  - `GET /contracts/:id/history` → 200 (`timelineSchema`) | 404. **Guard de existência**: a timeline
    devolve `[]` para id desconhecido (read-model), então a existência do contrato é checada via
    `getContract` antes de listar — sem ele, contrato inexistente daria 200 em vez de 404 (CA2).

### Server (`src/server.ts`)

- Passa `authorize: authDeps.authorize` ao `contractsHttpPlugin`.

## Decisão sobre suítes de teste

O W0 deixou **duas** suítes: `contracts-reads.routes.test.ts` (canônica, com seed RBAC — citada no
REPORT W0) e `contracts-read.routes.test.ts` (sem "s"). A segunda era **defeituosa**: registrava um user
sem permissão (`roles:[]`) e esperava 404 nos casos "id inexistente", mas o RBAC corretamente retorna 403
antes do lookup (403 ≠ 404). Removida — superada pela canônica.

A suíte C0 `contracts-list.routes.test.ts` foi ajustada para injetar `authorize` (contrato do hook mudou).

## Evidência GREEN

```
contracts-reads.routes.test.ts → tests 12 · pass 12 · fail 0
suíte completa → tests 1485 · pass 1469 · fail 0 · skipped 16 (gate integração auth, MYSQL_INTEGRATION=1)
```

Gates antecipados de W3 já verdes: `typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `test` ✓.
