# Contract — `auth/public-api/read.ts` (estendido)

Cross-módulo read-only (ADR-0006). O `financial` consome **apenas** isto do `auth`.

## Tipo publicado

```ts
export type ApproverAuthorityView = Readonly<{
  userId: string;
  canApprove: boolean; // possui ≥1 papel ativo com 'payable:approve'
  limitCents: number | null; // MAX(approval_limit_cents) entre papéis aprovadores; null = sem alçada
}>;
```

## Operações (adicionadas ao `AuthUserReadPort`)

| Operação                     | Assinatura                                                                              | Semântica                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getApproverAuthority`       | `(userId: string) => Promise<Result<ApproverAuthorityView \| null, AuthUserReadError>>` | `null` se o usuário não existe. `canApprove=false` se não tem `payable:approve`. `limitCents=null` se tem permissão mas nenhum papel define limite. |
| `listApproversWithAuthority` | `() => Promise<Result<readonly ApproverAuthorityView[], AuthUserReadError>>`            | Todos os usuários ativos com `payable:approve` + autoridade efetiva. Ordenação não garantida (o consumidor ordena).                                 |

- **Erros:** reusa `AuthUserReadError` existente (ex.: `auth-user-read-unavailable`). Sem novos modos de falha de infra.
- **Compat:** aditivo — `getUserName` (#207) permanece. Nenhuma assinatura existente muda.
- **Garantia de isolamento:** implementado em `user-read.drizzle.ts`; `financial` jamais importa isto de `auth/domain` nem lê `auth_*` — só `public-api/read.ts`.
