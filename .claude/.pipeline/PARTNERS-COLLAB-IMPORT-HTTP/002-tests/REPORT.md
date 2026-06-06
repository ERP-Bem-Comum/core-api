# W0 — Testes RED · PARTNERS-COLLAB-IMPORT-HTTP

**Outcome**: 🔴 RED (motivo certo)

- `collaborator-import-dto.test.ts` — `parseCollaboratorImportCsv` (mapeamento, lineOf, mappingFailures, propaga csv-empty/malformed). RED: `ERR_MODULE_NOT_FOUND` (dto não existe).
- `collaborators-import.routes.test.ts` — 6 CAs via inject (401/403/válido/parcial/malformado-400/vazio). RED: rota responde 404.
