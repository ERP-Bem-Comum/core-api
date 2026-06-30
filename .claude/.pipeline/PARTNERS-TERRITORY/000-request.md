# PARTNERS-TERRITORY — Estados/Municípios parceiros (soft-delete)

**Épico**: `specs/001-partners-http-gaps/` (ticket #5) · **Size**: L · **US-002** · ADR-0001 (resolve D9)

## Escopo (9 componentes)
- domain/geography/partner-state.ts + partner-municipality.ts (Entity soft-delete: status Active|Inactive + deactivatedAt; reusa StateAbbreviation/IbgeCode)
- application/ports/partner-geography-repository.ts (toggle/list)
- use-cases: toggle/list partner-state + partner-municipality
- adapters/persistence/schemas/mysql.ts: + par_states + par_municipalities (active+deactivated_at+CHECK, prefixo par_*)
- migration gerada (db:generate --config drizzle.config.partners.ts)
- repos partner-geography-repository.{in-memory,drizzle}.ts
- adapters/http/partner-geography-plugin.ts (GET/POST/DELETE /partner-states, /partner-municipalities) + schemas Zod
- public-api/permissions.ts: + GEOGRAPHY_PERMISSION {read,write}
- wiring: composition.ts (memory|mysql) + server.ts ({plugin, prefix:'/api/v1'}) + public-api/http.ts (export do plugin)

## Contrato: ver specs/001-partners-http-gaps/contracts/README.md (US-002)
## CAs: ver bdd/partner-territory.feature (CT-101..109)
