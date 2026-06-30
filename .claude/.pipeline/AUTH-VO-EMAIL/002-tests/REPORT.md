# W0 — Testes RED · AUTH-VO-EMAIL

- **Wave:** W0 (RED)
- **Skill:** `tdd-strategist`
- **Data:** 2026-05-27
- **Outcome:** RED (falha por inexistência da API — correto)

## Arquivo de teste

`tests/modules/auth/domain/identity/email.test.ts` (mirror de `src/modules/auth/domain/identity/email.ts`, ainda inexistente).

API exercitada (a implementar no W1): module-as-namespace `import * as Email`, `Email.parse(raw: string): Result<Email, EmailError>`.

## Mapa CA → teste

| CA | `it()` | Asserção |
| :-- | :-- | :-- |
| CA1 | `email valido retorna ok` | `parse('user@example.com')` → `ok`, value preservado |
| CA1 | `normaliza trim + lowercase` | `parse('  USER@Example.COM  ')` → `ok`, value `'user@example.com'` |
| CA2 | `string vazia retorna err email-empty` | `parse('')` → `err('email-empty')` |
| CA2 | `so espacos retorna err email-empty` | `parse('   ')` → `err('email-empty')` |
| CA3 | `string sem @ retorna err email-invalid-format` | `parse('invalid')` → `err('email-invalid-format')` |
| CA3 | `dominio sem ponto retorna err email-invalid-format` | `parse('user@localhost')` → `err('email-invalid-format')` |
| CA4 | `acima de 254 chars retorna err email-too-long` | local(64)+@+domain(200)+`.com` = 269 → `err('email-too-long')` |
| CA5 | `parse nunca lanca` | `parse('@@@')` → `err('email-invalid-format')` (total, sem throw) |

## Saída (RED)

```
ℹ tests 1
ℹ pass 0
ℹ fail 1
code: 'ERR_MODULE_NOT_FOUND',
url: '.../src/modules/auth/domain/identity/email.ts'
```

Falha esperada: o módulo `auth` ainda não existe. Nenhum arquivo em `src/` foi tocado.

## Decisões de design fixadas para o W1

- **`EmailError`** = `'email-empty' | 'email-invalid-format' | 'email-too-long'`.
- **Precedência de validação:** trim → `email-empty` (se vazio) → `email-too-long` (>254 no valor normalizado) → `email-invalid-format`.
- **Normalização:** `trim()` + `toLowerCase()` antes de validar; o valor brandado guarda a forma normalizada.
- **Limite 254** (RFC 5321 reverse-path prático) — divergente do `notifications/EmailAddress` (320) por ser identidade de login. Módulos isolados (ADR-0006); regex de formato replicada, não importada.

## Próxima wave

W1 (GREEN) via `ts-domain-modeler` — implementar `src/modules/auth/domain/identity/email.ts` até os 9 testes passarem (YAGNI estrito).
