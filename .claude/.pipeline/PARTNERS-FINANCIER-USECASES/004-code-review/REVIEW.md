# W2 — REVIEW · PARTNERS-FINANCIER-USECASES

> Agente: code-reviewer · Round: 1 · Veredito: **APPROVED**

## Checklist

| Critério | Status | Nota |
| :--- | :--- | :--- |
| Port em `domain/` (Critério H2) | ✅ | invariante CNPJ único na superfície do port |
| Adapter em `adapters/persistence/repos/` | ✅ | InMemory, padrão `user-repository.in-memory` |
| Use case curried `(deps)=>(cmd)` + `Clock` | ✅ | tempo injetado, domínio puro |
| rehydrate de strings cruas na borda | ✅ | `FinancierId.rehydrate`, `Cnpj.parse` |
| `Result<T,E>` propagado (sem throw) | ✅ | early-return em cada falha |
| Erros kebab compostos | ✅ | `*-invalid-id`/`*-not-found`/`register-*-cnpj-duplicate` + domínio/repo |
| Isolamento de módulo (ADR-0006) | ✅ | só importa do próprio módulo + shared; nada cross-módulo |
| YAGNI | ✅ | sem outbox, sem paginação, sem Drizzle |

## Análise pontual

- **Guard de CNPJ duplicado** em duas camadas (use case + adapter) — correto: o use case dá erro
  semântico (`register-financier-cnpj-duplicate`) e o adapter é defesa em profundidade
  (`financier-cnpj-duplicate`), espelhando o UNIQUE que o Drizzle terá.
- **`findFinancierByCnpj`** valida o CNPJ na borda e distingue `null` (não encontrado) de erro de
  parse — semântica limpa de query.
- **`save` recebe só o agregado** (sem eventos) — coerente com a ausência de outbox nesta fase; quando
  Financier publicar, o port ganha a assinatura `save(financier, events)` como o `PayableRepository`.
- Adapter InMemory expõe `clear()` para teardown de teste, padrão dos demais stores.

## Issues

Nenhuma. Liberado para W3.
