# W1 — Implementação GREEN — AUTH-USER-VO-PROFILE-PHOTO-REF

**Wave:** W1 · **Outcome:** GREEN · **Data:** 2026-06-07

`src/modules/auth/domain/identity/profile-photo-ref.ts` — VO `ProfilePhotoRef` (branded + `parse` →
`Result`). Valida chave de objeto S3: não-vazia, ≤ 1024, sem `..`/barra inicial. Não contém binário.

```
node --test ... profile-photo-ref.test.ts → tests 8 · pass 8 · fail 0
```

Erros: `photo-ref-empty`, `photo-ref-too-long`, `photo-ref-invalid`. YAGNI: só `parse`.
