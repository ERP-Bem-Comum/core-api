# W1 — Implementação (GREEN)

**Ticket:** USR-PASSWORD-POLICY · **Wave:** W1 · **Outcome:** GREEN

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `src/modules/auth/domain/credential/password-policy.ts` | `MIN_LENGTH` 8 → **12** (`minLength`/`maxLength` agora exportados p/ a borda); comentário com OWASP 2025/sem-MFA |
| `src/modules/auth/adapters/http/schemas.ts` | `passwordPolicyResponseSchema` (`{ minLength, maxLength }`) |
| `src/modules/auth/adapters/http/plugin.ts` | rota pública `GET /api/v2/auth/password-policy` (sem auth; só os limites, nunca a blocklist) |
| `tests/.../routes.test.ts` · `tests/.../confirm-password-reset.test.ts` | fixture `password123` (11, agora too-short) → `administrator` (13, na blocklist → too-common) |

## Decisões

- Limites como **fonte única** (`Password.minLength`/`maxLength`) — o endpoint não duplica números.
- Endpoint **público** (informação não-sensível, análoga a `minlength` de `<input>`); blocklist **nunca** exposta.
- Sem complexidade, máx 128 — inalterados (já corretos).

## Evidência

```
testes do ticket: tests 13 · pass 13 · fail 0
suíte auth completa: tests 492 · pass 491 · fail 0  (os 2 fixtures ajustados voltaram ao verde)
```

Nenhuma senha curta (8–11) residual em fixtures/seed/e2e (grep limpo).
