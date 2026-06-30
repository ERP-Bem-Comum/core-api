# W1 — GREEN · PARTNERS-FINANCIER-USECASES

> Agente: ports-and-adapters · Resultado: **GREEN** (9/9)

## Arquivos

| Arquivo | Conteúdo |
| :--- | :--- |
| `domain/financier/repository.ts` | Port `FinancierRepository` (findById/findByCnpj/list/save) + `FinancierRepositoryError` (`financier-repo-unavailable`, `financier-cnpj-duplicate`). Sem outbox (YAGNI). |
| `adapters/persistence/repos/financier-repository.in-memory.ts` | `makeInMemoryFinancierStore` — `Map`; `save` recusa CNPJ duplicado (id distinto). |
| `application/use-cases/register-financier.ts` | register + guard CNPJ duplicado (`findByCnpj`) + clock. |
| `application/use-cases/deactivate-financier.ts` | rehydrate → findById (not-found) → deactivate → save. |
| `application/use-cases/reactivate-financier.ts` | simétrico. |
| `application/use-cases/list-financiers.ts` | query. |
| `application/use-cases/find-financier-by-cnpj.ts` | query; parse CNPJ na borda; `null` = não encontrado. |

## Decisões de design

- **Port sem outbox** — Financier não publica cross-módulo nesta fase; `save` só persiste o agregado.
- **Guard de CNPJ em duas camadas**: use case (`findByCnpj` antes do save) + adapter (`save` recusa
  duplicado) — defesa em profundidade, espelha o UNIQUE de `par_financiers.cnpj` futuro.
- **Curried `(deps) => (cmd)`** e tempo via `Clock` (fake clock com `PlainDate.fromDate` no teste) —
  padrão `approvePayable`/regras de application.
- **Erros de borda específicos** por use case (`*-invalid-id`, `*-not-found`, `register-*-cnpj-duplicate`)
  compostos com `FinancierError`/`FinancierRepositoryError`.

## Execução

```
ℹ tests 9 · pass 9 · fail 0
```
