# Code Review — Ticket AUTH-USECASE-AUTHENTICATE-REFRESH (A5b) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo:** `application/ports/refresh-token-minter.ts`, `adapters/crypto/refresh-token-minter.{node,fake}.ts` (novos), `application/use-cases/authenticate-user.ts` (modificado), contract + 3 tests.

---

## Issues
### 🔴 / 🟡
Nenhuma.
### 🔵 Sugestão
1. **`tokenHash` = sha256 simples** — correto para refresh (alta entropia, ≠ senha). Se um dia o refresh virar baixa-entropia, reavaliar; não é o caso (`randomBytes(32)` = 256 bits).
2. **`session-issue-failed`** é defensivo (mint garante hash não-vazio e ttl>0 ⇒ `RefreshToken.issue` não falha). Não testável sem forçar — aceitável (igual aos erros de repo no InMemory).

## Verificação

| Aspecto | Resultado |
| :-- | :-- |
| **DD-LOGIN-02** | ✅ `RefreshTokenMinter` síncrono; node usa `randomBytes(32)` (256 bits) + `sha256` (não argon2). `token` claro / `tokenHash` persistido. |
| **Application** | ✅ sequência estendida: access → mint → `RefreshToken.issue` → `save`. Sem lógica de negócio (issue/verify no domínio). Early-return. `clock.now()` injeta `issuedAt`/`expiresAt`. |
| **Domínio puro** | ✅ `RefreshToken.issue` (D6) decide a invariante; o use case só orquestra. |
| **E. Modular Monolith** | ✅ minter port no módulo; adapter usa `node:crypto` (não cross-módulo). |
| **F/G** | ✅ `.ts`, `import type`; EN; erros kebab EN. |
| **H. Tests** | ✅ minter contract (fake+node) + CA3 (`tokenHash=sha256`); authenticate CA5 prova persistência com `expiresAt=now+ttl`; regressão dos CAs do A5 mantida. |

## Aderência aos CAs
CA1-2 (minter), CA3 (sha256), CA4 (refreshToken no output), CA5 (persistido + expiresAt), CA6 (regressão invalid/disabled) — cobertos (5 minter + 6 authenticate).

## O que está bom
- Login híbrido completo: access curto (ES256) + refresh stateful (opaco, revogável) — materializa a sessão do ADR-0024.
- `tokenHash` persiste (nunca o token claro) — o `findByTokenHash` é o lookup do A6 (refresh), já encaixado.
- Minter como port → use case testável com fake determinístico; o node real exercitado em separado.

## Próximo passo
**APPROVED** → W3.
