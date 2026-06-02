# W1 — Implementação (GREEN) · PARTNERS-SUPPLIER-USECASES

> Skill: `ports-and-adapters` · Outcome: **GREEN** (15/15)

## Arquivos criados

| Camada | Arquivo |
| --- | --- |
| Port | `src/modules/partners/domain/supplier/repository.ts` — `SupplierRepository` (`findById`/`findByCnpj`/`list`/`save`) + `SupplierRepositoryError` (`supplier-repo-unavailable`/`supplier-cnpj-duplicate`) |
| Adapter | `src/modules/partners/adapters/persistence/repos/supplier-repository.in-memory.ts` — `makeInMemorySupplierStore`; `save` recusa CNPJ duplicado com id distinto |
| Use case | `application/use-cases/register-supplier.ts` — `Supplier.register` → guard CNPJ duplicado → `save` |
| Use case | `application/use-cases/deactivate-supplier.ts` |
| Use case | `application/use-cases/reactivate-supplier.ts` |
| Query | `application/use-cases/list-suppliers.ts` |
| Query | `application/use-cases/find-supplier-by-cnpj.ts` |

## Decisões

- Espelha 1:1 o padrão de `PARTNERS-FINANCIER-USECASES` (curried `(deps) => (cmd)`, sem outbox — YAGNI).
- `register` delega TODA validação ao domínio (`Supplier.register`): payment-target, email, CNPJ, serviceCategory. O use case só acrescenta o guard de unicidade pré-`save` (`register-supplier-cnpj-duplicate`) — coerente com a sequência canônica validar→fetch→domain→persist.
- Erros de domínio propagados via `return registered` (sem reembrulhar).

## Evidência GREEN

```
ℹ tests 15 · pass 15 · fail 0
```
