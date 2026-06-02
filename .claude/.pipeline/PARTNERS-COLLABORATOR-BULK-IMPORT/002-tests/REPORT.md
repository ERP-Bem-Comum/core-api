# W0 — RED · PARTNERS-COLLABORATOR-BULK-IMPORT

**Skill:** tdd-strategist · **Resultado:** RED (esperado)

## Arquivo criado

`tests/modules/partners/application/import-collaborators.test.ts`

## Testes (intenção)

1. Lista vazia → `importedCount=0`, `failed=[]`, `isPartialImport=false`.
2. 3 válidas distintas → `importedCount=3`, sem falhas; 3 persistidos.
3. CPF inválido no meio → `importedCount=1`, `failed=[{index:1, error:'invalid-cpf'}]`, parcial.
4. Duplicado intra-arquivo (mesmo CPF) → 2ª linha `register-collaborator-cpf-duplicate`.
5. Duplicado intra-arquivo (mesmo email) → 2ª linha `register-collaborator-email-duplicate`.
6. Duplicado contra o banco (CPF pré-salvo) → linha vira `failed` cpf-duplicate.
7. Continua após falha no meio (linhas seguintes válidas entram).

## Confirmação RED

```
ERR_MODULE_NOT_FOUND .../use-cases/import-collaborators.ts → fail 1
```

Falha por inexistência da API (`importCollaborators`). Esperado.
