# PARTNERS-COLLAB-FILTERS-DECISION — Decisão formal sobre filtros programa/idade

**Épico**: `specs/001-partners-http-gaps/` (ticket #6) · **Size**: S · **US-005 / FR-012**

Decisão (clarify Session 2026-06-06): DESCARTAR `programa` e `idade`. O contrato de
`GET /api/v1/collaborators` não os anuncia; chaves desconhecidas são removidas (strip) pelo z.object.
