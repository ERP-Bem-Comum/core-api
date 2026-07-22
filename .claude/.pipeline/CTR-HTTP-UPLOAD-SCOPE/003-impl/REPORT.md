# CTR-HTTP-UPLOAD-SCOPE — W1 (implementação mínima, GREEN)

> Wave despachada ao `fastify-server-expert`; sessão principal fiscalizou o diff estrutural
> (sub-scope contém só E1/E2/E3 com auth intacta; E4/E5 e reads/writes fora, sem o parser;
> nenhuma auth removida) e persistiu este REPORT.

## O que mudou

`src/modules/contracts/adapters/http/plugin.ts` — a função `contractsRoutes` isolou o
`addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: MAX_UPLOAD_BYTES })`
+ as 3 rotas de upload num **sub-scope** dedicado:

```ts
await scope.register(async (uploadScope: typeof scope) => {
  uploadScope.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: MAX_UPLOAD_BYTES }, ...);
  uploadScope.route({ ... }); // E1 POST /contracts/:id/documents
  uploadScope.route({ ... }); // E2 POST /contracts/:id/amendments/:amendmentId/documents
  uploadScope.route({ ... }); // E3 POST /contracts/:id/documents/:documentId/supersede
});
```

As demais rotas de `/contracts` (reads, writes, E4 `DELETE .../documents/:documentId`, E5
`GET .../documents/:documentId/content`) permanecem em `scope` (pai) — **sem** o parser
octet-stream, herdando só o `bodyLimit` global de 1 MiB (`src/shared/http/app.ts`). Nenhuma
lógica de upload/magic-bytes/sanitize/ownership foi alterada — só o local de registro
(`scope.route` → `uploadScope.route` para E1/E2/E3; corpo dos handlers idêntico). Todas as
rotas mantêm `preHandler: [requireAuth, authorize(write|read)]`.

Fix espelha o já aplicado no financial (`FIN-DOC-INGEST-HTTP`, achado M1):
`src/modules/financial/adapters/http/plugin.ts` (sub-scope `ingestScope`).

## Como o sub-scope resolve o CWE-770

`addContentTypeParser` é acionado por **Content-Type**, não por rota, e a fase de **Parsing**
ocorre **antes** da Validation e do `preHandler` (auth) no Fastify Lifecycle. Registrado no
`scope` pai (como estava), o parser de 20 MiB valia para **qualquer** rota de `/contracts` que
recebesse `Content-Type: application/octet-stream` — inclusive rotas sem relação com upload e
**antes** de qualquer checagem de identidade (alocação de recurso sem limite adequado,
pré-autenticação). Ao mover `addContentTypeParser` para o sub-scope `uploadScope`, a
encapsulação nativa do Fastify garante que **só** as 3 rotas registradas dentro desse
sub-scope enxergam o parser de 20 MiB; toda rota fora dele (reads/writes/E4/E5) não tem parser
para `application/octet-stream` e, pós-fix, uma requisição desse Content-Type é rejeitada na
própria fase de Parsing (415, media type sem parser, ou 413 se o corpo exceder o bodyLimit
global de 1 MiB) — sempre antes do `preHandler`.

## Evidência GREEN (literal)

Teste do ticket:
```
▶ CA1 (regressão): ✔ POST /contracts/:id/documents com PDF pequeno + auth -> 201
▶ CA2 (o fix):     ✔ DELETE /contracts/:id + octet-stream ~2 MiB SEM token -> 413/415, NUNCA 401
▶ CA3 (limite):    ✔ POST /contracts/:id/documents com corpo > 20 MiB -> 413
ℹ tests 3 · pass 3 · fail 0
```

Regressão (contracts-documents + docs-hardening + document-delete): `tests 35 · pass 35 · fail 0`.
Suíte completa do módulo contracts (reforço regressão zero): `tests 966 · pass 952 · fail 0 · skipped 14`.

`pnpm run typecheck` → exit 0 (o `register` com type-provider Zod, anotado explicitamente
`uploadScope: typeof scope`, não gerou `unsafe-argument`).
`prettier --check` + `eslint` em `plugin.ts` → ambos limpos.

## Ressalvas para o W2 (security-backend-expert)

- Confirmar que o sub-scope não introduziu via alternativa de bypass do `preHandler` (auth)
  para E1/E2/E3 — os hooks `requireAuth`/`authorize` continuam declarados por rota, inalterados.
- Validar que a rejeição pós-fix em rotas não-upload (413/415) não vaza informação sensível no
  corpo do erro (error handler central em `src/shared/http/errors.ts` mapeia `statusCode < 500`
  para envelope genérico — comportamento preexistente, não alterado).
- Confirmar via `/docs/json` que a documentação OpenAPI de E1/E2/E3 (requestBody binário) não
  foi afetada — coberto por `contracts-docs-hardening.routes.test.ts` CA2 (segue verde).

## Próximo passo

W2 — audit read-only com `code-reviewer` + `security-backend-expert` (CWE-770 + regressão de
auth/ownership nas rotas de documento).
