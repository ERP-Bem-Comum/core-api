# W1 — Implementação · PAR-SUPPLIER-SEARCH-FANTASY

**Skill:** ts-domain-modeler (predicado puro de application) · sessão principal.
**Estado:** **GREEN**.

## Implementado
- `src/modules/partners/application/use-cases/list-suppliers.ts` (`matchesSearch`): o termo agora
  casa (substring case-insensitive) contra `name` **OU** `fantasyName` **OU** `corporateName`, OU o
  `cnpj` (dígitos). Antes: só `name` + `cnpj`. Mudança de um predicado puro; sem SQL, sem schema, sem
  toque no port/adapter.

## Testes
- `list-suppliers-search.test.ts`: CA1 (fantasyName), CA2 (corporateName), CA3 (regressão name+cnpj),
  CA4 (CI/substring) — **4/4**.

## Gates (sessão principal)
- `tsc --noEmit`: 0 erros · `prettier --check .`: OK · `eslint .`: exit 0.
- `pnpm test` (suíte completa): **3304 / 3286 pass / 0 fail / 18 skip** — zero regressão.
