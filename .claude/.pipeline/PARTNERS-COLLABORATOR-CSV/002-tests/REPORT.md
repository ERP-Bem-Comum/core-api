# W0 — RED · PARTNERS-COLLABORATOR-CSV

**Skill:** tdd-strategist · **Resultado:** RED (esperado)

## Arquivo criado

`tests/modules/partners/adapters/export/collaborator-csv.test.ts` — espelha `supplier-csv.test.ts`.

## Testes (intenção)

**header e vazio**
1. Lista vazia → BOM + header + CRLF.
2. Output inicia com BOM + header.
3. Cada linha termina em CRLF.

**Active + PreRegistration**
4. `cpf` normalizado (11 dígitos), `registrationStatus=PreRegistration`, `status=Active`,
   pessoais/`disableBy`/`deactivatedAt` vazios.
5. `startOfContract` em ISO 8601.

**Active + Complete**
6. Enums pessoais preenchidos (`genderIdentity`/`race`/`education`/`foodCategory`),
   `experienceInThePublicSector='true'`.

**Inactive**
7. `status=Inactive`, `disableBy` preenchido, `deactivatedAt` em ISO 8601.

**escape herdado do util**
8. Nome com vírgula sai citado (RFC 4180).
9. Nome iniciando em `=` recebe prefixo anti-fórmula.

## Confirmação RED

```
ERR_MODULE_NOT_FOUND .../adapters/export/collaborator-csv.ts → fail 1
```

Falha por inexistência da API (`collaboratorsToCsv`). Esperado.
