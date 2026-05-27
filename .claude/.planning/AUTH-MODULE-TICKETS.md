# Série de tickets — Módulo `auth` (ADR-0024/0025/0026)

> Backlog ordenado por dependência. Disciplina: **1 ticket atômico end-to-end por vez** (CLAUDE.md). Cada
> ticket abre via `pnpm run pipeline:state init <ID> --size <X>` + `000-request.md` quando chega a vez.
> **Sem CLI para este módulo** (decisão: direto HTTP). Driver `memory` é só para testes/contract-suite.

Aprovado em 2026-05-27. ADRs: [0024](../../handbook/architecture/adr/0024-identity-and-rbac-auth-module.md) ·
[0025](../../handbook/architecture/adr/0025-http-server-fastify-core-api.md) ·
[0026](../../handbook/architecture/adr/0026-mysql-read-write-split-connection.md).

## Fase D — Domínio puro (`ts-domain-modeler`)

| # | Ticket | Size | Entrega | Depende |
| :-- | :-- | :-- | :-- | :-- |
| D1 | `AUTH-VO-EMAIL` | XS | VO `Email` branded + smart constructor + erros | — |
| D2 | `AUTH-VO-PERMISSION` | XS | VO `Permission` branded `resource:action` | — |
| D3 | `AUTH-VO-PASSWORD` | S | `PasswordPolicy` (força, puro) + `PasswordHash` branded (opaco) | — |
| D4 | `AUTH-AGG-ROLE` | S | `Role` (id, name, `readonly Permission[]`) | D2 |
| D5 | `AUTH-AGG-USER` | M | `User` agg (email, passwordHash, roles, status) + transições + `authorize` puro | D1,D3,D4 |
| D6 | `AUTH-AGG-SESSION` | S | `RefreshToken`/`Session` (active/revoked/expired/rotated) + transições | — |

## Fase A — Application (`ports-and-adapters` + `tdd-strategist`)

> **Re-fatiado em 2026-05-27** (decisão DD-PORTS-01): o `AUTH-PORTS` monolítico virou um ticket por
> repo. `Clock` reusa `shared/ports/clock.ts`; sem port `IdGenerator` (padrão `XxxId.generate()`);
> `PasswordHasher`/`TokenIssuer` definidos junto dos adapters X1/X2.

| # | Ticket | Size | Entrega | Depende |
| :-- | :-- | :-- | :-- | :-- |
| A1 | `AUTH-REPO-USER` | S | ports `UserRepository` (write) + `UserReader` (read, ADR-0026) em `domain/identity/user/repository.ts` + contract-suite + adapter InMemory | D5 |
| A2 | `AUTH-REPO-ROLE` | S | port `RoleRepository` em `domain/authorization/` + contract-suite + InMemory | D4 |
| A3 | `AUTH-REPO-SESSION` | S | port `RefreshTokenRepository` em `domain/session/` + contract-suite + InMemory | D6 |
| A4 | `AUTH-USECASE-REGISTER-USER` | S | `registerUser` (valida → cria → persiste → emite `UserRegistered`) | A1,A2,X1 |
| A5 | `AUTH-USECASE-AUTHENTICATE` | M | `authenticate` (verifica credencial → emite access+refresh → `UserAuthenticated`) | A1,A3,X1,X2 |
| A6 | `AUTH-USECASE-REFRESH` | S | `refreshAccessToken` (valida + rotaciona refresh → `AccessTokenRefreshed`) | A3,X2 |
| A7 | `AUTH-USECASE-REVOKE-SESSION` | S | `revokeSession` (logout → `SessionRevoked`) | A3 |
| A8 | `AUTH-USECASE-CHANGE-PASSWORD` | S | `changePassword` (→ `PasswordChanged`) | A1,X1 |
| A9 | `AUTH-USECASE-ASSIGN-ROLE` | S | `assignRole` (→ `RoleAssigned`) | A1,A2 |

> Cada repo entra com contract-suite reutilizável (`*.contract.ts`) + adapter `InMemory` que a satisfaz.

## Fase X — Cripto & Token (adapters; `nodejs-runtime-expert` / `pnpm-workspace-expert`)

| # | Ticket | Size | Entrega | Depende |
| :-- | :-- | :-- | :-- | :-- |
| X1 | `AUTH-ADAPTER-ARGON2-HASHER` | S | `PasswordHasher` argon2id (`timingSafeEqual`); dep nova via `approve-builds` (ADR-0011) | A1 |
| X2 | `AUTH-ADAPTER-JWT-ISSUER` | S | `TokenIssuer` (assina/verifica access JWT curto) | A1 |

## Fase P — Persistência MySQL (`drizzle-schema-author` + `drizzle-orm-expert`)

| # | Ticket | Size | Entrega | Depende |
| :-- | :-- | :-- | :-- | :-- |
| P1 | `AUTH-PERSISTENCE-SCHEMA` | M | schemas Drizzle `auth_*` (6 tabelas) + migration; atualiza `03-data-architecture.md` (prefixo `auth_*`) | D* |
| P2 | `AUTH-PERSISTENCE-REPOS` | M | repos Drizzle (write/reader split-ready, ADR-0026) passando na contract-suite | P1,A1 |

## Fase H — Borda HTTP (ADR-0025; agente `fastify-server-expert` — agora ATIVO)

| # | Ticket | Size | Entrega | Depende |
| :-- | :-- | :-- | :-- | :-- |
| H0 | `CORE-HTTP-FASTIFY-BOOTSTRAP` | M | instala Fastify; bootstrap + composition root + error handler `Result`→HTTP + hardening (helmet/cors/rate-limit) + Pino/request-id. **Transversal** | — |
| H1 | `AUTH-HTTP-ROUTES` | M | `POST /api/v2/auth/login\|refresh\|logout` + register (admin) | H0,A2-A5,X* |
| H2 | `AUTH-HTTP-AUTHZ-HOOK` | S | `preHandler` valida access token + `authorize(permission)` | H1,D5 |

## Fase I — Infra DB transversal (ADR-0026; agente `mysql2-driver-expert`)

| # | Ticket | Size | Entrega | Depende |
| :-- | :-- | :-- | :-- | :-- |
| I1 | `CORE-DB-RW-SPLIT-POOLS` | M | dual pool `writer`/`reader` no driver `mysql2` + injeção no composition root | P2 |

## Ordem de execução recomendada (caminho crítico)

```
D1 → D2 → D3 → D4 → D5 → D6        (domínio fecha primeiro)
  → A1 → A2 → A3 → A4 → A5 (→ A6, A7)
  → X1, X2                          (cripto/token, paralelizáveis)
  → H0 → H1 → H2                    (HTTP de ponta a ponta com InMemory)
  → P1 → P2 → I1                    (MySQL real + read/write split)
```

> Use cases rodam end-to-end com `InMemory` antes de P*; MySQL entra depois sem refactor (ports já isolam).
> H0 e I1 são **transversais** ao core-api (não pertencem ao módulo `auth`), mas a série os puxa porque
> são pré-requisitos da exposição HTTP + persistência escalável.
