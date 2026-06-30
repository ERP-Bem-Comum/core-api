# W2 — REVIEW · PARTNERS-FINANCIER-DOMAIN

> Agente: code-reviewer · Round: 1 · Veredito: **APPROVED**

## Checklist

| Critério | Status | Nota |
| :--- | :--- | :--- |
| Idioma (código EN, erro kebab, evento PascalCase passado) | ✅ | `financier-already-inactive`; `FinancierRegistered` |
| `import type` / `.ts` / `#src/*` | ✅ | |
| Domínio puro (sem framework/IO; `occurredAt`/id injetados) | ✅ | `new Date()` ausente; `generate` isolado no VO |
| Estados refinados (não flag boolean) | ✅ | `Active`/`Inactive` com `deactivatedAt` só no inativo |
| `Result<T,E>` + smart constructors | ✅ | |
| Imutabilidade (`immutable`) | ✅ | toda transição congela |
| Reuso do kernel | ✅ | `Cnpj.parse` (VO promovido no bootstrap) |
| Idempotência de transição | ✅ | deactivate/reactivate rejeitam no-op |
| YAGNI | ✅ | só domínio; sem repo/use case/persistência (tickets seguintes) |

## Análise pontual

- **`reactivate`** narrowed para `InactiveFinancier` após o guard `status === 'Active'`; destructuring
  remove `deactivatedAt` (`_` ignorado pelo lint via leadingUnderscore) e reconstrói `Active`. Correto:
  o estado ativo não carrega timestamp de desativação.
- **`register`** valida campos texto por ordem com erro específico por campo, depois CNPJ — falha cedo,
  mensagens acionáveis. CNPJ normalizado entra no agregado e no evento.
- **Evento separado do estado** — retorno `{ financier, event }` deixa o caller (use case futuro)
  decidir persistência/publicação; o domínio não publica.
- Consistência de erros (kebab) com `cpf.ts`/`state.ts`/`refs.ts` do mesmo módulo — não importou o
  estilo tagged-object do `financial`, o que manteria duas convenções no mesmo módulo.

## Issues

Nenhuma. Liberado para W3.
