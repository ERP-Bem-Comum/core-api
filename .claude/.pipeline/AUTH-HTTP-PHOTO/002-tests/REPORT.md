# W0 — Testes RED · AUTH-HTTP-PHOTO

**Agente:** tdd-strategist · **Outcome:** RED

## Suíte

`tests/modules/auth/adapters/http/users-photo.route.test.ts` — 7 casos (CA1–CA7), inject, driver memory.

## RED verificado

```
tests 7 · pass 1 · fail 6
```

6/7 falham (rotas PUT/DELETE photo inexistentes → 404/erro). CA7 passa por coincidência com o 404 de
rota ausente. Cobre: 401, 403, upload válido 200, mime não suportado 422, magic bytes divergente 422,
DELETE 200, id inexistente 404.
