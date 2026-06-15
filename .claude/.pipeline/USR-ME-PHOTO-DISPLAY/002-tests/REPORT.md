# W0 — RED — USR-ME-PHOTO-DISPLAY

**Data:** 2026-06-11 · **Skill:** tdd-strategist · **Resultado:** RED ✅ (11 fail / 3 pass — ver nota)

## Arquivos criados

1. `tests/modules/auth/application/use-cases/get-profile-photo.test.ts` — unit do use case novo
   `getProfilePhoto` (6 casos):
   - CA-A: usuário com foto → ok `{bytes, contentType}`; download chamado com a key do ref.
   - CA-B: usuário sem foto → `user-photo-not-found`; storage **não** consultado.
   - CA-C: id inválido → `user-id-invalid`.
   - CA-D: usuário inexistente → `user-not-found`.
   - CA-E: ref existe mas objeto sumiu → `photo-object-missing` (mapeia 404, não 503).
   - CA-F: storage indisponível → `photo-storage-unavailable` (503).
2. `tests/modules/auth/adapters/storage/profile-photo-storage.in-memory.test.ts` — `download` no
   adapter in-memory (3 casos): round-trip bytes+contentType; key ausente → `photo-object-missing`;
   pós-remove → `photo-object-missing`.
3. `tests/modules/auth/adapters/http/me-photo-display.route.test.ts` — `GET /api/v1/me/photo`
   (4 casos): 200 bytes idênticos + `Content-Type` do upload; `Cache-Control` com `private` e
   `no-store`; 404 sem foto; 401 sem token.
4. `tests/modules/auth/adapters/http/users-photo-display.route.test.ts` — `GET /api/v1/users/:id/photo`
   (6 casos): 200 com `user:read`; 403 sem permissão; 404 sem foto; 404 inexistente; 400 id
   malformado; 401 sem token.

## Arquivo estendido (gated — não roda no `pnpm test`)

5. `tests/modules/auth/adapters/storage/profile-photo-storage.s3.integration.test.ts` — +2 casos
   (CA1b round-trip download bytes/ContentType; CA1c key inexistente → `photo-object-missing`),
   atrás de `STORAGE_INTEGRATION=1` (CA-5 do 000-request). Será provado verde em W3 via
   `pnpm run test:integration:photo`.

## Prova do RED

```
ℹ tests 14 · pass 3 · fail 11
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../use-cases/get-profile-photo.ts'
```

Falhas por **inexistência da API** (módulo `get-profile-photo.ts` não existe; `storage.download`
undefined; rotas GET ausentes → 404/TypeError), não por erro de sintaxe.

**Nota sobre os 3 `pass` em RED:** `GET /me/photo` sem foto → 404 e `GET /users/:id/photo` sem
foto/inexistente → 404 passam por **colisão de status** (rota inexistente também responde 404).
Não são testes fracos: ganham valor discriminante junto com o CA1 da mesma suíte (200 na mesma
rota prova que ela existe). Mantidos.
