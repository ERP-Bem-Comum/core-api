# W2 — Code Review (read-only) — AUTH-USER-VO-CPF

**Wave:** W2 · **Outcome:** APPROVED · **Round:** 1 · **Data:** 2026-06-07

## Alvo

`src/modules/auth/domain/identity/cpf.ts` (+ suíte `tests/modules/auth/domain/identity/cpf.test.ts`).

## Checklist (regras de domínio — `.claude/rules/domain.md`)

| Item | Veredito |
|------|----------|
| Domínio puro: funções + `Result`, sem `throw`, sem classe | ✅ |
| Branded type (`Cpf = Brand<string,'Cpf'>`) | ✅ |
| Smart constructor `parse` (sem construtor público vazando) | ✅ |
| Erros string-literal union EN kebab-case (`cpf-empty`/`cpf-invalid-length`/`cpf-invalid-checksum`) | ✅ |
| `import type` para tipos; extensões `.ts`; sem `any` | ✅ |
| `noUncheckedIndexedAccess` safe (sem index access — compara string final) | ✅ |
| Módulo isolado (ADR-0006): lógica de CPF própria, sem import cross-módulo | ✅ |
| ASCII puro (Node 24 strip-types) | ✅ |
| YAGNI: apenas `parse`; sem formatação/serialização prematura | ✅ |
| Cast único e auditado na borda (`as Cpf`) | ✅ |

## Observações

- Validação de dígitos verificadores correta; rejeita sequências repetidas (caso clássico que passa na
  fórmula). Cobertura CA1..CA6 adequada (válido com/sem máscara, vazio, length, checksum, repetidos, não-throw).
- Sem issues bloqueantes nem sugestões de refactor relevantes para um VO desta granularidade.

**Resultado:** APPROVED — segue para W3.
