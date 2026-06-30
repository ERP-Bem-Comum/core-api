# W1 — Implementação (GREEN) — AUTH-HTTP-E2E-SMOKE

**Wave:** W1 · **Agente:** docker-compose-expert · **Outcome:** GREEN · **Data:** 2026-05-28

## Arquivos

| Arquivo | Conteúdo |
| :-- | :-- |
| `tests/e2e/auth-smoke.e2e.ts` (W0) | smoke `node:test` + `fetch` global; `before(waitReady)` poll `/health`; CA1 + CA2-CA7 encadeados. |
| `scripts/e2e-auth.sh` (novo) | orquestrador com `trap cleanup EXIT`: secrets → `docker compose up -d mysql --wait` → server bg (`AUTH_DRIVER=mysql`, `PORT=3100`) → smoke → teardown (kill server, `down -v`, rm secrets). `disown` no server p/ saída limpa. |
| `package.json` (+2) | `serve` (`node … src/server.ts`) + `test:e2e:auth` (`bash scripts/e2e-auth.sh`). |

## Evidência GREEN (run do usuário — Docker real)

```
> bash scripts/e2e-auth.sh
 ✔ Container core-api-mysql   Healthy                10.7s
▶ AUTH-HTTP-E2E-SMOKE — borda auth (server real + MySQL via fetch)
  ✔ CA1: GET /health -> 200 e GET /me sem token -> 401
  ✔ CA2-CA7: register -> login -> me -> refresh -> logout -> refresh revogado (MySQL real)
ℹ tests 2 · ℹ pass 2 · ℹ fail 0
```

- **Valida o branch `mysql` do composition** (migrations aplicadas no boot; register persiste, login lê do MySQL) — gap não coberto pelos unitários (memory).
- A linha `Terminated: 15` no run original era o `trap` matando o server (SIGTERM, esperado); silenciada via `disown` (polimento pós-validação, não altera o teste).

## Gate padrão (sem Docker)
`typecheck` / `lint` / `format:check` limpos; `pnpm test` 1444 pass / 0 fail / 16 skip; `.e2e.ts` **não** descoberto pelo glob `tests/**/*.test.ts` (CA9). Docker limpo após teardown (sem container órfão).
