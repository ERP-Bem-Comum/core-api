# W2 — Code Review (read-only) · AUTH-PERMISSION-CATALOG

**Agente:** code-reviewer · **Veredito:** APPROVED ✅ (round 1)

## Checklist

| Critério | Status |
| --- | --- |
| Domínio puro — **sem `throw`** (rule domain.md:11) | ✅ refatorado de `throw` → `flatMap` puro |
| Sem `class`/`this`; funções standalone | ✅ |
| Branded types via smart constructor (`Permission.parse`) | ✅ catálogo construído por parse, não cast cru |
| Imutabilidade (`readonly`, `as const`, `ReadonlySet`) | ✅ |
| Sem `any` | ✅ (cast `p as string` só no teste, comentado) |
| Module-as-namespace; imports `.ts` | ✅ |
| ASCII puro | ✅ |
| Fidelidade — permissions refletem uso real do código | ✅ mapeadas via grep em `src/` |
| Integridade testável (sem perda silenciosa por filtro) | ✅ CA5 conjunto completo (18) |

## Observações

- A troca `throw → flatMap` é o ponto sensível: a regra de domínio venceu o "fail-fast em build". O teste de conjunto completo compensa, transformando typo em **gate vermelho** em vez de exceção de runtime — alinhado ao fail-first.
- `isInCatalog` com `ReadonlySet` é O(1) — adequado para validação de `setPermissions` em lote (T008).

Sem issues. Aprovado para W3.
