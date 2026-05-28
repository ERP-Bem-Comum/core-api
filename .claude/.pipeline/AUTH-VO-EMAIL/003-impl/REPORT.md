# W1 — Implementação GREEN · AUTH-VO-EMAIL

- **Wave:** W1 (GREEN)
- **Skill:** `ts-domain-modeler`
- **Data:** 2026-05-27
- **Outcome:** GREEN (8/8 testes passam · typecheck limpo)

## Arquivo criado

`src/modules/auth/domain/identity/email.ts` — primeiro arquivo do módulo `auth`.

```ts
export type Email = Brand<string, 'Email'>;
export type EmailError = 'email-empty' | 'email-invalid-format' | 'email-too-long';
export const parse = (raw: string): Result<Email, EmailError> => { ... };
```

## Aderência à SKILL `ts-domain-modeler`

- **Primitivo-brand** (§3.B.2) — `Email` é identificador opaco (`Brand<string, 'Email'>`), como `ContractId`. Espelha `notifications/domain/email/address.ts`.
- **Module-as-namespace / Padrão D** (§3.B.3) — só free functions; consumo via `import * as Email`.
- **Smart constructor `parse`** (§3.B.4) — "parse, don't validate"; cast `as Email` único e auditado, comentado.
- **Imports relativos** intra-`src/` (`../../../../shared/primitives/`) + `import type` para `Brand` (`verbatimModuleSyntax`).
- **YAGNI estrito** — só `parse`. Sem `equals`/`toString`/etc. (nenhum teste pede).

## Decisões de design aplicadas

- **Normalização** `trim()` + `toLowerCase()` antes de validar (identidade de login case-insensitive).
- **Precedência** trim → `email-empty` → `email-too-long` (>254) → `email-invalid-format`.
- **Limite 254** (RFC 5321 reverse-path), divergente de `notifications/EmailAddress` (320) por ser chave de identidade. Regex de formato **replicada**, não importada cross-módulo (ADR-0006).

## Resultado dos testes

```
ℹ tests 8
ℹ pass 8
ℹ fail 0
```

`pnpm run typecheck`: sem erros.

> **Correção de contagem:** o REPORT W0 citou "9 testes"; a suíte tem **8** `it()` (CA1×2, CA2×2, CA3×2, CA4×1, CA5×1). Sem impacto na cobertura dos 5 CAs.

## Checklist de auto-revisão (domínio puro)

- [x] Zero `throw`, `class`, `this`, `any`.
- [x] Branded type via `Brand`; cast único no smart constructor.
- [x] Return type explícito na função exportada.
- [x] `import type` para tipo puro; `.ts` nos imports.
- [x] Identificadores EN; erros kebab EN.
- [x] ASCII puro.

## Próxima wave

W2 (code review read-only) via `code-reviewer`.
