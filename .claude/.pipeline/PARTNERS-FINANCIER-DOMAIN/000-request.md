# PARTNERS-FINANCIER-DOMAIN — Agregado de domínio `Financier`

> **Size:** M · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 2)

## Contexto

Primeiro agregado de contraparte do módulo `partners` (o mais simples — define o padrão de ciclo de
vida active/inactive que `supplier` e `collaborator` reusam). Este ticket entrega **apenas o domínio
puro** (testável sem infra). Use cases + port `FinancierRepository` + adapter Drizzle (tabela
`par_financiers`) + integração vêm em tickets seguintes.

Campos (legado `financiers`, `database-er.md:175-184`): `name`, `corporateName`,
`legalRepresentative`, `cnpj` (único), `telephone`, `address`, `active`.

## Escopo

`src/modules/partners/domain/financier/`:

1. **`financier-id.ts`** — VO `FinancierId` (Padrão D): `generate()` (UUID v4) + `rehydrate()`.
2. **`types.ts`** — estados refinados: `ActiveFinancier` | `InactiveFinancier` (DO D§20). Core comum
   + `status` discriminante; `InactiveFinancier` carrega `deactivatedAt`. `cnpj` é o VO `Cnpj` do kernel.
3. **`events.ts`** — `FinancierRegistered` | `FinancierDeactivated` | `FinancierReactivated`
   (EN passado; `occurredAt` injetado pelo caller, sem `new Date()` no domínio).
4. **`errors.ts`** — `FinancierError` (string union kebab EN, consistente com o resto do módulo `partners`).
5. **`financier.ts`** — smart constructors (id **injetado** no input, padrão do `payable`):
   - `register(input): Result<{ financier: ActiveFinancier; event }, FinancierError>` — valida campos
     não-vazios + `Cnpj.parse`; nasce `Active`.
   - `deactivate(financier, at): Result<{ financier: InactiveFinancier; event }, FinancierError>` —
     idempotência: já inativo → `'financier-already-inactive'`.
   - `reactivate(financier, at): Result<{ financier: ActiveFinancier; event }, FinancierError>` —
     já ativo → `'financier-already-active'`.

## Fora de escopo

- `FinancierRepository` port, use cases, adapter Drizzle, tabela `par_financiers`, CLI, public-api.
- `updateContact` (telephone/address/legalRepresentative) — fica para o ticket de use cases.

## Critérios de aceite

- [ ] `FinancierId.generate()` → UUID v4; `rehydrate` valida.
- [ ] `register` com dados válidos → `ActiveFinancier` (status `Active`) + `FinancierRegistered`
      carregando `cnpj` normalizado; `cnpj` cru mascarado é normalizado.
- [ ] `register` rejeita campo texto vazio (erro específico por campo) e CNPJ inválido (`'invalid-cnpj'`).
- [ ] `deactivate` Active → Inactive + evento + `deactivatedAt`; já Inactive → `'financier-already-inactive'`.
- [ ] `reactivate` Inactive → Active + evento; já Active → `'financier-already-active'`.
- [ ] Agregado imutável (`immutable`/`Readonly`).
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de tocar `src/`.
- Código EN; erros kebab EN; eventos PascalCase passado. `occurredAt`/`at` injetados (sem `new Date()`).
- Reusa o VO `Cnpj` do shared-kernel (entregue no bootstrap).
