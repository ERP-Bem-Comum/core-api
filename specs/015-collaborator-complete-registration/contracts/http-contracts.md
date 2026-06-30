# Contratos HTTP — Feature 015

Borda Fastify + Zod (ADR-0027/0037). Todos os campos novos são **aditivos/nullable** (backward-compatible). Erros internos em EN kebab-case; mensagens ao humano via `cli/formatters/`.

## US1 — Banco/PIX (Financier + Collaborator)

**Shapes** (reusam o VO promovido `domain/shared/payment-target.ts`):

```
bankAccount?: { bank: string, agency: string /^\d{4}(-?\d)?$/, accountNumber: string, checkDigit: string }
pixKey?:      { keyType: 'cpf'|'cnpj'|'email'|'phone'|'random-key', key: string }
```

- `POST/PUT /financiers`, `POST/PUT /collaborators`: aceitam ambos (opcionais). `GET /:id`: retornam ambos (ou `null`).
- Erros: `bank-agency-invalid` (422), enum de `keyType` inválido (422).

## US2 — Campos de perfil (Collaborator)

`PATCH /collaborators/:id/complete-registration` + `GET /:id` ganham (nullable):
`sex ('F'|'M')`, `maritalStatus`, `hasChildren`, `childrenCount`, `childrenAges (number[] na borda; CSV na persistência)`, `isPwd`, `pwdDescription`, `isOnLeave`, `leaveDuration`, `leaveRenewable`, `leaveRenewalDuration`, `publicSectorExperienceDuration`.

- Erros: `sex-invalid` (422), `marital-status-invalid` (422). Omitidos → `null` explícito no detalhe.

## US3 — Território (Collaborator)

`POST/PUT /collaborators` + `GET /:id` ganham `territory?: { uf: string|null, municipality: string|null }`.

- Erro: `territory-uf-invalid` (422). Sem `territory` → `null`. Preservado em deactivate.

## US4 — Export de histórico

`GET /collaborators/export?type=history` → `200 text/csv` (`attachment`), formato legado:
cabeçalho `tipo_alteracao;historico_antes;historico_depois;data_alteracao` (coluna `programa` vazia), separador `;`, datas `dd/MM/aaaa`.

- `503 collaborator-repo-unavailable` se o repositório indisponível.

## US5 — Autocadastro público (sem `requireAuth`)

| Método | Rota                                                | Comportamento                                    |
| ------ | --------------------------------------------------- | ------------------------------------------------ |
| `POST` | `/collaborators` (operador autenticado)             | gera convite uso-único (TTL 7d) + dispara e-mail |
| `GET`  | `/collaborators/autocadastro?token=`                | `200` dados de pré-cadastro (CPF mascarado)      |
| `POST` | `/collaborators/autocadastro` `{ token, ...dados }` | `Complete` + invalida token                      |

- Erros: `404` uniforme `collaborator-autocadastro-token-expired` / `-token-used` (sem vazar dados / sem enumeração); `400 collaborator-autocadastro-cpf-mismatch`.
- **Review `web-security-backend` obrigatório** (token hash, não-enumeração, rate-limit a avaliar).

## US6 — Grids com contagem

`GET /collaborators | /suppliers | /acts | /financiers`:

- Cada item: `contractsCount`, `amendmentsCount` (1 consulta batch por página — sem N+1).
- `/suppliers`: filtro `contractStatus` (`Active|Expired|...|none`).
- Read-model indisponível → `0/0` (lista não quebra).
