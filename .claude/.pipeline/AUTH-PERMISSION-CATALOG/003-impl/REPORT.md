# W1 — Implementação mínima · AUTH-PERMISSION-CATALOG

**Agente:** ts-domain-modeler · **Outcome:** GREEN ✅

## Arquivo

`src/modules/auth/domain/authorization/permission-catalog.ts` — catálogo fixo de permissões.

- `CATALOG_RAW` (18 literais auditados, ordenados por resource): `contract:*` (4), `etl:mass-approver`, `role:*` (5, novas), `user:*` (8).
- `build()` parseia cada literal via `Permission.parse` e **filtra inválidos com `flatMap` (sem `throw`)** — conforme `rule domain.md:11` (domínio puro). Integridade garantida pela suíte (CA5 exige conjunto completo).
- `all: readonly Permission[]` — conjunto sem duplicatas (`new Set`).
- `isInCatalog(p)` — pertencimento via `ReadonlySet` (valida `Role.setPermissions ⊆ catálogo`, T008).

## Fidelidade ao código existente

Permissions espelham as literais já usadas em `src/modules/auth` + `contract:*`/`etl:*` de outros módulos; `role:*` são novas desta spec. **Destrava o T048 da 005** (catálogo único `user:*`).

## Decisão de design (regra de domínio)

Versão inicial usava `throw` na carga p/ literal inválido — **rejeitado** por `rule domain.md:11` ("`throw` proibido; `throw` só em adapters"). Refatorado para construção pura (`flatMap` filtrando), com teste de integridade do conjunto completo cobrindo o risco de typo silencioso.

## Prova de GREEN

```
→ tests 10 · pass 10 · fail 0 · lint limpo
```
