# W1 — Implementação GREEN — AUTH-USER-VO-CPF

**Wave:** W1 · **Outcome:** GREEN · **Data:** 2026-06-07

## Implementação

`src/modules/auth/domain/identity/cpf.ts` — VO `Cpf` (branded + `parse` → `Result`), seguindo o padrão
de `email.ts`: module-as-namespace, sem `throw`/classe, ASCII puro, módulo isolado (lógica de CPF própria).

- Normaliza para 11 dígitos (remove máscara via `replace(/\D/g, '')`).
- Erros: `cpf-empty` (sem dígitos), `cpf-invalid-length` (≠ 11), `cpf-invalid-checksum` (DV inválido ou sequência repetida).
- Validação de dígitos verificadores (módulo 11) sem index access inseguro (compara string final), compatível com `noUncheckedIndexedAccess`.

## Resultado

```
node --test --experimental-strip-types --no-warnings tests/modules/auth/domain/identity/cpf.test.ts
ℹ tests 9 · pass 9 · fail 0
```

Todos os CA1..CA6 GREEN. Implementação mínima (YAGNI): apenas `parse`; sem formatação/serialização
(responsabilidade de outras camadas).
