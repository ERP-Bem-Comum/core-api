# W0 — Testes RED — AUTH-HTTP-E2E-SMOKE

**Wave:** W0 · **Skill:** tdd-strategist · **Outcome:** RED · **Data:** 2026-05-28

## Escrito

`tests/e2e/auth-smoke.e2e.ts` — `node:test` + **`fetch` global** contra `E2E_BASE_URL` (default `http://127.0.0.1:3100`):
- `before(waitReady)`: poll `GET /health` até 200 (timeout `E2E_READY_TIMEOUT_MS`, default 30000).
- helpers `post(path, body, token?)` / `get(path, token?)` — wrapper fetch (como o BFF/front).
- **CA1:** `/health` 200 + `/me` sem token → 401.
- **CA2-CA7:** fluxo encadeado num `it()` (estado dependente) — register(201) → login(200+tokens) → `/me` Bearer(200, userId==login) → refresh(200, rotacionado) → logout(204) → refresh revogado(401). Email único por run (`e2e-${Date.now()}`).

## RED

```
E2E_READY_TIMEOUT_MS=2000 node --test tests/e2e/auth-smoke.e2e.ts
✖ Error: server em http://127.0.0.1:3100 não respondeu /health em 2000ms (TypeError: fetch failed)
```

Falha por **ausência do server** (não há script `serve`/`test:e2e:auth` nem server no ar). GREEN quando o W1
adicionar `serve` + `test:e2e:auth` (orquestra `docker compose up mysql --wait` + server bg + smoke + teardown).

## Nota
Bug corrigido no W0: `Response.statusCode` → `Response.status` (fetch usa `.status`).
