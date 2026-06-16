# Phase 1 — Data Model: `004-http-facade-controllers`

> Refactor de borda HTTP **sem domínio novo**. Não há agregado, VO, evento nem tabela. As únicas "entidades" deste
> épico são **artefatos de organização de código** (DTOs de adapter), não conceitos de domínio. Princ. V intacto.

## "Entidades" (organização de código — não-domínio)

### Objeto-fachada (controller)

- **O que é**: agrupamento nomeado dos handlers de UM plugin. Ex.:
  `type AuthController = Readonly<{ register, login, refresh, logout, me, changePassword, forgotPassword, resetPassword, passwordPolicy, revokeAllSessions }>`.
- **Campos**: cada membro é um handler `(req, reply) => Promise<...>` — a mesma assinatura de hoje, apenas **nomeada**.
- **Estado/identidade**: **nenhum**. Sem `id`, sem ciclo de vida, sem persistência. Value de organização, descartável.
- **Relacionamentos**: 1:1 com o plugin (`makeAuthController` ↔ `authRoutes`). Vive **dentro** da closure `async (scope) => {}` (R2).
- **Validação**: N/A — não valida nada; os schemas Zod das rotas seguem idênticos.

### Factory da fachada

- **O que é**: `makeXController(deps, hooks) => XController` — função **pura** que devolve o objeto-fachada fechando sobre `deps`/`hooks` injetados.
- **Invariantes**: (1) pura na construção; (2) **sem `class`/`this`/decorators**; (3) construída dentro da closure de rotas (R2).

## Mapa por módulo (factory → nº de membros → origem)

| Módulo    | Factory                          | Membros | Arquivo de origem             |
| --------- | -------------------------------- | ------- | ----------------------------- |
| auth      | `makeAuthController`             | 10      | `plugin.ts`                   |
| auth      | `makeUsersController`            | 9       | `users-plugin.ts`             |
| auth      | `makeRolesController`            | 8       | `roles-plugin.ts`             |
| auth      | `makeMeController`               | 6       | `me-plugin.ts`                |
| contracts | `makeContractsController`        | 16      | `plugin.ts`                   |
| partners  | `makeCollaboratorsController`    | 9       | `plugin.ts`                   |
| partners  | `makeSuppliersController`        | 9       | `supplier-plugin.ts`          |
| partners  | `makeActController`              | 7       | `act-plugin.ts`               |
| partners  | `makeFinancierController`        | 7       | `financier-plugin.ts`         |
| partners  | `makePartnerGeographyController` | 7       | `partner-geography-plugin.ts` |
| partners  | `makePartnersController`         | 1       | `partners-plugin.ts`          |
| programs  | `makeProgramsController`         | 8       | `plugin.ts`                   |

> Nomes de factory são propostos (W1 pode ajustar para casar a convenção do módulo). Plugins com sub-recursos
> (ex.: `contracts` com amendments/documents) podem agrupar por sub-objeto se melhorar a leitura, sem mudar comportamento.

## State transitions

N/A — o refactor não tem máquina de estado. O ciclo de vida de domínio (`contracts`, `programs`) é **intocado**.
