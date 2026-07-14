# REPORTS-TEAM-ABC — escopo (REP-1 · #238 · Bloco D do #404)

> Issue **#238** (fatia 1 do épico Relatórios **#114**). Módulo NOVO **`reports`** + extensão da public-api do `partners`. Size **M**.

## Contexto (via Explore)
O front vai construir o módulo Relatórios (9 slices, zero mock). REP-1 "Equipe ABC" = `GET .../reports/team` — projeção de **9 colunas enxutas LGPD-safe** de collaborators. O módulo `reports` **não existe** (greenfield). A public-api do `partners` **não expõe lista de collaborators** (só `CollaboratorView` por-id, 2 colunas) → precisa de uma projeção de lista nova (molde: `listSuppliersForProjection`).

## Decisão: coluna `programa`
`programa` **não existe** no modelo de collaborator (nem agregado, nem `par_collaborators`). As outras 8 colunas existem. **Decisão:** expor `program: null` no contrato (honra o shape de 9 colunas; divergência documentada — mesmo padrão aceito no REP-2/#240). Follow-up: ligação collaborator↔programa (issue à parte).

## Escopo (in)
1. **`partners/public-api`:** nova projeção `listCollaboratorsForProjection(connectionString) → Result<CollaboratorTeamProjection[], string>` — expõe **só** as 9 colunas LGPD-safe (name, program=null, role, employmentRelationship, startOfContract, registrationStatus, active, education, experienceInPublicSector). Molde: `supplier-projection.ts`. **Dado sensível (CPF/RG/salário/raça/gênero/saúde/endereço/contato) NUNCA cruza a public-api.**
2. **Módulo `reports` (novo):** `application/ports/team-report-read.ts` (port `list`) + `adapters/http/plugin.ts` (`GET /reports/team`, gate `authorize('collaborator:read')`, Zod response) + adapter que faz a ponte para a projeção do partners + `public-api/http.ts` (`buildReportsHttpDeps` + `reportsHttpPlugin`) + registro no `src/server.ts` (plugin direto → `/api/v2`).

## Fora de escopo
- Demais 8 slices (#240/#243/etc.) → tickets próprios. Ligação collaborator↔programa → follow-up. CSV/PDF (front monta do JSON). Persistência nova (read-only).

## Critérios de aceite
- **CA1** `GET /api/v2/reports/team` retorna as 9 colunas LGPD-safe por collaborator (`program: null`).
- **CA2** RBAC: sem `collaborator:read` → 403; com → 200.
- **CA3** Dado sensível NÃO aparece no payload (só as 9 colunas).
- **CA4** Projeção do partners lê da fonte real (`par_collaborators`) — validado no MySQL (OrbStack).

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — `GET /reports/team` (fastify.inject) + projeção partners |
| W1 | `ports-and-adapters` + `fastify-server-expert` (par `zod-expert`) | projeção partners + módulo reports + rota + wiring server |
| W2 | `code-reviewer` (+ `security-backend-expert` p/ LGPD) | audit read-only |
| W3 | `ts-quality-checker` | gate + integração MySQL (OrbStack) |

## DoD
Gate W3 verde + `GET /reports/team` no `/api/v2` com RBAC + projeção validada no OrbStack. Não fecha #114 (é 1 de 9 slices); fecha #238.
