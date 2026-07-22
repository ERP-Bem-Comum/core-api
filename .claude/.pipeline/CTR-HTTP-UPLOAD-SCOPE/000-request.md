# CTR-HTTP-UPLOAD-SCOPE — isolar o parser octet-stream das rotas de upload

## Origem

Follow-up do achado **M1** do W2 de `FIN-DOC-INGEST-HTTP` (financial): o mesmo padrão de
defeito existe em `src/modules/contracts/adapters/http/plugin.ts:161`.

## Problema (CWE-770 — Allocation of Resources Without Limits, pré-auth)

`contractsRoutes` registra, no **scope compartilhado** por ~todas as rotas de `/contracts`:

```ts
scope.addContentTypeParser(
  'application/octet-stream',
  { parseAs: 'buffer', bodyLimit: MAX_UPLOAD_BYTES /* 20 MiB */ },
  ...
);
```

O parser é acionado por **Content-Type**, não por rota, e o parsing ocorre **antes** do
`preHandler` (auth). Logo, qualquer requisição a **qualquer** rota de `/contracts` com
`Content-Type: application/octet-stream` aloca até **20 MiB pré-autenticação** — não só as 3
rotas de upload. O comentário em `plugin.ts:160` ("preserva o global de 1 MiB nas demais
rotas") descreve a intenção, mas é **falso** para requisições octet-stream.

## Escopo

Extrair as 3 rotas de upload + o `addContentTypeParser` para um **sub-scope** isolado
(`scope.register(async (uploadScope) => { … })`), espelhando o fix aplicado no financial.
As demais rotas de `/contracts` ficam sem o parser octet-stream (herdam só o `bodyLimit`
global de 1 MiB).

Rotas de upload a mover:
- **E1** `POST /contracts/:id/documents`
- **E2** `POST /contracts/:id/amendments/:amendmentId/documents`
- **E3** `POST /contracts/:id/documents/:documentId/supersede` (nova versão via octet-stream)

## Critérios de aceite

- **CA1 (regressão zero):** as 3 rotas de upload continuam aceitando `application/octet-stream`
  até 20 MiB e respondem como antes (201 no happy-path via `fastify.inject`).
- **CA2 (o fix):** uma requisição `application/octet-stream` com corpo **> 1 MiB** a uma rota
  de `/contracts` que **não** é de upload **não** é bufferizada pelo parser de 20 MiB —
  rejeitada (413/415) **antes** do handler, em vez de parseada e roteada até a auth.
- **CA3:** corpo **> 20 MiB** numa rota de upload → **413**.
- **CA4:** gates W3 verdes no projeto inteiro (typecheck + format + lint + test).

## Fora de escopo

- Reescrever a lógica de upload/magic-bytes/sanitize (já existem e ficam como estão).
- Qualquer mudança nos outros módulos.

## Notas de implementação

- O `FastifyPluginAsyncZodOpenApi` não propaga o type-provider Zod através de `register` —
  anotar o tipo do sub-scope explicitamente (como no financial: `async (uploadScope: typeof scope) => …`).
- Auditar W2 com `security-backend-expert` (código de borda com input hostil).
