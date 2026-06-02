# PARTNERS-FINANCIER-USECASES — Port + InMemory + use cases do `Financier`

> **Size:** M · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 2)

## Contexto

Camada de aplicação do agregado `Financier` (domínio entregue em `PARTNERS-FINANCIER-DOMAIN`). Usa
**adapter InMemory** (padrão `application-cli-builder` — valida regra antes de DB real). O adapter
Drizzle/tabela `par_financiers` vem em ticket próprio (traz integração). Define o padrão de port +
use case que `supplier`/`collaborator` reusam.

## Escopo

1. **Port** `src/modules/partners/domain/financier/repository.ts` — `FinancierRepository`:
   `findById`, `findByCnpj`, `list`, `save`. Erros: `'financier-repo-unavailable'`,
   `'financier-cnpj-duplicate'` (CNPJ único — invariante do legado). Sem outbox (Financier não
   publica cross-módulo nesta fase — YAGNI).
2. **Adapter InMemory** `src/modules/partners/adapters/persistence/repos/financier-repository.in-memory.ts`
   — `Map<FinancierId, Financier>`; `save` recusa CNPJ duplicado com id diferente.
3. **Use cases** `src/modules/partners/application/use-cases/` (curried `(deps) => (cmd)`, padrão `approve-payable`):
   - `register-financier.ts` — Deps `{ financierRepo, clock }`. Gera id, `clock.now()`, `Financier.register`,
     guard de CNPJ duplicado (`findByCnpj`), `save`. Retorna `{ financier, event }`.
   - `deactivate-financier.ts` — rehydrate id → `findById` (not-found) → `Financier.deactivate(now)` → `save`.
   - `reactivate-financier.ts` — simétrico.
   - `list-financiers.ts` (query) — `repo.list()`.
   - `find-financier-by-cnpj.ts` (query) — parse CNPJ → `repo.findByCnpj`.

## Fora de escopo

- Adapter Drizzle / tabela `par_financiers` / integração MySQL.
- CLI, public-api (eventos/read model), `updateContact`.

## Critérios de aceite

- [ ] `registerFinancier` com dados válidos persiste e retorna `{ financier (Active), event }`; segundo
      registro com mesmo CNPJ → `'register-financier-cnpj-duplicate'`; CNPJ inválido → `'invalid-cnpj'`.
- [ ] `deactivateFinancier` id inexistente → `'deactivate-financier-not-found'`; existente → Inactive persistido.
- [ ] `reactivateFinancier` reativa um inativo; id inválido → erro de rehydrate.
- [ ] `listFinanciers` retorna os persistidos; `findFinancierByCnpj` acha por CNPJ e retorna `null` quando ausente.
- [ ] Adapter InMemory recusa CNPJ duplicado (id distinto) com `'financier-cnpj-duplicate'`.
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de tocar `src/`. Tempo injetado via `Clock` port (fake clock no teste).
- Use case faz `rehydrate` das strings cruas na borda; erros kebab EN; curried `(deps) => (cmd)`.
