# W1 — Implementação GREEN — AUTH-USER-VO-TELEPHONE

**Wave:** W1 · **Outcome:** GREEN · **Data:** 2026-06-07

`src/modules/auth/domain/identity/telephone.ts` — VO `Telephone` (branded + `parse` → `Result`), padrão
de `cpf.ts`. Normaliza para dígitos; aceita 10 (fixo) ou 11 (celular com `9` inicial); DDD ≥ 11.

```
node --test ... telephone.test.ts → tests 9 · pass 9 · fail 0
```

Implementação mínima (YAGNI): apenas `parse`. Erros: `telephone-empty`, `telephone-invalid`.
