# 004 — W2 Code Review (read-only) — PRG-PROGRAMS-MODULE / fatia 4

> Audit read-only da borda HTTP `/api/v1/programs`. Round 1.

## Veredito: **APPROVED**

## Conformidade verificada

- **ADR-0006 (isolamento de módulo)**: `plugin.ts` importa só do próprio módulo (`composition`, `schemas`, `program-dto`, `public-api/permissions`) + shared (`reply`, `errors`, `correlation`, `result`). Nenhum import de `domain/`/`application/` de outro módulo. `server.ts` consome programs exclusivamente via `public-api/http.ts`. ✅
- **ADR-0033 (port legado)**: registro sob prefixo explícito `/api/v1` (não o default `/api/v2`). ✅
- **ADR-0027 (Zod na borda)**: schemas Zod request/response; serializer valida o corpo de resposta. ✅
- **ADR-0011 (supply-chain)**: logo via `addContentTypeParser` nativo do Fastify — nenhuma dependência nova. ✅
- **Idioma**: código EN, docs/comentários PT, error codes kebab EN, eventos `Program*`. ✅
- **`exactOptionalPropertyTypes`**: query de lista monta `search`/`status` condicionalmente (sem `key: undefined`). ✅
- **Escritas com corpo**: POST 201 + `Location` + corpo; PUT/deactivate/reactivate 200 + corpo. ✅
- **Mapa de status** (`writeErrorStatus`) espelha o contrato `programs-http.md` (404/409/422/413/415/503). ✅
- **Catálogo de permissões**: 3 novas entradas em ordem alfabética + teste de integridade (lista fixa) atualizado no mesmo diff. ✅

## Observações (não-bloqueantes)

1. `sendWriteError` é usado também no handler de **GET** (lista/detalhe) para o caso `program-repo-unavailable`. Funciona (mapeia 503), mas o nome sugere "escrita". Mantido por simetria com o mapa único de status; renomear para `sendError` seria cosmético — deixado como está para não ampliar o diff.
2. `result.value.program.logoKey ?? ''` no upload: defensivo. Após `Program.setLogo(program, key, …)` a key é sempre string; o `?? ''` só satisfaz o tipo `string | null`. Sem impacto observável.
3. Em `driver: mysql` sem envs `PROGRAMS_LOGO_S3_*`, o storage cai para in-memory (degradado). Documentado em `composition.ts` e `server.ts`; aceitável para o MVP (o upload de logo é fatiável como P3 — FR-022).

## Cobertura de teste (W0 → GREEN)

28 testes `fastify.inject` (driver memory) cobrindo, por rota: 401/403, sucesso com corpo, 409 (sigla-duplicated, version-conflict, guarda de estado), 422 (nome/sigla inválidos), 404, paginação/busca/vazio (FR-011), 413/415 (logo).
