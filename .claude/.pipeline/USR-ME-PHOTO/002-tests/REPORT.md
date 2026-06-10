# W0 — Testes RED

**Ticket:** USR-ME-PHOTO · **Wave:** W0 · **Outcome:** RED

## Arquivo
`tests/modules/auth/adapters/http/me-photo.route.test.ts`

## Evidência (`tests 5 · pass 0 · fail 5`)

```
✖ CA1 PUT /me/photo (PNG) -> 200; GET /me reflete imageUrl
✖ CA2 PUT /me/photo sem token -> 401
✖ CA3 mimeType fora da allowlist -> 422
✖ CA4 bytes não casam mimeType -> 422
✖ CA5 DELETE /me/photo -> 200
```

RED legítimo: o `meHttpPlugin` não tem rotas de foto (todas → 404). GREEN no W1 ao espelhar as rotas admin
no autosserviço (`targetId = req.userId`). CA6 (sem regressão em `/users/:id/photo`) validado no W1/W3.
