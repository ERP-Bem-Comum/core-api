# W0 — Tests RED · AUTH-ROLE-REPO-CRUD

**Agente:** tdd-strategist · **Outcome:** RED ✅

## Suíte (estende a contract suite compartilhada)

`tests/modules/auth/adapters/persistence/role-repository.contract.ts` (+CA5/CA6) + `role-repository.inmemory.test.ts` (caso `isInUse: true`).

| CA | Cobertura | Adapters |
| --- | --- | --- |
| CA5 | `save` persiste `status` (archived sobrevive ao round-trip) | in-memory + drizzle |
| CA6 | `isInUse` = false para role sem atribuição | in-memory + drizzle |
| (in-memory) | `isInUse` = true após `markInUse`; false após `clearUsage` | in-memory |

## Prova de RED

```
✖ CA6 isInUse (método inexistente no port) · ✖ isInUse true/false (markInUse inexistente)
in-memory: tests 7 · pass 5 · fail 2
```

CA5 já passa no in-memory (guarda o objeto inteiro) — o RED real do `status` é no **drizzle** (UPDATE não gravava `status`), validado na integração do W3.
