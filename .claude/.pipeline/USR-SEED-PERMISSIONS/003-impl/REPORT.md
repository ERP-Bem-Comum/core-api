# W1 — Implementação (GREEN)

**Ticket:** USR-SEED-PERMISSIONS · **Wave:** W1 · **Outcome:** GREEN

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `src/modules/auth/adapters/http/dev-seed.ts` | **novo** — `adminDevPermissions` (preset derivado do catálogo) + `buildAdminDevSeedUser()` |
| `specs/005-gestao-usuarios/quickstart.md` | admin de dev passa a conceder `program:*` + `user:*` completo; nota apontando o preset (CA4) |

## Design (YAGNI)

- `adminDevPermissions = PermissionCatalog.all.map(String)` — **fonte única**, derivada do catálogo.
  Drift impossível: permissão nova no catálogo entra no preset automaticamente (CA2 trava se divergir).
- `buildAdminDevSeedUser({ email, password })` devolve `AuthSeedUser` com `permissions = preset`.
- Sem tocar o mecanismo de seed (segue env-driven, guarda dupla `CORE_API_E2E` — fora de escopo).

## Evidência GREEN

```
✔ CA1: inclui as âncoras program:* e o conjunto user:*
✔ CA2: cobre todo o catálogo, sem drift (conjunto === PermissionCatalog.all)
✔ CA2: sem duplicatas no preset
✔ CA3: produz AuthSeedUser aceito por parseE2eAuthSeed sob CORE_API_E2E=1
ℹ tests 4  ℹ pass 4  ℹ fail 0
```

CA4: quickstart inspecionado — JSON do admin agora inclui `program:read/write/deactivate`.
