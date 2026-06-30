# Contract — ports & domínio do `financial`

## Port `ApproverAuthorityReader` (application)

`src/modules/financial/application/ports/approver-authority-reader.ts`

```ts
export type ApproverAuthority = Readonly<{
  userId: string;
  canApprove: boolean;
  limit: Money | null; // reconstruído de limitCents na fronteira (ACL)
}>;

export type ApproverAuthorityReadError = 'approver-authority-unavailable';

export type ApproverAuthorityReader = Readonly<{
  get: (userId: string) => Promise<Result<ApproverAuthority | null, ApproverAuthorityReadError>>;
  list: () => Promise<Result<readonly ApproverAuthority[], ApproverAuthorityReadError>>;
}>;
```

- **Adapter** (`adapters/http/composition.ts` ou módulo de composição do financial): constrói via `buildAuthUserReadPort({ connectionString })` e mapeia `ApproverAuthorityView.limitCents → Money` (`Money.fromCents`). Falha de leitura do auth → `approver-authority-unavailable`.

## Domínio `ApprovalPolicy` (puro)

`src/modules/financial/domain/document/approval-policy.ts`

```ts
export type ApprovalError =
  | 'approver-not-found'
  | 'approver-missing-permission'
  | 'approver-limit-exceeded'
  | 'no-approver-with-sufficient-limit';

// US1 — valida o aprovador indicado contra o líquido
export const checkApprover = (
  netValue: Money,
  authority: ApproverAuthority | null,
): Result<void, ApprovalError>;

// US3 — escolhe o próximo aprovador com alçada suficiente (menor limite ≥ líquido)
export const escalate = (
  netValue: Money,
  candidates: readonly ApproverAuthority[],
): Result<ApproverAuthority, ApprovalError>;
```

### Tabela-verdade `checkApprover`

| `authority` | `canApprove` | `limit` | vs `netValue`       | Resultado                                                        |
| ----------- | ------------ | ------- | ------------------- | ---------------------------------------------------------------- |
| `null`      | —            | —       | —                   | `err('approver-not-found')`                                      |
| obj         | `false`      | —       | —                   | `err('approver-missing-permission')`                             |
| obj         | `true`       | `null`  | —                   | `err('approver-limit-exceeded')` (sem alçada = bloqueia, FR-008) |
| obj         | `true`       | `Money` | `limit < netValue`  | `err('approver-limit-exceeded')`                                 |
| obj         | `true`       | `Money` | `limit >= netValue` | `ok(undefined)`                                                  |

### `escalate`

- Filtra `c.canApprove && c.limit !== null && c.limit >= netValue`; retorna o de **menor** `limit`. Conjunto vazio ⇒ `err('no-approver-with-sufficient-limit')`.
- Pura e determinística (empate de limite: estável por ordem de entrada; o ticket pode refinar critério de desempate).

## Integração nos use-cases

- `save-document.ts` (create) e `save-draft.ts`/submit (Draft→Open): após resolver `approverRef` e ter `netValue !== null`, chamar `deps.approverAuthorityReader.get(approverRef)` → `checkApprover`. Em cascata (US3), `list()` → `escalate`. Erros propagam como `Result` e a borda mapeia para 4xx PT sem vazar interno.
