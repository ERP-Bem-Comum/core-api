# Data Model — artefatos da feature 007

> A feature **não tem entidades de domínio** (não toca `src/*/domain`). O "modelo" aqui são os
> artefatos de teste e o mapa de rastreabilidade que garante a cobertura 1:1.

## Entidade: RequestUnderTest (item de cobertura)

Representa um caso de teste de borda HTTP. Origem: um `.bru` existente.

| Campo              | Descrição                                                                        |
| ------------------ | -------------------------------------------------------------------------------- |
| `id`               | caminho relativo do `.bru` original (ex.: `auth/6-roles/104-assign-role-ok.bru`) |
| `module`           | `auth` \| `contracts` \| `partners`                                              |
| `method` + `route` | verbo + rota HTTP exercitada                                                     |
| `assertions[]`     | lista de asserções (status, shape, header, regra de segurança) ou `smoke-only`   |
| `seedNeeds`        | pré-condições de estado (usuário/role/contrato semeado)                          |

## Entidade: SafetyNetArtifact (rede de segurança)

Para cada `RequestUnderTest`, exatamente **um par**:

| Campo             | Descrição                                                    |
| ----------------- | ------------------------------------------------------------ |
| `bddPath`         | `safety-net/bdd/<module>/<request>.feature` (Gherkin)        |
| `tddPath`         | `safety-net/tdd/<module>/<request>.md` (asserções esperadas) |
| `coversRequestId` | FK → `RequestUnderTest.id`                                   |

**Invariante (FR-001/SC-001)**: `count(SafetyNetArtifact) == count(RequestUnderTest originais)` e cada artefato mapeia exatamente um request (1:1).

## Entidade: TraceabilityRow (mapa)

Linha de `safety-net/traceability.md` — a prova auditável de cobertura preservada:

| `bru_original`           | `bdd`      | `tdd` | `request_unificado`            | `status`                            |
| ------------------------ | ---------- | ----- | ------------------------------ | ----------------------------------- |
| caminho do `.bru` antigo | `.feature` | `.md` | caminho na coleção `core-api/` | `capturado` → `reescrito` → `verde` |

**Transições de estado** de uma linha: `capturado` (US1) → `reescrito` (US3) → `verde` (US4 roda e passa). Uma linha só vira `verde` quando o runner único exercita o request unificado com sucesso. O legado (US5) só é removido quando **todas** as linhas estão `verde`.

## Entidade: ContractCase (US2)

Caso da contract suite do `RoleRepository`, agnóstico de adapter:

| Campo             | Descrição                                         |
| ----------------- | ------------------------------------------------- |
| `name`            | ex.: `save then findById retorna o role`          |
| `adapterAgnostic` | `true` — roda igual para in-memory e Drizzle      |
| `requiresDocker`  | `false` para in-memory, `true` para Drizzle/MySQL |

**Invariante**: o mesmo conjunto de `ContractCase` roda contra os dois adapters; divergência reprova (SC-005 da 006).
