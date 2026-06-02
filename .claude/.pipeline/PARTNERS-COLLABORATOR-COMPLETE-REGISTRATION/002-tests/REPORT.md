# W0 — RED · PARTNERS-COLLABORATOR-COMPLETE-REGISTRATION

**Skill:** tdd-strategist · **Resultado:** RED (esperado)

## Arquivo criado

`tests/modules/partners/application/collaborator-public-registration.test.ts`

## Testes (intenção)

**`verifyCpfPrefix` (helper puro)**
1. Prefixo correto (3 dígitos) → ok.
2. Aceita máscara (`'111.'` → só dígitos).
3. Prefixo errado → `cpf-prefix-mismatch`.
4. `'11'`/`'1111'`/`'ab1'`/`''` → `cpf-prefix-invalid`.

**`checkFirstThreeNumbersCpf` (passo 1, query)**
5. Prefixo correto → retorna o `Collaborator`.
6. Prefixo errado → `cpf-prefix-mismatch`.
7. Id inexistente → `check-cpf-not-found`.
8. Id malformado → `check-cpf-invalid-id`.

**`completeCollaboratorRegistrationPublic` (passo 2 seguro)**
9. Prefixo correto → `Complete` + `CollaboratorRegistrationCompleted` persistido.
10. Prefixo errado → `cpf-prefix-mismatch` **e NÃO** persiste (segue PreRegistration).
11. Já `Complete` → `collaborator-already-complete`.
12. Id inexistente → `public-complete-not-found`.

## Confirmação RED

```
ERR_MODULE_NOT_FOUND .../use-cases/verify-cpf-prefix.ts → fail 1
```

Falha por inexistência da API (helper + 2 use cases). Esperado.
