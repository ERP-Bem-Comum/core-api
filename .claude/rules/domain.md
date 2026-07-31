---
paths:
  - "src/modules/*/domain/**/*.ts"
  - "src/shared/kernel/**/*.ts"
  - "tests/modules/*/domain/**/*.ts"
  - "tests/shared/kernel/**/*.ts"
---

# Regras invariantes — Domínio puro

Aplicáveis a `src/modules/*/domain/` **e ao shared kernel** (`src/shared/kernel/` — VOs cross-BC: `Money`, `NonZeroMoney`, `Period`, `PlainDate`, `UserRef`, `Cpf`, `Cnpj`). Domínio é puro: zero infra, zero framework, zero I/O.

- **`throw` proibido.** Operações retornam `Result<T, E>` (ver `src/shared/result.ts`). `throw` só em adapters, e mesmo lá deve ser convertido para `Result` antes de cruzar a borda.
- **Sem `class`, sem `this`.** Operações são funções standalone sobre `Readonly<{...}>` types. Smart constructors em vez de construtores. ESLint trava `ClassDeclaration` e `ClassExpression`.
- **Sem `any`.** Use `unknown` com narrowing. Se `as` for inevitável, comentar o porquê (padrão: `as unknown as T`).
- **Branded types** para IDs e valores validados — `ContractId`, `AmendmentId`, `Money`, `Period`, `BucketName`, `StorageKey`. Definição em `src/shared/brand.ts`. Smart constructor obrigatório (`Money.fromCents(raw): Result<Money, MoneyError>`).
- **Discriminated unions + `switch` exaustivo.** Compilador trava com `noFallthroughCasesInSwitch`; ESLint reforça com `switch-exhaustiveness-check`. Nunca usar `default: throw` — usar `default: { const _: never = x; return _; }` ou omitir default.
- **Erros são string literal unions**, não classes. Ex.: `type ContractError = 'contract-not-active' | 'contract-cannot-expire-yet' | ...`.
- **Imutabilidade absoluta** — `Readonly<>`, `readonly T[]`, `as const`. Mudança de estado via cópia (`{ ...prev, status: 'Expired' }`).

## ⚠️ CNPJ pode conter letras ([ADR-0044](../../handbook/architecture/adr/0044-cnpj-alphanumeric-kernel.md))

Desde 07/2026 a Receita emite **CNPJ alfanumérico**. O valor brandado de `Cnpj` são **14 caracteres uppercase sem máscara**, no formato `^[0-9A-Z]{12}[0-9]{2}$` — 12 alfanuméricos + 2 DVs numéricos. Ex.: `12ABC34501DE35` é válido; `11222333000181` (legado numérico) continua válido.

**Nunca assuma "só dígitos".** O ADR lista as camadas em risco: máscaras, exports, e qualquer `CHECK`/REGEXP de schema. Um `\d{14}` ou `[0-9]{14}` sobre CNPJ é bug — não há enforcement mecânico hoje que o pegue.

O checksum é o mesmo módulo 11, com `valor(c) = ASCII(c) − 48`; o algoritmo é retrocompatível por construção. Não reimplemente — use o VO do kernel.

## Skill canônica

`ts-domain-modeler` é a skill para modelar agregados/VOs/eventos. Ver [`.claude/skills/ts-domain-modeler/SKILL.md`](../skills/ts-domain-modeler/SKILL.md).
