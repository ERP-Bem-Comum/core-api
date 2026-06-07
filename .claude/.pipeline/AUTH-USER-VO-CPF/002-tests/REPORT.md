# W0 — Testes RED — AUTH-USER-VO-CPF

**Wave:** W0 · **Outcome:** RED (esperado) · **Data:** 2026-06-07

## Suíte criada

`tests/modules/auth/domain/identity/cpf.test.ts` — 9 `it()` cobrindo CA1..CA6 do `000-request.md`.

## Resultado da execução

```
node --test --experimental-strip-types --no-warnings tests/modules/auth/domain/identity/cpf.test.ts

✖ tests/modules/auth/domain/identity/cpf.test.ts
  code: 'ERR_MODULE_NOT_FOUND'
  url: '.../src/modules/auth/domain/identity/cpf.ts'
ℹ pass 0 · fail 1
```

**RED válido**: a suíte falha por **inexistência da API** (`src/modules/auth/domain/identity/cpf.ts`
ainda não existe) — não por asserção incorreta. É o fail-first esperado (Princípio I).

## Mapa CA → teste

| CA | Teste |
|----|-------|
| CA1 | "CPF valido sem mascara…" + "…com mascara normaliza" |
| CA2 | "string vazia…" + "so espacos…" |
| CA3 | "menos de 11 digitos…" + "mais de 11 digitos…" |
| CA4 | "digitos verificadores invalidos…" |
| CA5 | "sequencia de digitos repetidos…" |
| CA6 | "parse nunca lanca…" |

## Próximo (W1)

Implementar `src/modules/auth/domain/identity/cpf.ts` (branded + `parse` → `Result`, validação de
dígitos verificadores) até a suíte ficar GREEN.
