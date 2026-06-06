# PARTNERS-COLLAB-IMPORT-HTTP — Rota de import de colaboradores

**Épico**: `specs/001-partners-http-gaps/` (ticket #2) · **Size**: M · **US-001**

## Decisão de design (confirmada com o dono)
Corpo `text/csv` **cru** (não multipart) — consumidor é o BFF; zero dependência nova
(`@fastify/multipart` evitado, Princ. VIII / ADR-0011). `bodyLimit` cobre o DoS.

## Escopo
- `addContentTypeParser('text/csv', { parseAs: 'string', bodyLimit })` no plugin de colaboradores.
- Rota `POST /api/v1/collaborators/import` (`authorize('collaborator:write')`).
- `collaborator-import-dto.ts`: `parseCollaboratorImportCsv(content)` → commands + lineOf + mappingFailures (consome `parseCsv` do shared, CORE-CSV-PARSE-UTIL).
- Wiring de `importCollaborators` em `PartnersHttpDeps`/`makeDeps`.
- Output `{ created, failed: [{ line, error }] }` (combina mappingFailures + falhas de domínio; index→line).

## Critérios de aceitação
- 401 sem sessão; 403 sem permissão; CSV válido → created=N, failed=[]; parcial → created + failed com linha; vazio → created:0; malformado → 400 com requestId.
