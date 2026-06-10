# W2 — Code Review (read-only)

**Ticket:** USR-SEED-PERMISSIONS · **Wave:** W2 · **Round:** 1 · **Veredito:** APPROVED

## Escopo revisado

- `src/modules/auth/adapters/http/dev-seed.ts` (novo)
- `tests/modules/auth/adapters/http/dev-seed.test.ts` (novo)
- `specs/005-gestao-usuarios/quickstart.md` (doc)

## Checklist de aderência

| Regra | Status |
| --- | --- |
| `import type` para tipo (`AuthSeedUser`) — `verbatimModuleSyntax` | ✅ |
| Extensões `.ts` em imports relativos (`NodeNext`) | ✅ |
| Sem cross-module: importa só `auth/domain` (mesmo módulo) — ADR-0006 | ✅ |
| Adapter pode importar domínio (`permission-catalog`) — `adapters.md` | ✅ |
| Imutabilidade: preset `readonly string[]`, helper retorna objeto novo | ✅ |
| Idioma: código EN, comentários PT | ✅ |
| Sem `any`, sem `throw`, sem I/O (preset é puro) | ✅ |
| YAGNI: derivado do catálogo, sem abstração especulativa | ✅ |

## Observações

- **Drift eliminado na raiz:** `adminDevPermissions = PermissionCatalog.all.map(String)`. CA2 trava
  mecanicamente se o catálogo crescer sem o preset acompanhar — o teste é a guarda anti-drift.
- **Admin de dev = catálogo inteiro** (inclui `contract:delete`, `mass-approve`): intencional para
  super-admin de homologação; inerte em produção (guarda `CORE_API_E2E`). Alinhado ao escopo.
- `String(p)` sobre branded `Permission` é seguro e lint-clean (evita `as` sem comentário).

## Evidência

```
typecheck: Done (0 errors)
eslint src/.../dev-seed.ts tests/.../dev-seed.test.ts: exit 0 (sem findings)
```

Sem issues. Aprovado para o gate W3.
