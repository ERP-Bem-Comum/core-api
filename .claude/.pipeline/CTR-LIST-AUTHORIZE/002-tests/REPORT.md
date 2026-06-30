# W0 — Testes RED · CTR-LIST-AUTHORIZE (#202)

**Wave**: W0 · **Outcome**: **RED** · **Data**: 2026-06-22

## Objetivo

Provar — antes de tocar `src/` — que `GET /api/v2/contracts` não exige `contract:read` (qualquer autenticado lista), exercitando o `authorize` REAL.

## Arquivo de teste (NOVO)

`tests/modules/contracts/adapters/http/contracts-list-authorize.routes.test.ts` (T002 US1 + T003 US2) — espelha `contracts-export-csv.routes.test.ts` (`buildAuthHttpDeps` + seed RBAC + `buildContractsHttpDeps`).

## Resultado (RED)

```
contracts-list-authorize.routes.test.ts ... tests 3 · pass 2 · fail 1 (RED)
```

### Falha esperada (vira GREEN no W1)

- **US1/CA2 — autenticado SEM `contract:read` → 403**: hoje retorna **200** (rota só tem `requireAuth`). `AssertionError: esperado 403 sem contract:read, veio 200`. É o vazamento do #202.

### Passes estáveis (guards)

- **US1/CA1 — sem token → 401** (`requireAuth` já presente).
- **US2/CA3 — com `contract:read` → 200** (com e sem filtro `?status=Pending`). Caminho feliz preservado.

## Nota de autoria

CA3 inicialmente usava `?status=Draft`, que o `contractListQuerySchema` rejeita (400 validation — enum válido: `Pending|Active|Expired|Terminated|Cancelled`). Corrigido para `Pending` para que o CA3 valide **autorização**, não validação de query. Após o ajuste, o único RED é o CA2 (autorização), como esperado.

## Decisão de design (≠ #200)

Aqui `contract:read` já está no catálogo, então semear o usuário positivo com `['contract:read']` é fiel (a `authorize` real reconhece). O RED vem do **caso negado** (usuário sem a permissão recebendo 200), não de gap de catálogo. O caso negado é o que a cobertura existente da listagem (`contracts-list-filters.routes.test.ts`, só caminho feliz) nunca exercitou — daí o gap ter passado (FR-006/SC-004).

## Comando

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/contracts/adapters/http/contracts-list-authorize.routes.test.ts
```

## Próximo (W1)

`plugin.ts:180`: `preHandler: hooks.requireAuth` → `[hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.read)]`. Esperado: CA2 → GREEN; guards mantidos.
