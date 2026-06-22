# W0 — Testes RED · FIN-REFERENCE-READ-CATALOG (#200)

**Wave**: W0 (fail-first) · **Outcome**: **RED** · **Data**: 2026-06-22
**Spec/Plan**: `specs/021-reference-read-permission/` (spec.md, plan.md, research.md, tasks.md)

## Objetivo

Provar — antes de tocar `src/` — que `reference:read` falta no catálogo central (`auth/domain/authorization/permission-catalog.ts#CATALOG_RAW`), causando 403 universal nos endpoints de referência da 020 (`GET /api/v2/financial/{categories,cost-centers,programs}`, #200).

## Arquivos de teste (W0)

| Camada | Arquivo | Tasks |
|---|---|---|
| Unidade (catálogo) | `tests/modules/auth/domain/authorization/permission-catalog.test.ts` | T002, T003 |
| Integração HTTP (authorize REAL) | `tests/modules/financial/adapters/http/reference-read-rbac.real-authorize.http.test.ts` (NOVO) | T004, T005 |

## Resultado (RED)

```
permission-catalog.test.ts ............ tests 13 · pass 11 · fail 2
reference-read-rbac.real-authorize ..... tests  3 · pass  2 · fail 1
-------------------------------------------------------------------
TOTAL W0 ............................... tests 16 · pass 13 · fail 3 (RED)
```

### Falhas esperadas (viram GREEN com a linha do W1)

1. **`permission-catalog.test.ts` › `#200: contem reference:read`** — `PermissionCatalog.all` não inclui `reference:read`.
2. **`permission-catalog.test.ts` › CA5 conjunto exato (integridade)** — `deepEqual` falha: `expected` passou a listar `reference:read`, `actual` (catálogo atual) não.
3. **`reference-read-rbac` › US1/CA2** — admin (semeado com `adminDevPermissions` = `PermissionCatalog.all`) recebe **403** em `/categories` (e demais), onde se espera **200**. É o sintoma literal do #200 ("inclusive o administrador").

### Passes estáveis (guards, verdes em W0 e W1)

- `reference-read-rbac` › US1/CA1: **401** sem `Authorization` nos 3 endpoints.
- `reference-read-rbac` › US2/CA3: **403** para usuário sem a permissão nos 3 endpoints (default-deny).
- Demais CA1–CA5 e `isInCatalog` do catálogo (11 passes).

## Decisão de design do teste (anti-armadilha)

O ator privilegiado é semeado com **`adminDevPermissions` (= `PermissionCatalog.all`)**, NÃO com `['reference:read']` cru. Motivo: `applyRbacSeed` (`auth/adapters/http/composition.ts:350-356`) usa `Role.create`, que **não** valida ⊆ catálogo (só `Permission.parse` de formato) — semear a string crua daria 200 mesmo com o catálogo quebrado, mascarando o gap igual ao `authorize` **fake** de header (`categories.http.test.ts:31-38`). Amarrar ao catálogo torna o teste:
- **RED fiel** ao #200 (admin via `.all` → 403 enquanto a permissão não está no catálogo);
- **guard de SC-004** (se `reference:read` sair do catálogo no futuro, `.all` a perde e este teste volta a RED).

Exercita o `authorize` **REAL** (`makeAuthorize` da public-api do auth, ligado ao catálogo + permissões reais da role via `buildAuthHttpDeps`), fechando o buraco de processo do FR-006.

## Comandos

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/auth/domain/authorization/permission-catalog.test.ts
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/adapters/http/reference-read-rbac.real-authorize.http.test.ts
```

## Próximo (W1)

Adicionar `'reference:read'` ao `CATALOG_RAW` (entre `program:*` e `reconciliation:*`). Esperado: as 3 falhas → GREEN; nenhuma regressão nos guards.
