# W0 — Tests RED · AUTH-ROLE-NAME-VO

**Agente:** tdd-strategist · **Outcome:** RED ✅

## Suíte

`tests/modules/auth/domain/authorization/role-name.test.ts` — 11 testes, cobrindo CA1–CA5.

| CA | Teste |
| --- | --- |
| CA1 | nome válido → `ok` com valor normalizado |
| CA2 | trim nas bordas; colapsa espaços internos múltiplos |
| CA3 | vazio / só-espaços → `err('role-name-invalid')` |
| CA4 | limite 64 aceito; 65 → erro; comprimento medido após normalização |
| CA5 | `create` nunca lança (`doesNotThrow`) |

## Prova de RED

```
node --experimental-strip-types --test tests/modules/auth/domain/authorization/role-name.test.ts
→ ERR_MODULE_NOT_FOUND: src/modules/auth/domain/authorization/role-name.ts
✖ fail 1 (suíte não carrega — API inexistente)
```

RED legítimo: falha por **inexistência da API** (`role-name.ts`), não por asserção. Pré-condição W1 satisfeita.
