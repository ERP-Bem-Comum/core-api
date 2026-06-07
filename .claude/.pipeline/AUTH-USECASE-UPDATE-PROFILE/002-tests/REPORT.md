# W0 — Testes RED · AUTH-USECASE-UPDATE-PROFILE

**Agente:** tdd-strategist · **Outcome:** RED

## Suíte

`tests/modules/auth/application/use-cases/update-user-profile.test.ts` — 7 casos (CA1–CA7).

## RED verificado

```
✖ ERR_MODULE_NOT_FOUND: src/modules/auth/application/use-cases/update-user-profile.ts
tests 1 · fail 1
```

Falha por inexistência da API (`update-user-profile.ts`), conforme fail-first. Cobre: alteração
nome/telefone com preservação dos demais (CA1), id inexistente → `user-not-found` (CA2), conflito
de email com outro usuário → `email-already-registered` (CA3), mesmo email próprio = no-op (CA4),
CPF inválido → erro VO + atomicidade (CA5), patch parcial (CA6), evento sem PII (CA7).

Formato de normalização do `Telephone` confirmado contra o VO (`domain/identity/telephone.ts:42`):
armazena dígitos puros, sem prefixo `55`.
