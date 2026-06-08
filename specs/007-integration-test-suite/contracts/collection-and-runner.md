# Contratos — coleção unificada + runner

> A "interface externa" desta feature são duas coisas: a **estrutura da coleção** unificada
> (contrato com quem escreve/lê testes) e a **interface do runner** (contrato com CI/dev).

## Contrato 1 — estrutura da coleção `api-collections/core-api/`

```text
api-collections/core-api/
├── bruno.json                  # { name: "core-api", version: "1" }
├── environments/
│   └── local.bru               # ÚNICO env: baseUrl, e-mails de seed, etc.
├── 0-auth/                     # roda PRIMEIRO (prefixo 0)
│   ├── 00-health.bru
│   ├── 01-login-admin.bru      # setVar adminToken (var de coleção, reusada por todos)
│   └── 02-login-bare.bru       # setVar bareToken
├── auth/                       # requests de auth (reescritos a partir da rede)
├── contracts/                  # requests de contracts
└── partners/                   # requests de partners
```

**Regras do contrato**:

- Exatamente **um** bloco de login (`0-auth/`); nenhum módulo repete o request de login.
- Exatamente **um** environment.
- Todo request protegido usa `headers { Authorization: Bearer {{adminToken}} }` (ou `{{bareToken}}` para casos 403).
- Cada request da coleção mapeia a uma `TraceabilityRow` (cobertura 1:1).

## Contrato 2 — interface do runner `pnpm run test:integration:all`

| Aspecto         | Contrato                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Entrada         | nenhum argumento; lê `compose.yaml` + env de boot                                                  |
| Pré-condição    | Docker disponível; senão **falha cedo** com mensagem clara (FR-010), exit ≠ 0                      |
| Efeito          | sobe MySQL+MinIO, boota server (todos os módulos + seeds), roda `bru run -r`, derruba tudo         |
| Saída (sucesso) | resumo único + **exit 0**                                                                          |
| Saída (falha)   | resumo + casos vermelhos + **exit ≠ 0**                                                            |
| Pós-condição    | **sempre** teardown (trap EXIT): `docker compose down -v`, secrets removidos — sem órfãos (FR-009) |
| Idempotência    | rodar 2× seguidas dá o mesmo resultado (seeds idempotentes)                                        |

## Contrato 3 — contract suite `roleRepositoryContract`

```ts
// tests/modules/auth/adapters/persistence/role-repository.suite.ts
export const roleRepositoryContract = (
  makeRepo: () => RoleRepository | Promise<RoleRepository>,
  label: string,
): void => {
  // describe(`RoleRepository contract — ${label}`, () => { it('save → findById', ...) ... })
};
```

- Consumido por `role-repository.inmemory.test.ts` (sem guard) e `role-repository.drizzle.test.ts` (guard `MYSQL_INTEGRATION=1`).
- Casos mínimos: `save` novo; `save` update (status); `findById` hit/miss; `list` vazio/povoado; `isInUse` true/false (junção `auth_user_role`).
