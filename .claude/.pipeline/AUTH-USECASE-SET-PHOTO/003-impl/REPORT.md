# W1 — Implementação · AUTH-USECASE-SET-PHOTO

**Agente:** ports-and-adapters · **Outcome:** GREEN

## Mudanças

- `application/ports/profile-photo-storage.ts` (novo) — port `ProfilePhotoStorage` (`upload`/`remove`),
  próprio do auth (ADR-0006; não importa `DocumentStorage` de contracts).
- `adapters/storage/profile-photo-storage.in-memory.ts` (novo) — adapter in-memory idempotente + helpers.
- `application/use-cases/set-profile-photo.ts` (novo) — `setProfilePhoto` + `removeProfilePhoto`.
  - Validação tipo/tamanho na application (MIME allowlist; 0 < bytes ≤ 5 MiB).
  - Key determinística `users/<id>`; upload precede save (não referencia objeto inexistente).
  - Reusa `User.setPhoto` (domínio Foundational) e `ProfilePhotoRef.parse`.

## Verde

```
tests 7 · pass 7 · fail 0
```

CA1–CA7 cobertos (upload, MIME, tamanho, vazio, not-found, falha de storage, remove).
