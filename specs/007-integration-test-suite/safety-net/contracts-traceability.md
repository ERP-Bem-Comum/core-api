# Rastreabilidade 1:1 — coleção contracts (spec 007 / US1 / T005)

> Captura de cobertura **antes** de reescrever a coleção. 15 requests reais (`*.bru` com verbo HTTP; excluídos `folder.bru`, `collection.bru` e `environments/local.bru`, que são metadados sem asserção) → 15 cenários BDD → 15 casos TDD.
> Fonte read-only: `api-collections/contracts/**/*.bru`. BDD: `bdd/contracts/{auth,contracts}.feature`. TDD: `tdd/contracts/{auth,contracts}.md`.
> O `health-check.bru` de raiz (GET /health) entra na feature/TDD **auth** como bootstrap da coleção.

| bru                                                  | cenário BDD                                        | caso TDD               | asserções (resumo)                                                             |
| ---------------------------------------------------- | -------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `health-check.bru`                                   | auth.feature › CA1 — servidor está no ar           | auth.md › Caso 1       | status 200                                                                     |
| `auth/01-register-bare-user.bru`                     | auth.feature › CA2 — registrar usuário pelado      | auth.md › Caso 2       | status 201 ou 409                                                              |
| `auth/02-login-bare-user.bru`                        | auth.feature › CA2 — login usuário pelado          | auth.md › Caso 3       | status 200; accessToken string (→ bareUserToken)                               |
| `auth/03-login-reader.bru`                           | auth.feature › CA3 — login reader                  | auth.md › Caso 4       | status 200; accessToken string (→ readerToken)                                 |
| `auth/04-login-operator.bru`                         | auth.feature › CA3 — login operador                | auth.md › Caso 5       | status 200; accessToken string (→ operatorToken)                               |
| `contracts/01-create-contract.bru`                   | contracts.feature › US1-1 — criar com contratado   | contracts.md › Caso 1  | status 201; Location string contendo "/api/v2/contracts/"                      |
| `contracts/02-create-sem-contractor-400.bru`         | contracts.feature › US1-2 — sem contractor         | contracts.md › Caso 2  | status 400; error com code e requestId                                         |
| `contracts/03-create-contractor-id-invalido-400.bru` | contracts.feature › US1-2 — contractor.id não-UUID | contracts.md › Caso 3  | status 400; error com code e requestId                                         |
| `contracts/04-get-contract-by-id.bru`                | contracts.feature › US1-3 — get por id             | contracts.md › Caso 4  | status 200; id bate; contractor type/id/snapshot; header Sunset ou Deprecation |
| `contracts/05-patch-metadata.bru`                    | contracts.feature › US2-1 — patch metadados        | contracts.md › Caso 5  | status 200; title e observations atualizados                                   |
| `contracts/06-patch-campo-imutavel-400.bru`          | contracts.feature › US2-2 — campo imutável         | contracts.md › Caso 6  | status 400; error com code e requestId                                         |
| `contracts/07-patch-corpo-vazio-400.bru`             | contracts.feature › US2-3 — corpo vazio            | contracts.md › Caso 7  | status 400; error com code e requestId                                         |
| `contracts/08-delete-recusado-405.bru`               | contracts.feature › US2-4 — delete recusado        | contracts.md › Caso 8  | status 405; error.code "contract-delete-forbidden"; requestId                  |
| `contracts/09-get-sem-auth-401.bru`                  | contracts.feature › US1-7 — get sem auth           | contracts.md › Caso 9  | status 401; error com requestId                                                |
| `contracts/10-patch-reader-403.bru`                  | contracts.feature › US2-6 — patch reader           | contracts.md › Caso 10 | status 403; error com requestId                                                |

**Total: 15 bru / 15 cenários BDD / 15 casos TDD** (1 health-check + 4 auth + 10 contracts).

## Metadados excluídos do critério canônico

- `collection.bru` — metadados da coleção Bruno (sem verbo HTTP, sem `tests {}`).
- `environments/local.bru` — variáveis de ambiente (sem verbo HTTP, sem `tests {}`).

Não são "requests reais" (não têm verbo HTTP nem asserção) e ficam fora do 1:1. Todos os 15 requests acima possuem bloco `tests {}` com asserções explícitas, transcritas literalmente no TDD.
