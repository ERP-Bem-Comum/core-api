# AUTH-AGG-SESSION — Agregado `RefreshToken` (sessão híbrida)

## Origem

Série [ADR-0024](../../../handbook/architecture/adr/0024-identity-and-rbac-auth-module.md) (sessão híbrida:
JWT curto + **refresh token stateful**), ticket D6 (último da Fase D). **Decisões:**
[`handbook/domain/auth/design-decisions.md`](../../../handbook/domain/auth/design-decisions.md) `DD-SESSION-01..03`.
Mapeia `auth_refresh_token` (id, user_id, token_hash, issued_at, expires_at, revoked_at, replaced_by).

## Arquivos a criar

- `session/refresh-token-id.ts` — `RefreshTokenId` branded + `generate`/`rehydrate` (espelha `role-id.ts`).
- `session/refresh-token.ts` — tipo `RefreshToken` + `RefreshTokenError` + `issue`/`state`/`verify`/`revoke`/`rotate`.

## Modelo

```
RefreshToken = Readonly<{ id; userId: UserId; tokenHash: string; issuedAt: Date;
                          expiresAt: Date; revokedAt: Date | null; replacedBy: RefreshTokenId | null }>
RefreshTokenState = 'active' | 'expired' | 'revoked' | 'rotated'
```

`state` é **computado** com `now` (DD-SESSION-01), não tipo refinado. Precedência (DD-SESSION-03):
`revoked` > `rotated` > `expired` > `active`.

## Critérios de aceitação

### `RefreshTokenId`
- **CA1-3:** `generate()`→aceito por `rehydrate`; uuid v4 → ok; inválido → `err('refresh-token-id-invalid')`.

### `issue`
- **CA4 (válido):** `issue({ id, userId, tokenHash, issuedAt, expiresAt })` → `ok(RefreshToken)` com `revokedAt=null`, `replacedBy=null`.
- **CA5 (hash vazio):** `tokenHash` vazio/espaços → `err('refresh-token-hash-empty')`.
- **CA6 (expiry inválida):** `expiresAt <= issuedAt` → `err('refresh-token-expiry-before-issue')`.

### `state(token, now)`
- **CA7 (active):** recém-emitido, `now < expiresAt`, sem revoke/replace → `'active'`.
- **CA8 (expired):** `now >= expiresAt` → `'expired'`.
- **CA9 (revoked):** `revokedAt != null` → `'revoked'` (mesmo se também expirado — precedência).
- **CA10 (rotated):** `replacedBy != null` (e não revogado) → `'rotated'`.

### `revoke` / `rotate`
- **CA11 (revoke):** `revoke(token, at)` → `state` = `'revoked'`; `verify` → `err('refresh-token-revoked')`.
- **CA12 (rotate):** `rotate(token, replacementId, at)` → `replacedBy = replacementId`; `state` = `'rotated'`; `verify` → `err('refresh-token-rotated')`.

### `verify(token, now)`
- **CA13 (active):** token usável → `ok` (void).
- **CA14 (expired):** → `err('refresh-token-expired')`.

## Invariantes (DD-SESSION-03 / herda DD-USER-04)

- `tokenHash` string **opaca**, não-vazia; **nunca** em claro, em log ou serializada.
- `rotate` (sucessão) ≠ `revoke` (logout) — estados distintos.

## Fora de escopo (DD-SESSION-02)

- Eventos (`SessionRevoked`/`AccessTokenRefreshed`) → use cases de sessão (A3/A4/A5).
- Geração/validação do JWT de access → port `TokenIssuer` (X2). Persistência → P1/P2.
- `RefreshTokenHash` como VO próprio (YAGNI — string opaca basta agora).

## Notas

- **Skill:** `ts-domain-modeler`. `now`/`at: Date` injetados (Clock no use case). Imutável (`immutable` + spread). ASCII puro.
- **Pipeline W0→W3.** RED em `tests/modules/auth/domain/session/{refresh-token-id,refresh-token}.test.ts`.
