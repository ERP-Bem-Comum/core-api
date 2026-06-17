# Implementation Plan: Cadastro completo de Colaborador + contagem de contratos nos grids

**Branch**: `015-collaborator-complete-registration` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-collaborator-complete-registration/spec.md`

## Summary

Estender o módulo `partners` com o cadastro completo do Colaborador (banco/PIX, perfil, território, histórico, autocadastro) e adicionar contagem de contratos/aditivos nos grids de parceiros via read-model `partners←contracts`. Entrega em **6 user stories serializadas** (US1→US6), **uma migration por vez** (`0010`→`0015`), cada uma um ticket pipeline W0→W3 com gate verde antes da próxima — correção direta da causa-raiz do reset anterior (PRs #83–86 colidiram na migration `0009`). A US6 é cross-BC (Contratos produz eventos enriquecidos; Parceiros projeta) e é **bloqueada por um novo ADR-0046**.

## Technical Context

**Language/Version**: TypeScript 6.0 (ESM, NodeNext) · Node.js 24 LTS

**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4); Fastify + Zod (borda HTTP — ADR-0027/0037); `notifications` (EmailSender/Nodemailer — ADR-0010); `src/shared/outbox` (worker genérico); `src/shared/utils/csv.ts` (export)

**Storage**: MySQL 8.4, prefixo `par_*` (ADR-0014). Migrations geradas por Drizzle Kit (nunca SQL à mão)

**Testing**: `node:test` + `--experimental-strip-types`; `fastify.inject` para borda; `test:integration:partners` (Docker MySQL); coleções Bruno (ADR-0034)

**Target Platform**: Servidor único (modular monolith), processo Node; worker dedicado de projeção em composition root separado (US6)

**Project Type**: Backend modular monolith (web-service)

**Performance Goals**: grids com contagem em **1 consulta batch por página** (sem N+1, FR-016); projeção do read-model idempotente e tolerante a reentrega/fora-de-ordem

**Constraints**: sem JSON/ENUM/UPSERT nativo (ADR-0020); cross-BC só por outbox (ADR-0006/0015); export em memória (gatilho de streaming documentado); rota pública sem auth na US5 exige hardening de token

**Scale/Scope**: milhares de parceiros/colaboradores; histórico cresce por alteração; contratos legados no backfill (US6). 6 tickets, migrations `0010`–`0015`

## Constitution Check

_GATE: avaliado contra os princípios I–IX da constituição (v1.2.0)._

| Princípio                           | Status | Nota                                                                                                                                                                                                                      |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                        | ✅     | cada US é um ticket com W0 RED antes de `src/`                                                                                                                                                                            |
| II. Regressão zero                  | ✅     | gate W3 verde ao fim de cada US; serialização evita acúmulo                                                                                                                                                               |
| III. pnpm único                     | ✅     | sem `npm`; `db:generate` via pnpm                                                                                                                                                                                         |
| IV. Modular Monolith / isolamento   | ✅     | **Resolvido (clarify A1/A2):** US6 fatiada em **2 tickets por BC** — `6a` (`ctr_*`) + `6b` (`par_*`); cada sessão toca um BC. Enriquecimento do evento é **aditivo ao v1** (sem breaking). US1–US5 exclusivamente `par_*` |
| V. Domínio puro                     | ✅     | VOs `Sex`/`MaritalStatus`/`Territory` + `BankAccount`/`PixKey` (promovido) com smart constructors `Result<T,E>`; erros kebab-case                                                                                         |
| VI. MySQL+Drizzle                   | ✅     | `childrenAges` como `varchar` CSV (sem JSON); migrations geradas; prefixo `par_*`                                                                                                                                         |
| VII. HTTP-first                     | ✅     | rotas novas na borda Fastify; sem CLI embutida                                                                                                                                                                            |
| VIII. TS strict + idioma            | ✅     | strict completo; código EN, docs/CAs PT-BR                                                                                                                                                                                |
| IX. Citação ACDG nas decisões-chave | ✅     | **Resolvido (clarify B1/B2):** citação literal ≥4 linhas em **todo W0** (US1–US6), via **MCP `acdg-skills`** com **fallback local** `acdg/skills_base/shared-references/`. Cada W0 não fecha sem a citação registrada     |

**Resultado**: PASS — sem desvios em aberto. Princípio IV resolvido por fatiamento (6a/6b) + evento aditivo; Princípio IX resolvido por política de citação em todo W0 (MCP + fallback). Nenhum bloqueio.

## Project Structure

### Documentation (this feature)

```text
specs/015-collaborator-complete-registration/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões técnicas + citações pendentes
├── data-model.md        # Phase 1 — entidades/VOs/colunas/migrations
├── quickstart.md        # Phase 1 — ordem de execução serializada
├── contracts/           # Phase 1 — contratos HTTP por US
├── checklists/
│   └── requirements.md  # gerado no /speckit-specify
└── tasks.md             # Phase 2 — /speckit-tasks (NÃO criado aqui)
```

### Source Code (repository root)

```text
src/modules/partners/
├── domain/
│   ├── shared/                       # NOVO: payment-target.ts promovido (US1)
│   ├── collaborator/                 # sex.ts, civil-status.ts, territory.ts (US2/US3);
│   │                                 # invite-token.ts (US5); collaborator-history.ts (US4)
│   ├── financier/                    # banco/PIX (US1)
│   ├── supplier/ · act/              # ajuste de import do VO promovido (US1)
│   └── geography/                    # catálogo read-only (valida UF — US3)
├── application/
│   ├── ports/                        # CollaboratorHistoryRepository, InviteTokenRepository,
│   │                                 # ActivationMailer, ContractCountStore (US4/US5/US6)
│   └── use-cases/                    # wire do complete-...-public (US5); list-history (US4)
├── adapters/
│   ├── http/                         # schemas Zod + rotas (US1–US3, US5); grids (US6)
│   ├── persistence/
│   │   ├── schemas/mysql.ts          # colunas/tabelas novas
│   │   └── migrations/mysql/         # 0010 → 0015 (uma por US)
│   ├── export/                       # collaborator history CSV (US4) — usa shared/utils/csv.ts
│   └── notifications/                # activation-mailer (US5)
src/modules/contracts/
└── public-api/events.ts              # US6: enriquecer payload com contractorRef (ADR-0046)
src/workers/
└── contract-count-projection/        # US6: composition root (2 pools, ctr_outbox → par_*)
src/jobs/partners/
└── contract-count-backfill...        # US6: backfill one-shot (padrão ctr_job_runs)
handbook/architecture/adr/
└── 0046-...read-model-partners-contracts.md   # US6 (pré-requisito bloqueante)
```

**Structure Decision**: módulo `partners` é o foco; US6 adiciona um worker dedicado em `src/workers/` (espelhando `supplier-view-projection` da feature 014) e o único toque em `contracts` é o enriquecimento de payload em `public-api/events.ts`.

## Complexity Tracking

| Violação                                                               | Por que é necessária                                                                                                                               | Alternativa mais simples rejeitada porque                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **US6 toca 2 BCs** (`ctr_*` + `par_*`) — Princípio IV / anti-padrão #4 | A contagem de contratos por parceiro é dado de outro BC; FR-019 exige `contractorRef` nos eventos do Contratos para a projeção atribuir a contagem | **Port síncrono `partners→contracts`** cria ciclo de dependência (ADR-0006) e leitura cruzada de tabela (proíbe ADR-0015/0022). A via correta é eventos via outbox. **Mitigação ADOTADA (clarify A1/A2):** US6 fatiada em 2 tickets por BC — (6a) `ctr_*` enriquece o evento (campo **aditivo** ao wire-format v1, sem breaking); (6b) `par_*` projeta + grids — cada sessão/commit toca um lado de cada vez |

## Migrations Drizzle (core-api)

> Migration nunca escrita à mão. **Serialização é invariante** (causa-raiz do reset): só gerar `00NN` após o W3 verde da US anterior; `pnpm run db:generate` nunca concorrente.

| Migration | US  | Mudança                                                                                                                                               | Prefixo    |
| --------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `0010`    | US1 | colunas `bankAccount*`/`pixKey*` em `par_financiers` **e** `par_collaborators`                                                                        | `par_*` ✅ |
| `0011`    | US2 | colunas de perfil em `par_collaborators` (`sex`, `marital_status`, filhos, PCD, licença, `public_sector_experience_duration`)                         | `par_*` ✅ |
| `0012`    | US3 | colunas `territory_uf`, `territory_municipality` em `par_collaborators`                                                                               | `par_*` ✅ |
| `0013`    | US4 | tabela `par_collaborator_history` (snapshot before/after) + índice `(collaborator_id, data_alteracao DESC)`                                           | `par_*` ✅ |
| `0014`    | US5 | tabela `par_invite_tokens` (`token_hash` UNIQUE, `collaborator_id`, `expires_at`, `used_at`)                                                          | `par_*` ✅ |
| `0015`    | US6 | tabela read-model `par_contract_count_view` (`partner_ref` PK, `contracts_count`, `amendments_count`, `contract_status`, `occurred_at`, `updated_at`) | `par_*` ✅ |

- **Outbox**: US6 **não** cria migration em `ctr_*` — o enriquecimento de evento (`contractorRef`) é montado no **adapter** do Contratos (payload `varchar`, Opção A do ADR-0043), sem mudança de schema.
- **Restrições MySQL 8 (ADR-0020)**: sem JSON (→ `childrenAges` varchar CSV), sem ENUM nativo (→ `varchar` snake_case), sem UPSERT nativo (→ `INSERT ... ON DUPLICATE KEY UPDATE` com guard de `occurred_at` no read-model, como `fin_supplier_view`).

## Contrato HTTP (Fase 2+)

> HTTP ativo (ADR-0037). Detalhe completo de schemas Zod em `contracts/`.

| US  | Endpoint                                                                                                           | Mudança                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| US1 | `POST/PUT /financiers`, `POST/PUT /collaborators`, `GET /:id`                                                      | + `bankAccount`/`pixKey` (opcionais) em request/response                   |
| US2 | `PATCH /collaborators/:id/complete-registration`, `GET /:id`                                                       | + 12 campos de perfil (nullable)                                           |
| US3 | `POST/PUT /collaborators`, `GET /:id`                                                                              | + `territory { uf, municipality }` (nullable)                              |
| US4 | `GET /collaborators/export?type=history`                                                                           | nova variante de export (CSV legado)                                       |
| US5 | `POST /collaborators` (gera convite), `GET /collaborators/autocadastro?token=`, `POST /collaborators/autocadastro` | rota **pública** (sem `requireAuth`)                                       |
| US6 | `GET /collaborators \| /suppliers \| /acts \| /financiers` (grids)                                                 | + `contractsCount`/`amendmentsCount`; filtro `contractStatus` (Fornecedor) |

- **Backward-compat**: todos os campos novos são aditivos/nullable; grids degradam para `0/0` se o read-model estiver indisponível (FR-021).

## Estimativa de Pipeline (W0 size)

| Ticket                               | US   | Size  | Justificativa                                                                             | W0 RED (alvo)                                                                                    |
| ------------------------------------ | ---- | ----- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `PAR-PARTNER-BANK-PIX`               | US1  | **M** | VO promovido + 2 agregados + borda + persistência + migration                             | `financiers-bank-pix.routes`, `collaborators-bank-pix.routes`, `payment-target-agency` (domínio) |
| `PAR-COLLABORATOR-PROFILE-FIELDS`    | US2  | **M** | 12 campos + VOs `sex`/`maritalStatus` + coerência filhos                                  | `collaborator-fields.routes`, `sex`/`civil-status` (domínio)                                     |
| `PAR-COLLABORATOR-TERRITORY`         | US3  | **S** | 2 colunas + validação UF contra catálogo                                                  | `collaborators-territory.routes`, `territory` (domínio)                                          |
| `PAR-COLLABORATOR-HISTORY-EXPORT`    | US4  | **L** | tabela + port + projeção + export CSV legado                                              | `collaborator-history-capture`, `collaborators-history.routes`, `collaborator-history-csv`       |
| `PAR-COLLABORATOR-SELF-REGISTRATION` | US5  | **L** | token hash/TTL + mailer + rota pública + segurança                                        | `collaborators-autocadastro.routes`, `invite-token` (domínio), review `web-security-backend`     |
| `CTR-CONTRACT-EVENT-CONTRACTOR-REF`  | US6a | **M** | ADR-0046 + enriquece payload do evento do Contratos com `contractorRef` (aditivo v1)      | `contracts` event payload + decoder tolerante (contract tests)                                   |
| `PAR-CONTRACT-COUNT-READMODEL`       | US6b | **L** | read-model `par_contract_count_view` + worker projeção + backfill + grids (depende de 6a) | `contract-count-projection`, grids batch-count, degradação `0/0`                                 |

**Roteamento por ticket** (declarar antes de cada wave): `ts-domain-modeler` (VOs), `drizzle-schema-author` (schema/migration), `zod-expert` (borda), `ports-and-adapters` (US4/US5/US6), `modular-monolith` + `nodejs-runtime-expert` (worker US6), `web-security-backend` (US5), `nodemailer-email-expert` (e-mail US5), `tdd-strategist` (W0), `code-reviewer` (W2), `ts-quality-checker` (W3). Orquestração pelo `contratos-orchestrator`.

## Dependências e ordem

```
US1 (banco/PIX)  ──► US2 (perfil)  ──► US3 (território)  ──► US4 (histórico)  ──► US5 (autocadastro)
                                                                                       │
US6 (grids/read-model) ── independente dos campos, porém serializada por migration; ADR-0046 primeiro
```

- **US4 depois de US1–US3**: o snapshot de histórico captura os campos novos sem retrabalho.
- **US5 por último no bloco Colaborador**: o pré-cadastro pode incluir os campos das US anteriores; é o item mais sensível (segurança).
- **US6 por último**: maior risco; o ADR-0046 pode ser redigido em paralelo (read-only), mas a migration `0015` respeita a serialização.
