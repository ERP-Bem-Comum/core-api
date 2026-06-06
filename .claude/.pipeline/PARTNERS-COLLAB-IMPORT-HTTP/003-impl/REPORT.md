# W1 — Implementação · PARTNERS-COLLAB-IMPORT-HTTP (🟡 GREEN funcional)

- `adapters/http/collaborator-import-dto.ts`: `parseCollaboratorImportCsv` (consome `parseCsv` do shared; commands + lineOf + mappingFailures).
- `adapters/http/composition.ts`: wiring de `importCollaborators` (type + makeDeps).
- `adapters/http/plugin.ts`: `addContentTypeParser('text/csv', parseAs:'string', bodyLimit=2MiB)` + rota `POST /collaborators/import` (relatório `{created, failed:[{line,error}]}`; vazio→200/0; malformado→400).

Testes: dto + rotas = **10 pass / 0 fail**.
