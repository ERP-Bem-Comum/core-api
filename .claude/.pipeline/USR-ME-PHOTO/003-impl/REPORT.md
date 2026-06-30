# W1 — Implementação (GREEN)

**Ticket:** USR-ME-PHOTO · **Wave:** W1 · **Outcome:** GREEN

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `adapters/http/photo-upload.ts` | **novo** — `magicBytesMatch`, `PHOTO_BODY_LIMIT`, `PHOTO_SET_ERROR_STATUS`, `PHOTO_REMOVE_ERROR_STATUS` (fonte única) |
| `adapters/http/users-plugin.ts` | **refactor** — passa a importar do helper (remove `magicBytesMatch`/maps locais; zero duplicação) |
| `adapters/http/me-plugin.ts` | deps `setProfilePhoto`/`removeProfilePhoto`; parser octet-stream; rotas `PUT`/`DELETE /me/photo` (`targetId = req.userId`) |
| `server.ts` | passa as 2 deps de foto ao `meHttpPlugin` |

## Design

- Rotas `/me/photo` **espelham** as admin, mas **sem** `authorize(user:update)` — self por construção
  (`req.userId`). Mesma defesa de magic bytes + allowlist + limites (use case `setProfilePhoto`).
- DRY: helper compartilhado evita 2 cópias de `magicBytesMatch`/error-maps. O refactor do `users-plugin`
  é coberto pelos testes admin de foto existentes (sem regressão).

## Evidência GREEN

```
me-photo.route.test.ts: tests 5 · pass 5 · fail 0
suíte auth completa:    tests 497 · pass 496 · fail 0   (CA6: rotas /users/:id/photo intactas)
```
