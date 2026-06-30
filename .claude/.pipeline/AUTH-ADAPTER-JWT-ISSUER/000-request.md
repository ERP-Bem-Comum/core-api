# AUTH-ADAPTER-JWT-ISSUER (X2) — port `TokenIssuer` + fake + adapter ES256 (jose)

## Origem

Fase X, ticket X2. Decisão `DD-TOKEN-01`: access JWT ES256 via `jose` (core assina privada / BFF valida
pública). Desbloqueia A5 `authenticate` / A6 `refresh`. Dep `jose@6.2.3` já instalada (zero dep, Web Crypto).
Espelha o padrão do X1 (port + fake + adapter real + contract-suite).

## Arquivos a criar

- `src/modules/auth/application/ports/token-issuer.ts` — port + `TokenIssuerError` + `AccessTokenClaims`.
- `src/modules/auth/adapters/crypto/token-issuer.fake.ts` — `makeFakeTokenIssuer()` (round-trip base64, sem assinatura — testes).
- `src/modules/auth/adapters/crypto/token-issuer.es256.ts` — `makeEs256TokenIssuer({ privateKey, publicKey, issuer, ttlSeconds })` (jose).
- `tests/modules/auth/application/ports/token-issuer.contract.ts` + `tests/modules/auth/adapters/crypto/token-issuer.{fake,es256}.test.ts`.

## Contrato (type)

```ts
type TokenIssuerError = 'token-issue-failed' | 'token-invalid' | 'token-expired';
type AccessTokenClaims = Readonly<{ userId: UserId }>;
type TokenIssuer = Readonly<{
  issueAccessToken:  (input: { userId: UserId }) => Promise<Result<string, TokenIssuerError>>;
  verifyAccessToken: (token: string)             => Promise<Result<AccessTokenClaims, TokenIssuerError>>;
}>;
```

> Claims: `sub`=userId, `iat`, `exp` (TTL injetado), `iss`. Permissions **não** vão no token (authz no core, DD-USER-02).
> Chaves **injetadas** (`CryptoKey`): `generateKeyPair('ES256')` nos testes; PEM via secrets em produção.

## Critérios de aceitação

### Contract-suite (fake E es256)
- **CA1:** `issueAccessToken({ userId })` → `ok(string)` não-vazia.
- **CA2:** `verifyAccessToken(token emitido)` → `ok({ userId })` com o **mesmo** userId (round-trip).
- **CA3:** `verifyAccessToken('garbage')` → `err`.

### Específicos ES256
- **CA4:** token no formato JWT (3 segmentos `header.payload.signature`).
- **CA5 (segurança/sem forja):** token assinado pela chave privada A **não** verifica com a pública de outro par B → `err`.

## Invariantes (DD-TOKEN-01)

- ES256; `alg` fixo (sem aceitar `alg` do header — evita algorithm-confusion). `iss` validado. Senha/segredos nunca no token.
- Impl própria de assinatura **proibida**.

## Fora de escopo

- Refresh token opaco (A5/A6 — não é JWT). JWKS/rotação (futuro). Carregamento de PEM (composition root). Teste de expiração real (relógio do sistema).

## Notas

- **Skill:** `ports-and-adapters` + `nodejs-runtime-expert` (Web Crypto). `try/catch → Result` na borda. Factory sync (fake) ou async (es256, gera chaves). ASCII puro.
- **Pipeline W0→W3.** RED: os 2 `*.test.ts` falham (port + adapters inexistentes).
