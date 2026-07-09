# CTR-HTTP-UPLOAD-SCOPE — W0 (testes RED)

> Wave despachada ao agente `fastify-server-expert`; sessão principal fiscalizou (src/ intacto,
> idioma EN, RED pelo motivo certo) e persistiu este REPORT.

## O que foi testado

Criado `tests/modules/contracts/adapters/http/contracts-upload-scope.routes.test.ts`, cobrindo
o vazamento do parser `application/octet-stream` (bodyLimit 20 MiB) registrado no scope
compartilhado de `contractsRoutes` (`plugin.ts:161`) para **todas** as rotas de `/contracts`,
não só as 3 de upload (E1/E2/E3). Segue o mesmo padrão de `makeApp()`
(auth + contracts plugin, seed de contrato via `buildContract`, login real) usado em
`contracts-docs-hardening.routes.test.ts`.

## Critérios de aceite cobertos

- **CA1 (regressão, GREEN):** `POST /contracts/:id/documents` (E1) com PDF octet-stream
  pequeno + auth válida → `201`. Prova que o upload segue funcionando.
- **CA2 (o fix, RED — foco deste ticket):** `DELETE /contracts/:id` — rota de escrita que
  **não** declara `schema.body` (logo, sem fase de `Validation` de corpo) e **não** é uma das
  3 rotas de upload — recebe `Content-Type: application/octet-stream` com corpo de ~2 MiB
  (> bodyLimit global de 1 MiB, < bodyLimit do parser de upload vazado de 20 MiB), **sem**
  token de autenticação. Comportamento **desejado**: rejeição na fase de `Parsing`, **antes**
  do `preHandler` (auth) — `413` (corpo > limite global) ou `415` (media type sem parser fora
  do sub-scope de upload). Este teste assevera o desejado, e por isso **falha hoje**.
- **CA3 (limite, GREEN):** `POST /contracts/:id/documents` (E1) com corpo > 20 MiB
  (`MAX_UPLOAD_BYTES`) → `413`. Esse limite não muda com o fix.

## Evidência RED (literal)

```
▶ CTR-HTTP-UPLOAD-SCOPE — CA1 (regressão): upload octet-stream continua 201
  ✔ POST /contracts/:id/documents com PDF pequeno + auth -> 201 (263.580417ms)
▶ CTR-HTTP-UPLOAD-SCOPE — CA2 (o fix): parser octet-stream NÃO deve vazar p/ rota não-upload
  ✖ DELETE /contracts/:id (sem schema.body) + octet-stream ~2 MiB SEM token -> 413/415, NUNCA 401 (103.878375ms)
▶ CTR-HTTP-UPLOAD-SCOPE — CA3 (limite, já GREEN): corpo > 20 MiB em rota de upload -> 413
  ✔ POST /contracts/:id/documents com corpo > 20 MiB (MAX_UPLOAD_BYTES) -> 413 (126.097042ms)
ℹ tests 3
ℹ pass 2
ℹ fail 1

✖ failing tests:
test at tests/modules/contracts/adapters/http/contracts-upload-scope.routes.test.ts:118:3
  AssertionError [ERR_ASSERTION]: esperado 413 ou 415 (rejeitado ANTES do preHandler);
  recebido 401 — evidencia de que o parser de 20 MiB vazou p/ rota não-upload
  (alocação pré-auth, CWE-770)
```

`res.statusCode` atual = `401` (a requisição alcançou o `preHandler`/`requireAuth` — prova que
os ~2 MiB foram integralmente bufferizados pelo parser de 20 MiB **antes** de qualquer
checagem de identidade). Esperado pós-fix = `413` ou `415`.

`prettier --check` e `eslint` no arquivo novo: ambos limpos.

## Decisões de design do teste

- Rota do CA2 = `DELETE /contracts/:id` (não `POST /contracts`): essa rota não declara
  `schema.body`, então não há fase `Validation` a barrar o `Buffer` antes do `preHandler` —
  isola exatamente o comportamento do `addContentTypeParser`, sem ruído de outra validação Zod.
- Corpo de ~2 MiB: maior que o `bodyLimit` global (1 MiB, `src/shared/http/app.ts:101`),
  menor que `MAX_UPLOAD_BYTES` (20 MiB, `plugin.ts:126`) — discrimina os dois regimes.
- Sem `authorization` no CA2, de propósito: 401 em vez de 413/415 comprova a alocação pré-auth.

## Próximo passo (W1)

Mover `scope.addContentTypeParser('application/octet-stream', ...)` + as 3 rotas de upload
(E1/E2/E3) para um sub-scope isolado via `scope.register(async (uploadScope: typeof scope) =>
{...})`, espelhando o fix já aplicado no financial (`src/modules/financial/adapters/http/plugin.ts`,
ticket `FIN-DOC-INGEST-HTTP` M1). Após o fix, CA2 deve virar GREEN (413/415) sem regressão em
CA1/CA3.
