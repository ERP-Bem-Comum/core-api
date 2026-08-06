# Implementation Plan: Validação de alçada do aprovador no Lançar Documento

**Branch**: `028-fin-approver-limit` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-fin-approver-limit/spec.md`

## Summary

Bloquear que um documento financeiro siga para aprovação quando a **alçada** (limite monetário) do aprovador indicado for menor que o **valor líquido** do documento, e — quando insuficiente — **encaminhar ao próximo aprovador com alçada suficiente** (cascata).

**Abordagem técnica (autocontida — FR-007a):** a alçada é um **atributo do papel (RBAC)** no módulo `auth` — adiciona-se **uma coluna** (`approval_limit_cents`) ao agregado `Role` existente, sem reformular o RBAC e sem depender de tickets de RBAC em aberto (#45 `mass-approver-role`, spec 005). O módulo `financial` **lê a projeção mínima de autoridade** (`{ canApprove, limitCents }`) via `auth/public-api/read.ts` — estendendo o precedente `AuthUserReadPort` (#207) — **sem** acessar `auth_*` cru. A **regra** `alçada ≥ líquido` e a **cascata** vivem no **domínio do `financial`** (função pura sobre a lista de aprovadores com autoridade ordenada por limite). Sincroniza-se apenas o estado remoto mínimo (Vernon, _Think Minimalistic_, p.158 — ver research.md).

## Technical Context

**Language/Version**: TypeScript 6 · Node.js 24 LTS · ESM (NodeNext)

**Primary Dependencies**: Drizzle ORM 0.45 + `mysql2` (MySQL 8.4) · Fastify 5 + Zod (borda) · `node:test`

**Storage**: MySQL 8.4 — schema `auth_*` (alçada no `auth_role`); `fin_*` inalterado (sem novas tabelas no financial)

**Testing**: `node:test` + `--experimental-strip-types`; integração via `pnpm run test:integration:{auth,financial}` (Docker MySQL)

**Target Platform**: borda HTTP `/api/v1` (Fastify)

**Project Type**: modular monolith (backend único)

**Performance Goals**: validação síncrona imperceptível (< 1s no fluxo de lançamento — SC-004); leitura de autoridade é 1 query indexada

**Constraints**: cross-módulo **somente** via `public-api` (ADR-0006); isolamento `auth_*`/`fin_*` (ADR-0014); MySQL sem JSON/ENUM/trigger/proc (ADR-0020); Money em centavos (bigint), comparação inteira `>=`; domínio puro sem `throw` (Princípio V)

**Scale/Scope**: 2 BCs tocados (`auth` dono do dado, `financial` dono da regra); ~1 migration `auth` (ALTER ADD col); sem novo módulo, sem outbox novo

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                         | Status           | Nota                                                                                                                                                                                               |
| --------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3 fail-first           | ✅               | W0 RED por ticket (ver Estimativa de Pipeline)                                                                                                                                                     |
| II. Regressão zero                | ✅               | Gate W3 verde por ticket                                                                                                                                                                           |
| III. pnpm                         | ✅               | sem npm                                                                                                                                                                                            |
| IV. Modular Monolith / isolamento | ⚠️ → justificado | Toca `auth` + `financial`. Integração **read-only via `public-api`** (sem leitura cruzada de tabela). Fatiado em tickets por módulo para respeitar "1 módulo por sessão". Ver Complexity Tracking. |
| V. Domínio puro                   | ✅               | `approvalLimit` reusa VO `Money`; regra/cascata = funções `Result<T,E>`, erros EN kebab-case                                                                                                       |
| VI. MySQL + Drizzle migration     | ✅               | `ALTER auth_role ADD approval_limit_cents BIGINT NULL` via `db:generate`; sem JSON/ENUM                                                                                                            |
| VII. HTTP-first                   | ✅               | borda Fastify + Zod (gestão da alçada na borda `roles`; validação nos endpoints de documento)                                                                                                      |
| VIII. TS strict + idioma          | ✅               | EN no código, PT na doc; `import type`, `.ts`, `#src/*`                                                                                                                                            |
| IX. Citação canônica              | ✅               | Vernon _Think Minimalistic_ (fronteira/ACL) citado em research.md (≥4 linhas)                                                                                                                      |

**Resultado:** PASS com 1 item justificado (IV) em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/028-fin-approver-limit/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões + citação canônica
├── data-model.md        # Phase 1 — Role.approvalLimit, ApproverAuthority, ApprovalPolicy
├── quickstart.md        # Phase 1 — como exercitar a feature
├── contracts/           # Phase 1 — ports cross-módulo + endpoints HTTP
│   ├── auth-public-api.md
│   ├── financial-ports.md
│   └── http-endpoints.md
├── checklists/requirements.md   # da fase /clarify
└── tasks.md             # /speckit-tasks (NÃO criado aqui)
```

### Source Code (repository root)

```text
src/modules/auth/                                  # DONO DO DADO (alçada por papel)
├── domain/authorization/role.ts                   # + approvalLimit: Money | null (smart constructor)
├── application/
│   ├── ports/user-read.ts                         # + ApproverAuthorityView + listApproversWithAuthority
│   └── use-cases/{create-role,update-role}.ts     # aceitam approvalLimitCents (US2)
├── adapters/
│   ├── persistence/schemas/mysql.ts               # + approval_limit_cents BIGINT NULL no auth_role
│   ├── persistence/migrations/mysql/<NNNN>_*.sql  # ALTER ADD (db:generate)
│   ├── persistence/repos/user-read.drizzle.ts     # query da autoridade efetiva (MAX limite dos papéis c/ payable:approve)
│   └── http/{roles-schemas,roles-plugin}.ts       # + campo limite na borda de papéis (US2)
└── public-api/read.ts                             # re-export do port estendido (consumo do financial)

src/modules/financial/                             # DONO DA REGRA + cascata
├── domain/document/approval-policy.ts             # NOVO — regra `alçada ≥ líquido` + escolha por cascata (puro)
├── application/
│   ├── ports/approver-authority-reader.ts         # NOVO — lê autoridade via auth/public-api
│   └── use-cases/{save-document,save-draft}.ts    # chamam a policy no create e no submit (Draft→Open)
└── adapters/http/{composition,error-mapping}.ts   # wire do reader + mapeia erros sem vazar interno

tests/ (por módulo)                                # W0 RED primeiro: unit (domínio) + integração (Drizzle/HTTP)
```

**Structure Decision:** modular monolith existente. A feature **não cria pasta nova**; estende `auth` (1 coluna + leitura) e `financial` (1 serviço de domínio + 1 port + 2 use-cases). A fronteira segue ADR-0006: o `financial` nunca importa `auth/domain` nem toca `auth_*` — consome `auth/public-api/read.ts`.

## Complexity Tracking

| Violation                                                                                       | Why Needed                                                                                                                                                                                                                              | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature toca **2 BCs** (`auth` + `financial`) — tensão com "1 módulo por sessão" (Princípio IV) | A alçada é, por natureza, atributo do **papel/identidade** (contexto `auth`); a regra `alçada ≥ líquido` e a cascata são lógica de **Contas a Pagar** (contexto `financial`). Separar dono-do-dado de dono-da-regra é o correto em DDD. | Duplicar a alçada no `financial` violaria a fonte única e o isolamento (ADR-0014); ler `auth_*` cru violaria ADR-0006. A integração read-only via `public-api` é o caminho canônico. **Mitigação:** fatiar em tickets **por módulo** (auth primeiro, financial depois), cada um em sua sessão. |
| Alçada por **papel via RBAC** sem reformar o RBAC (FR-007a)                                     | Decisão explícita do solicitante: reuso do modelo `Role` existente.                                                                                                                                                                     | Criar entidade/tabela nova de "alçada" ou acoplar a `mass-approver-role` (#45)/spec 005 abriria a "recursão de tickets" que a feature proíbe. **+1 coluna no `auth_role`** é o delta mínimo.                                                                                                   |

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] colunas (1: `auth_role.approval_limit_cents`) · [ ] tabelas · [ ] índices · [ ] FKs
- **Prefixo de isolamento correto?** `auth_*` (a coluna entra em `auth_role`) — ADR-0014: **sim**
- **Outbox**: novo evento exige `INSERT` em `core.outbox`? **Não** (validação síncrona; cascata, se emitir evento, fica avaliada no ticket da cascata — default: sem evento)
- **Comando**: editar `schema.ts` (auth) → `pnpm run db:generate` → versionar a migration
- **Restrições MySQL 8** (ADR-0020): `approval_limit_cents BIGINT NULL`, sem JSON/ENUM/trigger/proc. `ALTER ... ADD COLUMN` é INSTANT no 8.4 — **sem hint `ALGORITHM`** (ver memória do #274: forçar hint dá erro 1845). Validar o ALTER no banco real.

## Contrato HTTP (ADR-0025/0027 — borda ativa)

- **Auth (US2 — gestão da alçada do papel):**
  - `POST /api/v1/roles` e `PATCH /api/v1/roles/:id` — **+ campo opcional** `approvalLimitCents: number | null` (Zod `z.number().int().min(0).nullable().optional()`). Borda em `roles-schemas.ts`/`roles-plugin.ts`. Permissão de gestão de papéis já existente (sem permissão nova).
- **Financial (US1/US3 — validação no documento):** **sem rota nova**. A validação incide nos endpoints existentes de criação e submissão de documento (`POST /api/v1/financial/documents` e a transição `submitDraft` Draft→Open, #91). Novos erros 4xx mapeados sem vazar interno: `approver-limit-exceeded`, `approver-not-found`, `approver-missing-permission`, `no-approver-with-sufficient-limit` → dicionário PT na borda.
- **Backward-compat**: campo de limite é **aditivo e opcional**; papéis sem limite seguem válidos (mas não aprovam — FR-008). Documentos sem `approverRef` ou em Draft sem líquido não disparam validação.

## Estimativa de Pipeline (W0 size)

- **Tamanho global**: **L** — toca 2 BCs, migration, novo serviço de domínio + cascata, integração em 2 use-cases e 2 bordas. Fatiado em **3 tickets** (cada um S/M, W0 RED próprio), respeitando 1 módulo por sessão:

  | Ticket                         | Módulo    | Escopo                                                                                                                                                   | Size | W0 RED (primeiro vermelho)                                                                                                       |
  | ------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
  | **FIN-APPROVER-LIMIT-AUTH**    | auth      | `Role.approvalLimit` + migration + `create/update-role` + borda `roles` (US2) + `public-api` read (`getApproverAuthority`, `listApproversWithAuthority`) | M    | `role.test.ts` (limite no agregado), `user-read.drizzle` integração (autoridade efetiva), `roles-plugin` inject (campo na borda) |
  | **FIN-APPROVER-LIMIT-POLICY**  | financial | port `ApproverAuthorityReader` + `approval-policy.ts` (regra ≥, US1) + integração `save-document` (create) e `save-draft`/submit + erros na borda        | M    | `approval-policy.test.ts` (≥/<, sem alçada=bloqueia, sem permissão), use-case test (recusa com líquido > alçada)                 |
  | **FIN-APPROVER-LIMIT-CASCADE** | financial | cascata (US3) — escolha do próximo aprovador com alçada suficiente sobre a lista ordenada; erro `no-approver-with-sufficient-limit`                      | S→M  | `approval-policy.test.ts` (cascata: escolhe menor limite suficiente; nenhum suficiente)                                          |

- **Justificativa do fatiamento:** AUTH é pré-requisito de dados (sem alçada legível, POLICY não tem o que validar). POLICY entrega o MVP (US1). CASCADE é a automação (US3) por cima. Cada ticket fecha verde isolado; nenhum abre dependência fora destes 3 (autocontenção FR-007a).
- **Agentes por wave (sugestão):** W0 `tdd-strategist`; W1 AUTH→`drizzle-orm-expert`+`typescript-language-expert`, POLICY/CASCADE→`ts-domain-modeler`, borda→`fastify-server-expert`+`zod-expert`; W2 `code-reviewer`; W3 `ts-quality-checker`. Segurança da borda: `security-backend-expert` no fechamento da fatia auth (exposição de limite).
