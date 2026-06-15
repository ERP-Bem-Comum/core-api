# W1 — GREEN — PRG-LOGO-CONTENT

**Data:** 2026-06-15 · **Skill:** ports-and-adapters · **Resultado:** GREEN (`pnpm test`: 2620 pass / 0 fail · `typecheck`: 0 erros)

Espelha 1:1 o ticket recém-entregue `USR-ME-PHOTO-DISPLAY` (rota de bytes da foto). Implementação
mínima para tornar verdes os 4 testes RED da W0 — leitura dos bytes do logo via
`GET /api/v1/programs/:id/logo`, contraparte do upload (`POST /programs/:id/logo`). YAGNI estrito:
nenhum recurso além dos CAs (sem presigned URL, sem thumbnail, sem ETag).

## Arquivos alterados (src)

1. `src/modules/programs/application/ports/logo-storage.ts` — `download(key)` no port + tipos
   `DownloadedLogo` (`{ bytes, contentType }`) e `LogoDownloadError`
   (`'logo-object-missing' | LogoStorageError`). `logo-object-missing` distinto de
   `logo-storage-unavailable`: 404 vs 503 na borda. Espelha `ProfilePhotoStorage`.
2. `src/modules/programs/adapters/storage/logo-storage.in-memory.ts` — `download` lê o Map
   (bytes + `mimeType` do upload, devolvido como `contentType`); key ausente → `logo-object-missing`.
3. `src/modules/programs/adapters/storage/logo-storage.s3.ts` — `download` via `GetObjectCommand`
   (`transformToByteArray`; `ContentType` do objeto gravado no upload, fallback
   `application/octet-stream`); `NoSuchKey`/`NotFound` → `logo-object-missing`; resto →
   `logo-storage-unavailable`. `try/catch` só no adapter (regra de borda).
4. `src/modules/programs/application/use-cases/get-program-logo.ts` — **NOVO** use case. Deps
   `{ programRepo, storage }` (o módulo não tem reader port separado — usa
   `ProgramRepository.findById`). Comando `{ targetId }`. Sequência: validar id
   (`ProgramId.rehydrate` → `program-id-invalid`) → `findById` → null? `program-not-found` →
   `logoKey` null? `program-logo-not-found` → `storage.download(logoKey)`. Read puro, sem evento.
   Espelha `getProfilePhoto`.
5. `src/modules/programs/adapters/http/plugin.ts` — rota `GET /programs/:id/logo`
   (`requireAuth` + `authorize(PROGRAM_PERMISSION.read)`, mesma permissão do `GET /programs/:id`);
   corpo binário via `reply.header('content-type', contentType).send(Buffer.from(bytes))`, **sem**
   `response` schema (convenção de corpo binário, como `GET /me/photo`); `params` validados por
   `programIdParamSchema` (id malformado → 400 na borda); mapa `LOGO_GET_ERROR_STATUS`
   (`program-not-found`/`program-logo-not-found`/`logo-object-missing` → 404;
   `logo-storage-unavailable` → 503; `program-id-invalid` → 400). Erro despachado por `sendResult`
   (envelope padrão; 5xx não vaza o code interno).
6. `src/modules/programs/adapters/http/composition.ts` — `getProgramLogo` em `ProgramsHttpDeps` +
   wiring em `makeDeps` (`programRepo` + storage; read-only, sem clock).

## Testes existentes atualizados

Nenhum. O port foi ampliado de forma **aditiva** e seus únicos consumidores em testes ou usam o
adapter real `makeInMemoryLogoStorage()` (que passou a expor `download`) — caso de
`upload-program-logo.test.ts` — ou já declaravam `download` no fake inline — caso do
`get-program-logo.test.ts` da W0. Diferença vs o ticket da foto (que tocou 10 testes de rota): o
`programsHttpPlugin` recebe as deps do composition root, não deps explícitas no harness — então a
rota nova não exigiu mexer em teste de rota algum, nem em `server.ts`.

## Decisões de design

1. **Sem `server.ts`:** `getProgramLogo` entra em `ProgramsHttpDeps` (montado no `composition.ts`);
   o plugin o lê de `deps.getProgramLogo`. Wiring 100% no composition root.
2. **`logo-object-missing` → 404** (não 503): `logoKey` órfã (objeto sumiu do storage) é tratada
   como "sem logo" — o front cai no placeholder em vez de tela de erro (CA-4). 503 fica só para
   indisponibilidade real do storage.
3. **`program-id-invalid` no use case** (→ 400), espelhando `user-id-invalid` do `getProfilePhoto`
   (CA-C da W0). A borda também barra id malformado em 400 via `programIdParamSchema` (CA5).
4. **`Cache-Control`:** o handler não redefine; o hook `onSend` global já força `no-store` em toda
   rota `/api/*` (CA1b confirma).
5. **Sem `response` schema na rota GET** (corpo binário) — convenção de `GET /me/photo` e
   `GET /contracts/:id/documents/:documentId/content`.
6. **`logoKey` opaca intocada** nos payloads de `GET /programs` / `GET /programs/:id` — aditivo.

## Prova do verde

`pnpm run typecheck` → `tsc --noEmit` sem erros (0).

| Métrica | Baseline (pré-W0) | W0 (RED) | W1 (GREEN) |
|---|---|---|---|
| tests | 2621 | 2633 | 2638 |
| pass | 2604 | 2606 | **2620** |
| fail | 0 | 9 | **0** |
| skipped | 17 | 18 | 18 |
| suites | 789 | 792 | 793 |

```
ℹ tests 2638
ℹ suites 793
ℹ pass 2620
ℹ fail 0
ℹ cancelled 0
ℹ skipped 18
ℹ todo 0
```

Os 9 reds da W0 ficaram verdes; os 2 pass-por-colisão-de-404 (CA2/CA4) agora exercem os ramos reais
`program-logo-not-found`/`program-not-found`. O `logo-storage.s3.integration.test.ts` segue skipped
fora do gate `STORAGE_INTEGRATION=1` (provado verde em W3 via `pnpm run test:integration`).
Regressão zero: nenhum teste pré-existente falhou nem precisou de edição.
