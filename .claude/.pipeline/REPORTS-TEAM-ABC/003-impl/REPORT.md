# W1 — Implementação (REPORTS-TEAM-ABC · #238 · REP-1)

**Outcome:** GREEN. Skills: `ports-and-adapters` + `fastify-server-expert` (par `zod-expert`).

## Entregue

### 1. `partners/public-api` — reader boot-scoped da projeção
- `src/modules/partners/public-api/collaborator-projection.ts`
  - `openCollaboratorProjectionReader({ connectionString }) → Result<CollaboratorProjectionReader, string>`
  - `CollaboratorProjectionReader = { list, close }` — pool aberto **uma vez**, reusado, fechado no `close()`.
  - `list()` mapeia `createDrizzleCollaboratorReader.list()` para **9 colunas LGPD-safe**: `id, name, program(=null), role, employmentRelationship, startOfContract (date-only), registrationStatus, active, education, experienceInPublicSector`.
  - `program: null` — coluna não existe no agregado `Collaborator` (divergência documentada, 000-request.md §Decisão).
- `src/modules/partners/public-api/index.ts` — exporta `openCollaboratorProjectionReader` + tipos.

### 2. Módulo novo `reports` (greenfield)
- `application/ports/team-report-read.ts` — `TeamMember` (9 cols), `TeamReportReadError='team-report-read-unavailable'`, `TeamReportReadPort.list`.
- `adapters/persistence/team-report-read.partners.ts` — adapter ACL sobre `openCollaboratorProjectionReader.list` (recebe o `list` boot-scoped, nunca connection-string).
- `adapters/persistence/team-report-read.in-memory.ts` — fake para testes/boot sem DB.
- `adapters/http/{schemas,dto,plugin,composition}.ts` — `GET /reports/team`, gate `authorize('collaborator:read')`, response Zod fechado (strip), pool aberto 1× no boot + `shutdown()` que fecha.
- `public-api/http.ts` — barrel (`buildReportsHttpDeps` + `reportsHttpPlugin`).

### 3. Wiring `src/server.ts`
- Env `REPORTS_DRIVER` / `REPORTS_DATABASE_URL` (fallback `PARTNERS_DATABASE_URL`, mesmo `core`/`par_*`).
- `await buildReportsHttpDeps(...)` no boot; `reportsHttpPlugin` montado em `/api/v2/reports/team`; `reportsDeps.shutdown()` no graceful shutdown.

## Testes (W0 → GREEN)
- `tests/modules/reports/adapters/http/reports-team.http.test.ts` — CA1 (200, 9 cols, program:null) · CA2 (RBAC 403/200) · CA3 (sem dado sensível). **3/3 GREEN** (memory driver, `fastify.inject`).
- `tests/modules/partners/public-api/collaborator-projection.drizzle-mysql.test.ts` — **CA4**: reader boot-scoped lê `par_collaborators` real, projeta 9 cols, prova LGPD (`Object.keys` = exatamente 9). **GREEN no MySQL (OrbStack)**. Registrado em `scripts/ci/test-integration.ts` (suíte `partners`).

## YAGNI
Sem CSV/PDF (front monta do JSON), sem persistência nova (read-only), sem as outras 8 slices do épico #114.
