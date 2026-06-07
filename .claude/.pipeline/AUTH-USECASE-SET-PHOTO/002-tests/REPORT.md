# W0 — Testes RED · AUTH-USECASE-SET-PHOTO

**Agente:** tdd-strategist · **Outcome:** RED

## Suíte

`tests/modules/auth/application/use-cases/set-profile-photo.test.ts` — 7 casos (CA1–CA7).

## RED verificado

```
ERR_MODULE_NOT_FOUND: set-profile-photo.ts (+ port profile-photo-storage.ts)
tests 1 · fail 1
```

Cobre upload válido (CA1), MIME rejeitado (CA2), tamanho (CA3), vazio (CA4), not-found (CA5),
falha de storage (CA6) e remove (CA7), com `ProfilePhotoStorage` fake capturando upload/remove/save.
