# PARTNERS-SUPPLIER-USECASES — Port + InMemory + use cases do `Supplier`

> **Size:** M · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 3)

## Contexto

Camada de aplicação do agregado `Supplier` (domínio entregue em `PARTNERS-SUPPLIER-DOMAIN`).
Espelha o padrão de `PARTNERS-FINANCIER-USECASES` (port + InMemory + use cases curried
`(deps) => (cmd)`), acrescido da riqueza do Supplier: invariante "destino de pagamento"
(bankAccount OU pixKey) e `serviceCategory`. Usa **adapter InMemory** (padrão
`application-cli-builder` — valida regra antes de DB real). O adapter Drizzle/tabela
`par_suppliers` vem em ticket próprio (traz integração MySQL).

CNPJ é único no legado (`suppliers.cnpj` UNIQUE) — invariante que entra na superfície do port.

## Escopo

1. **Port** `src/modules/partners/domain/supplier/repository.ts` — `SupplierRepository`:
   `findById`, `findByCnpj`, `list`, `save`. Erros `SupplierRepositoryError`:
   `'supplier-repo-unavailable'` (transient), `'supplier-cnpj-duplicate'`. Sem outbox
   (Supplier não publica cross-módulo nesta fase — YAGNI), igual ao Financier.
2. **Adapter InMemory** `src/modules/partners/adapters/persistence/repos/supplier-repository.in-memory.ts`
   — `Map<SupplierId, Supplier>`; `save` recusa CNPJ duplicado com id diferente
   (`'supplier-cnpj-duplicate'`).
3. **Use cases** `src/modules/partners/application/use-cases/` (curried `(deps) => (cmd)`):
   - `register-supplier.ts` — Deps `{ supplierRepo, clock }`. Gera id, `clock.now()`,
     `Supplier.register`, guard de CNPJ duplicado (`findByCnpj` antes de `save`). Retorna
     `{ supplier, event }`. Erros de domínio propagados (payment-target, service-category, email…).
   - `deactivate-supplier.ts` — rehydrate id → `findById` (not-found) → `Supplier.deactivate(now)` → `save`.
   - `reactivate-supplier.ts` — simétrico (`Supplier.reactivate`).
   - `list-suppliers.ts` (query) — `repo.list()`.
   - `find-supplier-by-cnpj.ts` (query) — parse CNPJ → `repo.findByCnpj`.

## Fora de escopo

- Adapter Drizzle / tabela `par_suppliers` / migração / integração MySQL.
- CLI, public-api (eventos/read model), `updateContact`/`serviceEvaluation`.

## Critérios de aceite

- [ ] `registerSupplier` com dados válidos (bankAccount **ou** pixKey) persiste e retorna
      `{ supplier (Active), event SupplierRegistered }`.
- [ ] Segundo registro com mesmo CNPJ → `'register-supplier-cnpj-duplicate'`.
- [ ] `registerSupplier` propaga erros de domínio: sem payment target → `'supplier-payment-target-required'`;
      CNPJ inválido → `'invalid-cnpj'`; email inválido → `'supplier-email-invalid'`; categoria
      desconhecida → `'invalid-service-category'`.
- [ ] `deactivateSupplier` id inexistente → `'deactivate-supplier-not-found'`; existente → Inactive persistido.
- [ ] `reactivateSupplier` reativa um inativo; já ativo → `'supplier-already-active'`.
- [ ] `listSuppliers` retorna os persistidos; `findSupplierByCnpj` acha por CNPJ e retorna `null` quando ausente.
- [ ] Adapter InMemory recusa CNPJ duplicado (id distinto) com `'supplier-cnpj-duplicate'`.
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de tocar `src/`. Tempo injetado via `Clock` port (fake clock no teste).
- Use case faz `rehydrate`/`parse` das strings cruas na borda; erros kebab EN; curried `(deps) => (cmd)`.
- Reusa VO `Cnpj` do kernel; `Supplier.*` via `import * as Supplier from '../../domain/supplier/supplier.ts'`.
