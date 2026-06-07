# W0 — Testes RED — AUTH-USER-VO-TELEPHONE

**Wave:** W0 · **Outcome:** RED (esperado) · **Data:** 2026-06-07

`tests/modules/auth/domain/identity/telephone.test.ts` — 9 `it()` cobrindo CA1..CA8.

```
node --test ... telephone.test.ts
✖ code: 'ERR_MODULE_NOT_FOUND' url: '.../src/modules/auth/domain/identity/telephone.ts'
ℹ pass 0 · fail 1
```

RED válido: falha por inexistência da API (não por asserção). Próximo (W1): implementar `telephone.ts`.
