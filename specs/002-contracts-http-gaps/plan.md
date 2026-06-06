# Implementation Plan: Gaps de borda HTTP do módulo `contracts`

**Branch**: `002-contracts-http-gaps` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-contracts-http-gaps/spec.md`

> Plano do épico. Consolida `spec.md` (com as 4 decisões travadas no `/speckit-clarify`), `po-feedback/0001`,
> ADR-0032 e o recon do módulo `contracts`. Constitution Check contra a constituição do **core-api** (I–IX).
> **Fatia o épico em tickets W0→W3.**

## Summary

Fechar os gaps de borda HTTP do módulo `contracts` (`/api/v2`) que travam o front: **(1)** vínculo do
**contratado** ao contrato e **(2)** edição de **metadados** via PATCH. O contrato deixa de ser "solto":
ganha `contractor` (referência leve `{ type, id }` — atributo próprio do agregado) e os metadados
`observations`/`email`/`telephone`. A leitura de detalhe **compõe** o snapshot do contratado lendo a
**public-api de Parceiros** (`ContractorReadPort`, hoje órfão) numa **rota gorda transitória** com `Sunset`
(ADR-0032) — o núcleo permanece sem conhecer Parceiros. O PATCH edita só metadados; valor/período/datas são
imutáveis (mudam por aditivo). Entrega = superfície `/api/v2` que o BFF/cliente consome.

## Technical Context

**Language/Version**: TypeScript 6→7 strict, ESM (NodeNext) · Node 24 LTS
**Primary Dependencies**: Fastify 5 + `fastify-zod-openapi` (borda, ADR-0025/0027) · Drizzle ORM + mysql2 (ADR-0020) · Zod 4
**Storage**: MySQL 8.4 (prefixo `ctr_*`, ADR-0014) — `ctr_contracts` ganha 5 colunas (`contractor_type`, `contractor_id`, `observations`, `email`, `telephone`); **nenhuma tabela nova**
**Testing**: `node:test` + `--experimental-strip-types` (domínio/aplicação/repo in-memory) · integração via Docker compose `--wait` (constraints MySQL) · `fastify.inject` (rotas)
**Target Platform**: Node 24 server (borda HTTP ativa — ADR-0025) + CLI
**Project Type**: modular monolith backend (módulo vertical `contracts`; leitura cross-BC de `partners` só na borda via public-api)
**Performance Goals**: detalhe composto p95 < 150ms (1 leitura local + 1 leitura na public-api de Parceiros com timeout); PATCH < 100ms
**Constraints**: RBAC em toda rota (401/403); `requestId` no envelope; composição com timeout + degradação graciosa (anti-oráculo); núcleo sem import de `partners/*`; sem JSON/ENUM nativo (ADR-0020)
**Scale/Scope**: 1 módulo (`contracts`) + 1 toque cirúrgico em `partners/public-api` (ActView) · ~3 rotas (POST alterado, GET detalhe alterado, PATCH novo, DELETE recusado) · 5 colunas · 5 tickets W0→W3

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                         | Aderência | Nota                                                                                                                                                                                               |
| --------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                      | ✓         | cada ticket abre `.pipeline/<TICKET>/` com W0 RED antes de `src/`                                                                                                                                  |
| II. Regressão zero                | ✓         | W3 = typecheck+format+lint+test verdes; sem fechar com vermelho                                                                                                                                    |
| III. pnpm only                    | ✓         | nenhum `npm`; zero dep nova (Zod/Fastify/Drizzle já presentes)                                                                                                                                     |
| IV. Modular Monolith / isolamento | ✓         | núcleo de `contracts` **não** importa `partners/*` (FR-012); leitura cross-BC **só na borda** via `partners/public-api` (`read.ts`), nunca SELECT em `par_*` (ADR-0006/0014)                       |
| V. Domínio puro                   | ✓         | `ContractorRef` = `Readonly<{type,id}>` + smart constructor `Result`; `ContractorId` branded; metadados como VO/strings validadas; sem classe/throw; composição/serialização ficam no adapter HTTP |
| VI. MySQL 8 + Drizzle migrations  | ✓         | 5 colunas em `ctr_contracts` via `pnpm run db:generate`; `contractor_type` varchar(16)+CHECK (sem ENUM); sem FK física cross-db; sem JSON                                                          |
| VII. CLI-first; HTTP exige ADR    | ✓         | **HTTP já habilitado** (ADR-0025); rota composta transitória autorizada por **ADR-0032**. Não inaugura HTTP — estende o plugin de `contracts`                                                      |
| VIII. TS strict + ESM + idioma    | ✓         | `import type`, `.ts` nos imports, `#src/*`; erros EN kebab-case; docs/commits PT                                                                                                                   |
| IX. Cânone + citação              | ✓         | decisão-chave (`ContractorRef` = referência por identidade) ancorada em Vernon (citação ≥4 linhas em "Review do Plano"); composição transitória em ADR-0032                                        |

**Resultado: PASS** — sem violações. A "rota gorda" composta **não** é violação do Princ. IV: é exatamente
o padrão autorizado por ADR-0032 (composição na borda, núcleo intocado). Nada a registrar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-contracts-http-gaps/
├── spec.md (+ checklists/requirements.md)
├── plan.md (este) · research.md · data-model.md · quickstart.md
├── contracts/        # contratos HTTP (POST/GET detalhe/PATCH/DELETE) — Zod request/response
└── bdd/              # cenários Gherkin por user story
   (tasks.md gerado pelo /speckit-tasks — NÃO por este comando)
```

### Source Code (estende o módulo `contracts`; 1 toque em `partners/public-api`)

```text
src/modules/contracts/
├── domain/
│   ├── shared/
│   │   └── contractor.ts             # NOVO — ContractorRef VO + ContractorType + ContractorId (branded) + parse → Result
│   └── contract/
│       ├── types.ts                  # + campo contractor + observations/email/telephone no Contract
│       ├── contract.ts               # + updateContract estende metadados; create vincula contractor
│       └── errors.ts                 # + 'contractor-id-invalid' | 'contractor-type-unknown' | 'contract-metadata-empty'
├── application/use-cases/
│   ├── create-contract.ts            # + recebe/valida contractor no command
│   ├── get-contract-detail.ts        # (leitura local; composição fica na borda)
│   └── update-contract-metadata.ts   # NOVO — patch de metadados (sobre helper updateContract)
├── adapters/
│   ├── http/
│   │   ├── plugin.ts                 # + PATCH /contracts/:id · DELETE /contracts/:id (recusa) · GET detalhe compõe snapshot
│   │   ├── contract-dto.ts           # + contractor {type,id} + snapshot no DTO de detalhe
│   │   ├── contractor-composition.ts # NOVO — orquestra ContractorReadPort → snapshot|null (timeout, degradação)
│   │   ├── schemas.ts                # + Zod: contractor no POST; PATCH .strict()+.refine; resposta detalhe
│   │   └── composition.ts            # + wiring buildPartnersReadPort (deps da rota gorda)
│   └── persistence/
│       ├── schemas/mysql.ts          # + contractor_type/contractor_id/observations/email/telephone (CHECK type)
│       ├── migrations/mysql/         # gerada por db:generate
│       └── repos/
│           ├── contract-repository.drizzle.ts    # + map row↔domínio dos 5 campos
│           └── contract-repository.in-memory.ts  # + idem
└── public-api/permissions.ts         # (reusa contract:read / contract:write)

src/modules/partners/public-api/
├── contractor-view.mapper.ts         # + ActView + actToView (paridade 4/4 — FR-005)
└── read.ts / contractor-read.* + adapters/persistence  # + suporte ao tipo 'act' na leitura
```

**Structure Decision**: módulo vertical `contracts` estendido (sem estrutura nova). O `ContractorRef` vive
em `contracts/domain/shared/` (VO específico do BC, não no kernel). A composição cross-BC isola-se em
`adapters/http/contractor-composition.ts` — único ponto que conhece a public-api de Parceiros. O único toque
fora de `contracts` é aditivo (`ActView`) e mora em `partners/public-api` (ticket próprio).

## Complexity Tracking

> Constitution Check passou sem violações — nada a justificar.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] colunas (`contractor_type`, `contractor_id`, `observations`, `email`, `telephone`) · [ ] tabelas novas · [ ] índices (YAGNI — sem query "contratos por contratado") · [ ] FKs (cross-db, proibida — ADR-0014)
- **Prefixo de isolamento correto?** `ctr_*` (ADR-0014): **sim** (`ctr_contracts`)
- **Outbox**: novo evento? **não** (capacidades são criação/edição/leitura de borda; reavaliar se vincular contratado precisar notificar outro módulo)
- **Comando**: editar `schemas/mysql.ts` → `pnpm run db:generate` → versionar migration. Colunas `NOT NULL` direto para `contractor_*` (tabela vazia — decisão em Clarifications); `observations`/`email`/`telephone` nullable.
- **Restrições MySQL 8** (ADR-0020): `contractor_type` varchar(16) + CHECK `IN ('supplier','financier','collaborator','act')` (sem ENUM); `contractor_id` varchar(36); `email` varchar(255), `telephone` varchar(32), `observations` varchar(1000); sem JSON

## Contrato HTTP (borda ativa — ADR-0025; composição transitória ADR-0032)

Todas sob `/api/v2`, `requireAuth` + `authorize`, envelope `{error:{code,message,requestId}}`, schema Zod (detalhe em `contracts/`):

| Método | Rota                    | Permissão        | Mudança                                                                                                                | US     |
| ------ | ----------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| POST   | `/api/v2/contracts`     | `contract:write` | **+** `contractor: { type, id }` **obrigatório** no body                                                               | US-001 |
| GET    | `/api/v2/contracts/:id` | `contract:read`  | **+** `contractor: { type, id, snapshot }` composto via public-api de Parceiros · header `Sunset`                      | US-001 |
| PATCH  | `/api/v2/contracts/:id` | `contract:write` | **NOVO** — body `.strict()` `{title?,objective?,observations?,email?,telephone?}`; ≥1 campo                            | US-002 |
| DELETE | `/api/v2/contracts/:id` | `contract:write` | **NOVO** — **recusa** explícita (**405** `contract-delete-forbidden` + política de imutabilidade); exige `requireAuth` | US-002 |

- **Status**: campo imutável no PATCH → **400** (Zod `.strict()` rejeita chave não declarada); corpo vazio → **400** (`.refine`). Contratado ausente no detalhe → `snapshot: null` (200, nunca 500), resposta idêntica a erro de IO (anti-oráculo).
- **Backward-compat**: `POST` ganha campo **obrigatório** `contractor` — é breaking para clientes do `/api/v2` que criavam sem contratado. Aceitável: o front ainda não cria contratos em prod (mock); registrar no OpenAPI. `GET` detalhe é aditivo (novo campo `contractor`).

## Fatiamento em tickets W0→W3

| Ordem | Ticket                                     | Size | Escopo                                                                                                                                                                                                                                              | Depende de |
| ----- | ------------------------------------------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1     | **`CONTRACTS-CONTRACTOR-METADATA-DOMAIN`** | L    | `ContractorRef` VO (`contractor.ts`) + `ContractorId` branded + `ContractorType` + metadados `observations`/`email`/`telephone` no agregado + `updateContract` estende + schema `ctr_contracts` (5 colunas) + migration + repos (drizzle+in-memory) | —          |
| 2     | **`CONTRACTS-CREATE-CONTRACTOR-HTTP`**     | M    | `POST /api/v2/contracts`: body Zod aceita `contractor` obrigatório; `create-contract` use-case vincula o contratado; persiste `contractor_type/id`                                                                                                  | #1         |
| 3     | **`PARTNERS-CONTRACTOR-ACTVIEW`**          | S    | `ActView` + `actToView` no `contractor-view.mapper.ts` (paridade 4/4) + `ContractorReadPort`/adapter resolvem `type: 'act'` (módulo **partners**, independente)                                                                                     | —          |
| 4     | **`CONTRACTS-DETAIL-COMPOSITION-HTTP`**    | M    | `GET /api/v2/contracts/:id` compõe `snapshot` via `buildPartnersReadPort` (`contractor-composition.ts`: timeout + degradação `snapshot:null` + anti-oráculo) + header `Sunset` + DTO                                                                | #1, #2, #3 |
| 5     | **`CONTRACTS-PATCH-METADATA-HTTP`**        | M    | `PATCH /api/v2/contracts/:id` (`update-contract-metadata` use-case + Zod `.strict()`+`.refine`; RBAC puro, 404 p/ inexistente) + `DELETE` recusado **405**                                                                                          | #1         |

> Dependências: #2/#5 precedem por #1 (agregado precisa do `contractor`/metadados). #4 precede por #1+#2+#3
> (compõe os 4 tipos). #3 é independente (módulo partners) — pode rodar em paralelo a #1. Cada ticket percorre
> W0→W3 com seu próprio `pnpm run pipeline:state init <ticket> --size <S|M|L>`.

## Estimativa de Pipeline (W0 size)

- **Épico**: **L** (agrega 5 tickets; #1 é L sozinho — VO + 5 colunas + migration + 2 repos).
- **Justificativa**: 1 ticket L de domínio/persistência + 3 M de borda + 1 S em partners. O `--size` real é por ticket (tabela acima).
- **Plano de testes W0 (RED) — primeiras suítes a falhar:**
  - `tests/modules/contracts/contractor-ref.test.ts` — `ContractorRef.parse`/`ContractorId` inexistentes (#1).
  - `tests/modules/contracts/contract-metadata.test.ts` — `observations/email/telephone` + `updateContract` estendido (#1).
  - `tests/modules/contracts/create-contract-contractor.http.test.ts` — POST rejeita sem `contractor` / persiste com (#2).
  - `tests/modules/partners/contractor-actview.test.ts` — `actToView`/`ContractorView` sem `act` (#3).
  - `tests/modules/contracts/contract-detail-composition.http.test.ts` — detalhe sem `snapshot`; degradação `snapshot:null` (#4).
  - `tests/modules/contracts/patch-contract-metadata.http.test.ts` — PATCH 404; 400 em campo imutável/corpo vazio; DELETE recusado (#5).

## Review do Plano (`/acdg-skills:ddd-architect`)

Decisão-chave: **`contractor` como referência por identidade**, não associação direta nem cópia das variantes
ricas de Parceiros. Ancorada em Vernon, _Implementing DDD_, Cap. 10 ("Aggregates"):

> Making Aggregates Work Together through Identity References
>
> Prefer references to external Aggregates only by their globally unique identity, not by holding a direct object reference (or "pointer"). This is exemplified in Figure 10.6.
> — _(Linha 9108, p. 460, Vaughn Vernon, Implementing Domain-Driven Design)_

- **Por que referência leve `{type,id}` e não union rica das 4 variantes**: o contratado é **aggregate root de
  outro Bounded Context** (Parceiros). Mantê-lo por identidade (`contractor_id` + discriminante `contractor_type`)
  preserva a fronteira de consistência — o `Contract` não entra na consistency boundary de `Supplier`/`Financier`/
  etc. A union rica traria os tipos de Parceiros para `contracts/domain` (viola ADR-0032 inv.1 + FR-012). A visão
  rica (`ContractorView`) é montada **na leitura, na borda** (ADR-0032), não no agregado.
- **Exhaustividade sem payload**: `ContractorType` (string-literal union de 4) dá `switch` exaustivo com
  `const _: never` na borda — não é preciso o payload das variantes no domínio.
- **Snapshot é projeção transitória**: não persiste no `Contract` (Key Entity `ContractorSnapshot`); é junção de
  leitura com `Sunset` (sai quando o BFF v2 assumir — ADR-0032).
- **Imutabilidade preservada**: o PATCH toca só metadados de cadastro; valor/período/datas seguem mudando apenas
  por aditivo homologado (Bucket D do `po-feedback/0001`); `DELETE` recusado (exclusão lógica, nunca física).

**Veredito**: modelagem APROVADA — alinhada a ADR-0032/0006/0014 e ao padrão de referência por identidade.
