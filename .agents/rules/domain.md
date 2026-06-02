---
paths:
  - 'src/modules/*/domain/**/*.ts'
  - 'tests/modules/*/domain/**/*.ts'
---

# Regras invariantes — Domínio puro

Aplicáveis a tudo sob `src/modules/*/domain/`. Domínio é puro: zero infra, zero framework, zero I/O.

- **`throw` proibido.** Operações retornam `Result<T, E>` (ver `src/shared/result.ts`). `throw` só em adapters, e mesmo lá deve ser convertido para `Result` antes de cruzar a borda.
- **Sem `class`, sem `this`.** Operações são funções standalone sobre `Readonly<{...}>` types. Smart constructors em vez de construtores. ESLint trava `ClassDeclaration` e `ClassExpression`.
- **Sem `any`.** Use `unknown` com narrowing. Se `as` for inevitável, comentar o porquê (padrão: `as unknown as T`).
- **Branded types** para IDs e valores validados — `ContractId`, `AmendmentId`, `Money`, `Period`, `BucketName`, `StorageKey`. Definição em `src/shared/brand.ts`. Smart constructor obrigatório (`Money.fromCents(raw): Result<Money, MoneyError>`).
- **Discriminated unions + `switch` exaustivo.** Compilador trava com `noFallthroughCasesInSwitch`; ESLint reforça com `switch-exhaustiveness-check`. Nunca usar `default: throw` — usar `default: { const _: never = x; return _; }` ou omitir default.
- **Erros são string literal unions**, não classes. Ex.: `type ContractError = 'contract-not-active' | 'contract-cannot-expire-yet' | ...`.
- **Imutabilidade absoluta** — `Readonly<>`, `readonly T[]`, `as const`. Mudança de estado via cópia (`{ ...prev, status: 'Expired' }`).

## Skill canônica

`ts-domain-modeler` é a skill para modelar agregados/VOs/eventos. Ver [`.claude/skills/ts-domain-modeler/SKILL.md`](../skills/ts-domain-modeler/SKILL.md).
