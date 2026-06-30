# W1 — Implementação GREEN · AUTH-ADAPTER-JWT-ISSUER (X2)

- **Wave:** W1 (GREEN) · **Skill:** `ports-and-adapters` · **Data:** 2026-05-27 · **Outcome:** GREEN (8/8 · typecheck + lint + format limpos)

## Arquivos criados
- `src/modules/auth/application/ports/token-issuer.ts` — port `TokenIssuer { issueAccessToken, verifyAccessToken }` + `TokenIssuerError` + `AccessTokenClaims`.
- `src/modules/auth/adapters/crypto/token-issuer.fake.ts` — `makeFakeTokenIssuer()` (round-trip base64url).
- `src/modules/auth/adapters/crypto/token-issuer.es256.ts` — `makeEs256TokenIssuer({ privateKey, publicKey, issuer, ttlSeconds })` (jose).

## Aderência (DD-TOKEN-01)
- ES256; `alg: 'ES256'` fixo na assinatura **e** na verificação (`algorithms: ['ES256']`) — barra algorithm-confusion. `iss` validado. Claims `sub`=userId. Chaves injetadas (`CryptoKey`).
- `try/catch → Result`; `ERR_JWT_EXPIRED → 'token-expired'`, demais → `'token-invalid'`.
- **CA5 (sem forja)** exercitado: token assinado pela chave A **não** verifica com a pública de B.

## Ajustes durante o W1
1. **`CryptoKey` não estava no escopo de tipos** → `import type { webcrypto } from 'node:crypto'` + `webcrypto.CryptoKey`.
2. **`prefer-readonly-parameter-types`** no `config` (CryptoKey é tipo externo não-readonly) → `eslint-disable-next-line` com justificativa (padrão de `document-storage.s3.ts`).

## Testes
```
ℹ tests 8 · pass 8 · fail 0
```
`typecheck`/`lint`/`format`: limpos. ES256 real (jose) exercitado: round-trip, formato JWT, anti-forja.

## Próxima wave
W2.
