# W0 — RED · PARTNERS-COLLABORATOR-LIST-FILTERS

**Skill:** tdd-strategist · **Resultado:** RED (esperado)

## Arquivo criado

`tests/modules/partners/application/collaborator-list-filter.test.ts` — predicado puro + use case via InMemory.

## Testes (intenção)

**`collaboratorMatchesFilter` (puro)**
1. Filtro vazio `{}` → true.
2. `search` por nome (substring case-insensitive).
3. `search` por CPF com máscara (só dígitos).
4. `search` por CPF sem máscara.
5. `search` que não bate nome nem CPF → false.
6. `statuses` exclui status fora da lista.
7. `registrationStatuses` filtra PreRegistration/Complete.
8. `occupationAreas` filtra por área.
9. `employmentRelationships` filtra por vínculo.
10. AND entre campos (nome casa mas status não inclui → exclui).
11. Array vazio não restringe.

**`listCollaborators` (use case, InMemory)**
12. Sem argumento retorna todos.
13. Filtra por `occupationAreas`.
14. Filtra por `search` de nome.

## Confirmação RED

```
SyntaxError: ... does not provide an export named 'collaboratorMatchesFilter'
fail 1
```

Falha por inexistência da API (`collaboratorMatchesFilter` + assinatura filtrada de `listCollaborators`).
Esperado.
