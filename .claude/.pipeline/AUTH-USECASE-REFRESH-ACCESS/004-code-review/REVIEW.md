# Code Review — Ticket AUTH-USECASE-REFRESH-ACCESS

## Round 2 — APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo:** `src/modules/auth/application/use-cases/refresh-access-token.ts` + `tests/.../refresh-access-token.test.ts`

### Issue 1 (round 1) — resolvida ✅

`issueAccessToken` movido para **antes** da mutação de persistência (`refresh-access-token.ts:91-93`).
Agora a falha do `tokenIssuer` retorna sem rotacionar o refresh apresentado. Comentário explica o porquê
(interação com reuse detection). Regressão fixada: **CA1 (regressao)** — com `tokenIssuer` que falha, o
refresh apresentado permanece `active` (`replacedBy === null && revokedAt === null`). 8/8 verdes.

### Veredito: **APPROVED** → avança para W3.

---

## Round 1 — REJECTED (histórico)

**Issue 1 🔴** — ordem de operações persistia a rotação antes de emitir o access; sob falha do `tokenIssuer`,
o refresh apresentado era consumido e, no retry do cliente, a reuse detection (DD-SESSION-05) revogava a
cadeia inteira — logout total para credencial válida. Fix: emitir o access primeiro (padrão `authenticate-user`).

## O que está bom (mantido do round 1)

- Switch exaustivo sobre `RefreshTokenError`; `hash-empty`/`expiry-before-issue` → `session-issue-failed` (fail-closed).
- Reuse detection (`revokeChain`) e defense-in-depth (DD-SESSION-04) corretas.
- Factory function, `Deps` `Readonly<>`, zero `throw`/`class`/`any`, `import type`, `.ts` nos imports, idioma EN.
