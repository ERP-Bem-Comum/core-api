# W1 — Implementação (GREEN) — AUTH-HTTP-ROUTES (H1a: register + login)

**Wave:** W1 · **Agente:** fastify-server-expert (+ composition) · **Outcome:** GREEN · **Data:** 2026-05-28

## Arquivos

| Arquivo | Conteúdo |
| :-- | :-- |
| `auth/adapters/http/composition.ts` (novo) | `buildAuthHttpDeps({driver})` — memory (stores in-memory + chaves ES256 efêmeras via `generateKeyPair`) e mysql (`openAuthMysql` + `createDrizzle{User,RefreshToken}Store` + chaves de env PKCS8/SPKI). Instancia os **4** use cases; expõe `AuthHttpDeps` + `shutdown`. |
| `auth/adapters/http/schemas.ts` (novo) | Zod: `register`/`login` body + response (contract-first, ADR-0027). |
| `auth/adapters/http/plugin.ts` (reescrito) | `authHttpPlugin(deps)` **factory**; sub-escopo `/auth`; rotas `POST /register` (201) e `POST /login` (200); remove `__ping`. |
| `auth/public-api/http.ts` | re-exporta factory + `buildAuthHttpDeps` + tipos (ponto público, ADR-0006). |
| `src/server.ts` | compõe `buildAuthHttpDeps({driver: AUTH_DRIVER, connectionString: AUTH_DATABASE_URL})` → `authHttpPlugin(deps)`; `shutdown` fecha pool. |
| `tests/.../http/plugin.test.ts` | **removido** (sentinela `__ping`). |

## Mapeamento erro→HTTP (sendResult)

- **register:** `email-already-registered`→409; `email-*`/`password-too-{short,long}`→422; resto→500.
- **login:** `invalid-credentials`→401; `user-disabled`→403; resto→500. Email inexistente e senha errada devolvem o **mesmo** 401 (enumeração-safe, CA6).
- register 201 mapeia o output para `{userId, email}` (não vaza o agregado).

## Decisão de design

- `AuthHttpDeps` = **use cases instanciados** (não ports) — o plugin só invoca; ADR-0006 preservado (server.ts não importa adapters direto).
- Composition monta os **4** use cases já no H1a → H1b (refresh+logout) só registra 2 rotas.
- Chaves ES256: env (prod) ou efêmeras (dev/test) — DD-TOKEN-01.

## Evidência GREEN
```
node --test routes.test.ts → 9 pass / 0 fail (CA1-CA6, CA11, CA12)
typecheck / lint / format → limpos
pnpm test → 1416 pass / 0 fail / 16 skip (zero regressão)
```

## Ajuste durante W1
- `exactOptionalPropertyTypes`: `server.ts` constrói o config sem `connectionString: undefined` explícito.
- `loadOrGenerateKeys` anotado com `Pick<Es256Config,'privateKey'|'publicKey'>` (return type explícito).
