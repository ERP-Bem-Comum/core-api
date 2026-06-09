# 000 — Request PRG-PROGRAMS-MODULE

> **Novo módulo `programs` (Bounded Context).** Size: L. Plano completo em `specs/008-gestao-programas/`.
> Implementação **MVP-first** em fatias W0→W3: domínio puro → persistência → use cases → HTTP.

## Escopo

Implementar o módulo `src/modules/programs/` conforme `specs/008-gestao-programas/` (spec/plan/data-model/
contracts/tasks). Borda HTTP sob **`/api/v1/programs`** (port legado — ADR-0033).

## Fatiamento (sub-entregas, cada uma W0→W1→gate verde)

1. **Domínio puro** (esta fatia): `ProgramId`, VO `Sigla`, `ProgramStatus`, `errors`, `events`, `types`,
   operações `Program.{create,update,deactivate,reactivate}`. Testes: `sigla.test.ts`, `program.test.ts`.
2. Ports + persistência (InMemory + Drizzle `prg_*`, geração `program_number`, optimistic-lock, outbox).
3. Use cases (create/list/get/update/deactivate/reactivate).
4. Borda HTTP (`/api/v1/programs`) + permissões `program:*` no catálogo `auth`.
5. Logo (storage S3/MinIO) — sub-fatia P3.

## Decisões herdadas da spec (já clarificadas)

- Identidade dupla: `id` UUID v4 (PK) + `program_number` sequencial interno (UNIQUE, MAX+1 sob FOR UPDATE).
- Optimistic-lock (`version`) **só no `PUT`**; desativar/reativar usam guarda de estado.
- Desativação soft (status); escritas retornam o recurso no corpo.
- Erros: string-union kebab EN (padrão `auth`/`partners`). Agregado como namespace-objeto.

## Critérios de aceitação (fatia 1 — domínio)

- **CA1** `Sigla.create` normaliza (trim+uppercase) e valida `[A-Z0-9]{2,20}`; inválida → `program-sigla-invalid`.
- **CA2** `Program.create` exige nome (≥2) e sigla válida; nasce `ATIVO`, `version=1`; emite `ProgramCreated`.
- **CA3** `Program.update` revalida nome/sigla; rejeita `version` divergente → `program-version-conflict`; incrementa `version`; emite `ProgramUpdated`.
- **CA4** `Program.deactivate` exige `ATIVO` (senão `program-not-active`) → `INATIVO`; emite `ProgramDeactivated`.
- **CA5** `Program.reactivate` exige `INATIVO` (senão `program-not-inactive`) → `ATIVO`; emite `ProgramReactivated`.
- **CA6** Domínio puro: `Result`, sem `throw`, sem `class`, switch exaustivo. Gate W3 verde.

---

## Progresso e retomada (handoff pós-`/clear` — 2026-06-09)

**Fatias ENTREGUES e VERDES (W0 RED → W1 GREEN, cada uma commitada):**

| Fatia | Commit | Conteúdo |
| --- | --- | --- |
| 1 — domínio puro | `a9df780` | `ProgramId`, `Sigla`, `ProgramStatus`, errors/events/types, `Program.{create,update,deactivate,reactivate,setLogo}` |
| 2a — persistência InMemory | `d0135f7` | port `ProgramRepository`, `OutboxPort`, `ProgramsModuleEvent`, `InMemoryOutbox`, `InMemoryProgramRepository`, suite parametrizada |
| 3a — use cases MVP | `eb40d98` | `createProgram` + `listPrograms` |
| 2b — Drizzle real | `5a87d19` | schema `prg_*` + migration endurecida + driver + mappers + `program-repository.drizzle.ts` + teste integração (`test:integration:programs`) |
| 3b — use cases restantes | `b07cd13` | `getProgram`/`updateProgram`/`deactivateProgram`/`reactivateProgram` |
| 5 — logo | `a95059b` | port `LogoStorage` + InMemory/S3 + `uploadProgramLogo` |

**Gate atual:** `pnpm test` 2603 pass / 0 fail · `pnpm run test:integration:programs` 8 pass.

**FALTA: Fatia 4 — Borda HTTP** (`/api/v1/programs`). É o único passo restante para o MVP end-to-end. Plano e contrato já prontos em `specs/008-gestao-programas/` (`tasks.md` T021-T034, `contracts/programs-http.md`).

### O que criar na fatia 4 (moldes reais a copiar)

- `src/modules/programs/adapters/http/schemas.ts` — Zod request/response + paginação. Molde: `src/modules/contracts/adapters/http/schemas.ts`.
- `src/modules/programs/adapters/http/program-dto.ts` — `Program → DTO`. Molde: contracts `*-dto.ts`.
- `src/modules/programs/adapters/http/plugin.ts` — `programsRoutes` + `programsHttpPlugin` (7 rotas). Molde: `src/modules/contracts/adapters/http/plugin.ts`. Usar `sendResult` de `#src/shared/http/reply.ts`.
- `src/modules/programs/adapters/http/composition.ts` — `buildProgramsHttpDeps({ driver: 'memory'|'mysql' })`. Molde: `src/modules/partners/adapters/http/composition.ts` (switch memory/mysql; usa `openProgramsMysql` + `createDrizzleProgramRepository`).
- `src/modules/programs/public-api/http.ts` + `permissions.ts` (`PROGRAM_PERMISSION = { read, write, deactivate }`). Molde: `contracts/public-api/{http,permissions}.ts`.
- **Catálogo global**: adicionar `program:deactivate`, `program:read`, `program:write` (ordem alfabética) em `src/modules/auth/domain/authorization/permission-catalog.ts`. ⚠️ pode haver teste que valida o catálogo (regressão) — atualizar.
- **Registro**: sob prefixo explícito **`/api/v1`** (`{ plugin, prefix: '/api/v1' }` — ADR-0033, NÃO o default `/api/v2`) no entrypoint do servidor HTTP (`buildApp` / `server.ts`).
- Testes `fastify.inject` (driver `memory`). Molde: `tests/modules/contracts/adapters/http/contracts-writes.routes.test.ts` + `contracts-list.routes.test.ts`. Cobrir: POST 201 + `Location` + corpo; 409 sigla; 422; **401 (sem token) e 403 (sem permissão)**; GET paginação/busca/vazio; PUT 409 version-conflict; deactivate/reactivate 409 guarda de estado; POST /:id/logo multipart (413/415).
- Coleção Bruno (ADR-0034) opcional para integração HTTP real.

### Decisões herdadas (NÃO reabrir)

- Borda em **`/api/v1`** (port legado sem re-estudo de domínio — `/api/v2` é reservado a Contratos/Financeiro).
- Optimistic-lock (`version`) **só no `PUT`**; deactivate/reactivate usam guarda de estado (sem `version`).
- **Escritas retornam o recurso no corpo** (`POST` 201, `PUT`/`deactivate`/`reactivate` 200) — nunca 200 vazio (lição do handoff de Parceiros).
- Erros internos em kebab EN; eventos `Program*`; agregado namespace-objeto.

### Fechamento do ticket (após fatia 4)

`pnpm run pipeline:state wave-finish PRG-PROGRAMS-MODULE W1 --outcome GREEN` → W2 (code-reviewer) → W3 (`ts-quality-checker`: typecheck+format+lint+test + `test:integration:programs`) → `pnpm run pipeline:state close PRG-PROGRAMS-MODULE`. Mover `handbook/tickets/doing/PRG-GESTAO-PROGRAMAS.md` → `done/`.
