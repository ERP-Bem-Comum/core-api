# W0 — RED — PRG-LOGO-CONTENT

**Data:** 2026-06-15 · **Skill:** tdd-strategist · **Resultado:** RED (9 fail / 2 pass nao-gated + 1 skip gated — ver nota)

Espelha 1:1 o ticket recem-entregue `USR-ME-PHOTO-DISPLAY` (rota de bytes da foto). A leitura dos
bytes do logo via `GET /api/v1/programs/:id/logo` ainda nao existe — so o upload (`POST /programs/:id/logo`).

## Arquivos criados

1. `tests/modules/programs/application/use-cases/get-program-logo.test.ts` — unit do use case novo
   `getProgramLogo` (6 casos). Deps `{ programRepo, storage }` (o modulo nao tem reader port
   separado — usa `ProgramRepository.findById`). Constroi o agregado de verdade via
   `createProgram` + `uploadProgramLogo` e injeta um `LogoStorage` fake controlavel:
   - CA-A: programa com logo -> ok `{bytes, contentType}`; `download` chamado com `programs/<id>/logo`.
   - CA-B: programa sem logo -> `program-logo-not-found`; storage NAO consultado.
   - CA-C: id invalido -> `program-id-invalid` (espelha `user-id-invalid` do get-profile-photo;
     diferente do `get-program.ts` atual que faz fail-closed em `program-not-found`).
   - CA-D: programa inexistente -> `program-not-found`.
   - CA-E: logoKey existe mas objeto sumiu -> `logo-object-missing` (mapeia 404, nao 503).
   - CA-F: storage indisponivel -> `logo-storage-unavailable` (503).
2. `tests/modules/programs/adapters/storage/logo-storage.in-memory.test.ts` — `download` no
   adapter in-memory (3 casos): round-trip bytes+contentType (o mimeType do upload); key ausente ->
   `logo-object-missing`; pos-remove -> `logo-object-missing`.
3. `tests/modules/programs/adapters/http/programs-logo-display.route.test.ts` — `GET /api/v1/programs/:id/logo`
   (7 casos): 200 bytes identicos + `Content-Type` do upload; `Cache-Control` com `no-store`
   (hook onSend global); 404 sem logo; 403 sem `program:read` (usuario so com `program:write`);
   404 programa inexistente; 400 id malformado; 401 sem token. Harness copiado de
   `programs-logo.routes.test.ts` (buildApp + authHttpPlugin + programsHttpPlugin, driver memory).

## Arquivo criado (gated — nao roda no `pnpm test`)

4. `tests/modules/programs/adapters/storage/logo-storage.s3.integration.test.ts` — round-trip
   S3/MinIO upload -> download (CA1 persiste; CA1b download bytes/ContentType iguais; CA1c key
   inexistente -> `logo-object-missing`; CA2 remove), atras de `STORAGE_INTEGRATION=1` (CA-5 do
   000-request). Gate/skip espelha exatamente `profile-photo-storage.s3.integration.test.ts`.
   Sera provado verde em W3 via integracao (sugestao de script: `pnpm run test:integration:logo`).

## Contrato esperado (a W1 implementa contra isto)

- `LogoStorage.download(key) => Promise<Result<{ bytes: Uint8Array; contentType: string }, 'logo-object-missing' | 'logo-storage-unavailable'>>`
  (port `src/modules/programs/application/ports/logo-storage.ts`; espelha `ProfilePhotoStorage`).
- `getProgramLogo = (deps: { programRepo, storage }) => (cmd: { targetId }) => Promise<Result<{bytes,contentType}, GetProgramLogoError>>`
  com `GetProgramLogoError = 'program-id-invalid' | 'program-not-found' | 'program-logo-not-found' | LogoDownloadError | ProgramRepositoryError`.
- Rota `GET /programs/:id/logo` (`requireAuth` + `authorize(PROGRAM_PERMISSION.read)`); corpo
  binario (`reply.header('content-type').send(Buffer.from(bytes))`), sem `response` schema; mapa
  `LOGO_GET_ERROR_STATUS` (`program-not-found`/`program-logo-not-found`/`logo-object-missing` -> 404;
  `logo-storage-unavailable` -> 503). Wiring em `composition.ts` + `server.ts`.

## Prova do RED

Placar `pnpm test` (Node test runner nativo + `--experimental-strip-types`):

| Metrica | Baseline (antes) | Agora (W0) | Delta |
|---|---|---|---|
| tests | 2621 | 2633 | +12 |
| pass | 2604 | 2606 | +2 |
| fail | 0 | 9 | +9 |
| skipped | 17 | 18 | +1 |
| suites | 789 | 792 | +3 |

Os 9 fail vem EXCLUSIVAMENTE dos 3 arquivos novos nao-gated (confirmado pelo bloco
`failing tests:` da suite completa — nenhum arquivo pre-existente falhou):

```
tests/modules/programs/application/use-cases/get-program-logo.test.ts        (1 fail — arquivo)
tests/modules/programs/adapters/storage/logo-storage.in-memory.test.ts       (3 fail)
tests/modules/programs/adapters/http/programs-logo-display.route.test.ts     (5 fail)
```

Placar por arquivo (rodado isolado):

- `get-program-logo.test.ts` -> `ERR_MODULE_NOT_FOUND: .../use-cases/get-program-logo.ts` (modulo
  nao existe; 6 casos nao chegam a rodar — o runner conta 1 fail de arquivo).
- `logo-storage.in-memory.test.ts` -> 3 fail, `TypeError: storage.download is not a function`.
- `programs-logo-display.route.test.ts` -> 7 tests, 2 pass, 5 fail (CA1 200, CA1b no-store,
  CA3 403, CA5 400, CA6 401 falham porque a rota GET ainda nao existe -> Fastify devolve 404).
- `logo-storage.s3.integration.test.ts` -> 1 skipped (gate `STORAGE_INTEGRATION=1` desligado — OK).

Falhas por INEXISTENCIA da API (use case ausente; `download` undefined no port/adapter; rota
GET ausente -> 404/TypeError), NAO por erro de sintaxe. Regressao zero: os 2604 pass do baseline
seguem verdes (2606 − 2 novos pass = 2604).

## Nota sobre os 2 `pass` em RED (poder discriminante futuro)

`CA2` (programa sem logo -> 404) e `CA4` (programa inexistente -> 404) PASSAM por colisao de status:
a rota inexistente tambem responde 404. Nao sao testes fracos — ganham valor discriminante junto
com o `CA1` da mesma suite (200 + bytes na mesma rota prova que ela passou a existir) e com o
use case (`program-logo-not-found` vs `program-not-found` distintos). Quando a W1 ficar verde, CA1
distingue rota-existe de rota-ausente; CA2/CA4 passam a exercer os ramos `program-logo-not-found`
e `program-not-found` do mapa `LOGO_GET_ERROR_STATUS`. Mantidos.
