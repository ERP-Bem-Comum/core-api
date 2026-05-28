# SPEC — Smoke E2E da borda auth (`AUTH-HTTP-E2E-SMOKE`)

> **Tipo:** ticket · **Size:** M · **Épico-pai:** `EPIC-HTTP-CORE-API`
> **Status da spec:** aprovada (2026-05-28, Gabriel)
> **ADRs tocados:** `ADR-0025` (HTTP), `ADR-0024` (auth), `ADR-0013/0020` (MySQL), `ADR-0011` (secrets via files)

## 1. Problema & contexto

A borda auth (5 rotas) foi validada por unitários com `app.inject` + driver `memory`. Falta a prova
**end-to-end produção-like**: servidor real (`src/server.ts`) contra **MySQL real (Docker)**, batido por um
cliente **Node + `fetch`** (como o BFF/front). Bônus: exercita o branch **`mysql`** do composition, hoje sem
cobertura automatizada.

## 2. User stories

- Como **dev/ops**, quero um comando que sobe tudo (MySQL + server) e prova o fluxo de auth via HTTP real, para confiar que a borda funciona de ponta a ponta antes de promover.

## 3. Critérios de aceitação (smoke via `fetch`, MySQL real)

- **CA1** — `GET /health` → **200** (server no ar). `GET /api/v2/auth/me` sem token → **401**.
- **CA2** — `POST /api/v2/auth/register {email,password}` (email único) → **201**.
- **CA3** — `POST /api/v2/auth/login` → **200** `{ accessToken, refreshToken, userId }` (3 não-vazios).
- **CA4** — `GET /api/v2/auth/me` com `Authorization: Bearer <accessToken>` → **200** `{ userId }` (= o do login).
- **CA5** — `POST /api/v2/auth/refresh {refreshToken}` → **200** com `refreshToken` **rotacionado** (≠ o do login).
- **CA6** — `POST /api/v2/auth/logout {refreshToken}` (o rotacionado) → **204**.
- **CA7** — `POST /api/v2/auth/refresh` com o refresh já revogado → **401**.
- **CA8 (persistência real)** — o usuário do CA2 persiste no MySQL: o login (CA3) lê do banco e autentica (prova o branch `mysql` do composition, migrations aplicadas no boot).
- **CA9 (isolamento)** — o smoke **não** é descoberto por `pnpm test` (vive em `tests/e2e/`, fora do glob `tests/**/*.test.ts`? — usa sufixo `.e2e.ts`); só roda via `pnpm run test:e2e:auth`.

## 4. Não-objetivos / fora de escopo

- E2E de contracts/fin; teste de carga/performance; CI (compose.ci) — follow-up.
- Substituir os unitários (`app.inject`) — complementa, não substitui.

## 5. Clarificações (decisões a avalizar)

- **D1 — Cliente:** `node:test` + **`fetch` global** (Node 24) contra `E2E_BASE_URL` (default `http://127.0.0.1:3100`). Sem `app.inject` (é E2E, não unitário). *(Pedido do usuário.)*
- **D2 — Subir o server:** novo script **`serve`** (`node --experimental-strip-types --enable-source-maps --no-warnings src/server.ts`); o orquestrador o sobe em background com `AUTH_DRIVER=mysql`, `AUTH_DATABASE_URL=mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core`, `PORT=3100`.
- **D3 — Orquestração (`test:e2e:auth`):** bash inline espelhando `test:integration:auth` — secrets → `docker compose up -d mysql --wait` → server bg (guarda PID) → `node --test tests/e2e/auth-smoke.e2e.ts` → teardown (`kill` server, `docker compose down -v`, `rm secrets`). `rc=$?` propaga o exit. *(Consistente com os outros `test:integration:*`.)*
- **D4 — Descoberta:** o smoke usa sufixo **`.e2e.ts`** (não `.test.ts`) para **não** ser pego por `pnpm test` (que casa `tests/**/*.test.ts`). Roda só pelo script dedicado.
- **D5 — Boot readiness:** o smoke faz **poll de `/health`** no `before()` (retry com timeout ~30s) — cobre o tempo de migrations + boot do server.

## 6. Plano técnico de alto nível

```
package.json (+2 scripts):
  serve         : node --experimental-strip-types --enable-source-maps --no-warnings src/server.ts
  test:e2e:auth : <secrets> && docker compose up -d mysql --wait
                  && AUTH_DRIVER=mysql AUTH_DATABASE_URL=mysql://root:...@127.0.0.1:3306/core PORT=3100 \
                     node ... src/server.ts & SRV=$!
                  ; E2E_BASE_URL=http://127.0.0.1:3100 node --test ... tests/e2e/auth-smoke.e2e.ts
                  ; rc=$?; kill $SRV 2>/dev/null; docker compose down -v >/dev/null; rm -f secrets/mysql_*.txt; exit $rc

tests/e2e/auth-smoke.e2e.ts:
  before(): poll GET {BASE}/health até 200 (retry/timeout)
  it CA1..CA7: fetch nas rotas; assert status + body
  helper: postJson(path, body, token?) -> fetch wrapper
```

- **Sem dep nova** (fetch é global no Node 24). Migrations auth aplicadas pelo composition (`openAuthMysql applyMigrations:true`).
- Chaves ES256: o server gera par efêmero no boot (sem env) — tokens válidos durante o processo. OK p/ smoke.

## 7. Constitution check

| Fonte | Exigência | Como adere |
| :-- | :-- | :-- |
| `ADR-0025` | borda HTTP; `/api/v2/*` | E2E bate nas rotas reais sob `/api/v2/auth` |
| `ADR-0024` | login/refresh/logout/register + RBAC | fluxo completo + `/me` protegida |
| `ADR-0013/0020` | MySQL único | MySQL real via compose; branch mysql do composition |
| `ADR-0011` | secrets via files | reusa o padrão `secrets/*.txt` do `test:integration:auth` |
| `.claude/rules/testing.md` | discovery `tests/**/*.test.ts` | smoke usa `.e2e.ts` → fora do gate padrão (CA9) |

## 8. Riscos & mitigações

| Risco | Sev. | Mitigação |
| :-- | :-- | :-- |
| Server não pronto antes do smoke (migrations + boot lentos) | média | poll de `/health` no `before` com timeout ~30s (D5) |
| Server bg não morrer no teardown (processo órfão) | média | guardar PID e `kill` no `rc=$?`; `down -v` derruba o MySQL de qualquer forma |
| Docker indisponível no ambiente | média | CA9 isola do `pnpm test`; o comando é manual (documentado) |
| Porta 3100 ocupada | baixa | `PORT`/`E2E_BASE_URL` configuráveis |
| Migrations exigirem privilégio | baixa | conn como `root` (igual aos testes Drizzle auth) |

## 9. Definition of Done

- [ ] CA1–CA9 verdes via `pnpm run test:e2e:auth` (Docker + MySQL real + fetch).
- [ ] `serve` + `test:e2e:auth` no `package.json`; smoke em `tests/e2e/auth-smoke.e2e.ts`.
- [ ] `pnpm test`/`typecheck`/`format`/`lint` verdes (o `.e2e.ts` passa typecheck/lint mas não roda no gate padrão).
- [ ] Teardown limpo (sem container/processo/secret órfão).
