# W2 — Code Review (read-only) · PARTNERS-SUPPLIER-USECASES

> Skill: `code-reviewer` · Round 1 · Veredicto: **APPROVED**

## Escopo revisado

Port + adapter InMemory + 5 use cases do agregado `Supplier`.

## Checklist por camada

### `domain/supplier/repository.ts` (port) — `.claude/rules/domain.md`
- [x] Port é `type` `Readonly<{...}>` de funções, sem `class`/`interface` com implementação.
- [x] Erros são string literal union kebab EN (`supplier-repo-unavailable`, `supplier-cnpj-duplicate`).
- [x] Assinaturas retornam `Promise<Result<…>>`; sem `throw`.
- [x] Unicidade de CNPJ na superfície do port — coerente com `FinancierRepository` e com o UNIQUE legado.

### `adapters/persistence/repos/supplier-repository.in-memory.ts` — `.claude/rules/adapters.md`
- [x] Implementação concreta do port em `adapters/`; converte tudo para `Result` (nunca vaza `Error`).
- [x] `save` impõe o UNIQUE de CNPJ (id distinto → `supplier-cnpj-duplicate`), espelhando o adapter Drizzle futuro.
- [x] `findByCnpj` por varredura — justificado (cardinalidade modesta, ADR-0031).

### `application/use-cases/*` — `.claude/rules/application.md`
- [x] Todos factory functions curried `(deps) => (cmd) => Promise<Result>`.
- [x] Sequência canônica validar→fetch→domain→persist; nenhuma regra de negócio na application (toda validação delegada a `Supplier.register`/`deactivate`/`reactivate`).
- [x] Não importa de `adapters/` — só tipos de port + módulos de domínio.
- [x] Tempo injetado via `Clock` (sem `new Date()` na application).
- [x] Erros de domínio propagados sem reembrulhar (`return registered`).

### Sintaxe global TS (CLAUDE.md)
- [x] `import type` / `import { type X }` para tipos (`verbatimModuleSyntax`).
- [x] Extensão `.ts` em todos os imports; subpath `#src/*`.
- [x] Sem `any`, sem `class`, sem `throw`.

### Idioma
- [x] Código EN; erros kebab EN; evento `SupplierRegistered` PascalCase passado; doc/comentários PT.

## Observações (não-bloqueantes)
- `register-supplier.ts` foi reformatado pelo hook prettier (quebra do import `payment-target`) — cosmético, sem impacto.
- Cobertura de teste alinhada 1:1 aos critérios de aceite (15 casos, incl. pixKey-como-destino e payment-target-required).

Nenhum issue bloqueante. Segue para W3.
