# W0 — RED · REPORTS-TEAM-ABC (REP-1 · #238)

> Outcome: RED · Skill `tdd-strategist` · Módulo NOVO `reports`.

## Teste
`tests/modules/reports/adapters/http/reports-team.http.test.ts` (fastify.inject):
- **CA1** `GET /api/v2/reports/team` → 200 com as 9 colunas LGPD-safe (`program: null`).
- **CA2** RBAC — sem `collaborator:read` → 403; com → 200.
- **CA3** payload não vaza dado sensível (grep por cpf/rg/salário/endereço/saúde).

## API fixada pelo teste (W1 implementa)
- `reports/public-api/http.ts`: `buildReportsHttpDeps({driver})` + `reportsHttpPlugin(deps, hooks)`.
- `ReportsHttpDeps.listTeam(): Promise<Result<readonly TeamMember[], E>>` (injetável nos testes).
- `TeamMember` (`reports/application/ports/team-report-read.ts`): 9 colunas — `{ id, name, program: null, role, employmentRelationship, startOfContract, registrationStatus, active, education, experienceInPublicSector }`.
- Rota `GET /reports/team` com `preHandler: [requireAuth, authorize('collaborator:read')]` + Zod response.

## Prova de RED
`ERR_MODULE_NOT_FOUND` de `reports/public-api/http.ts` (módulo greenfield).

## Handoff W1
1. **partners/public-api:** `listCollaboratorsForProjection` (molde `supplier-projection.ts`) — só as 9 colunas LGPD-safe.
2. **reports (novo):** port + adapter (ponte p/ partners) + rota + `public-api/http.ts` + composição + registro no `src/server.ts` (plugin direto → `/api/v2`).
3. **W3:** validar a projeção lendo `par_collaborators` real (OrbStack).
