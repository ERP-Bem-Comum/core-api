# W2 — Code Review (read-only)

**Ticket:** USR-ME-PHOTO · **Wave:** W2 · **Round:** 1 · **Veredito:** APPROVED

## Checklist

| Item | Status |
| --- | --- |
| DRY: `magicBytesMatch`/error-maps/`PHOTO_BODY_LIMIT` extraídos p/ helper; users-plugin consome | ✅ |
| `/me/photo` self por construção (`req.userId`), **sem** `authorize(user:update)` | ✅ |
| Defesa em profundidade mantida (magic bytes → `photo-content-mismatch` 422) | ✅ |
| Parser octet-stream no escopo do plugin (não afeta rotas JSON) | ✅ |
| Reusa use cases `setProfilePhoto`/`removeProfilePhoto` (sem regra nova) | ✅ |
| CA6: rotas admin `/users/:id/photo` intactas após refactor (suíte auth verde) | ✅ |

## Correção durante o W2 (regressão de typecheck endereçada)

Tornar `setProfilePhoto`/`removeProfilePhoto` obrigatórias em `MeHttpDeps` quebrou o typecheck de 2 testes
anteriores (`me-account`, `me-profile-email`) que montavam o `meHttpPlugin` sem elas + 1 anotação de retorno
incorreta no helper `putPhoto`. **Corrigidos** (deps adicionadas; anotação removida) — política de regressão zero.

## Evidência

```
typecheck: 0 errors · eslint (5 arquivos): exit 0
suíte auth: 496 pass / 0 fail
```

Aprovado para W3.
