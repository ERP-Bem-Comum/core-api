# Tasks: Cadastro completo de Colaborador + contagem de contratos nos grids

**Feature**: `015-collaborator-complete-registration` | **Input**: [plan.md](./plan.md) · [spec.md](./spec.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/http-contracts.md)

> **Invariantes de execução** (não-negociáveis):
>
> - **Serialização estrita entre tickets**: US1 → US2 → US3 → US4 → US5 → US6a → US6b. O próximo ticket só abre com o **gate W3 verde** do anterior. `[P]` marca paralelismo **apenas dentro** de um ticket.
> - **Uma migration por vez**: `0010`→`0015`. `pnpm run db:generate` **nunca** concorrente (causa-raiz do reset #83–86).
> - **Citação ACDG em todo W0** (Princípio IX): cada W0 registra citação literal ≥4 linhas via MCP `acdg-skills` (`skills_buscar`/`skills_citar`) com fallback `acdg/skills_base/shared-references/`.
> - **Cada ticket** percorre W0 (RED) → W1 (GREEN) → W2 (review read-only, máx 3 rounds) → W3 (gate `typecheck`+`format:check`+`lint`+`test`).

---

## Phase 1: Setup (compartilhado)

- [x] T001 Confirmar baseline verde na branch `015-collaborator-complete-registration` (`pnpm install` + `pnpm run typecheck && pnpm test`) antes de abrir o 1º ticket
- [x] T002 Confirmar próximo número de migration livre = `0010` em `src/modules/partners/adapters/persistence/migrations/mysql/meta/_journal.json`

---

## Phase 2: US1 — Banco/PIX em Financier e Collaborator (P1) · ticket `PAR-PARTNER-BANK-PIX` · mig `0010`

**Goal**: Financiador e Colaborador aceitam/persistem/retornam `bankAccount`/`pixKey` (opcionais); VO de pagamento promovido para `domain/shared/`.
**Independent test**: criar Financiador e Colaborador com banco/PIX → `GET` retorna ambos; `agency` malformada → 422 `bank-agency-invalid`.

- [x] T003 [US1] `pnpm run pipeline:state init PAR-PARTNER-BANK-PIX --size M`
- [x] T004 [US1] **W0 citação**: registrar citação canônica ≥4 linhas (Evans/Vernon — VO/Shared Kernel) em `.claude/.pipeline/PAR-PARTNER-BANK-PIX/002-tests/REPORT.md`
- [x] T005 [P] [US1] **W0 RED** domínio: `tests/modules/partners/domain/shared/payment-target-agency.test.ts` (regex agency + DV)
- [x] T006 [P] [US1] **W0 RED** borda: `tests/modules/partners/adapters/http/financiers-bank-pix.routes.test.ts`
- [x] T007 [P] [US1] **W0 RED** borda: `tests/modules/partners/adapters/http/collaborators-bank-pix.routes.test.ts`
- [x] T008 [P] [US1] **W0 RED** persistência: round-trip em `tests/modules/partners/adapters/persistence/financier.mapper.test.ts` + collaborator.mapper
- [x] T009 [US1] **W1** promover VO: mover `src/modules/partners/domain/supplier/payment-target.ts` → `src/modules/partners/domain/shared/payment-target.ts` e ajustar imports em `domain/supplier/` e `domain/act/`
- [x] T010 [US1] **W1** validação `agency` (regex `^\d{4}(-?\d)?$` → `bank-agency-invalid`) em `createBankAccount`; harmonizar Supplier/Act
- [x] T011 [P] [US1] **W1** estender Financier: `domain/financier/types.ts`, `financier.ts` (register/edit), `errors.ts`
- [x] T012 [P] [US1] **W1** estender Collaborator: `domain/collaborator/types.ts` (banco/PIX)
- [x] T013 [US1] **W1** schema: colunas `bank_account_*`/`pix_key_*` em `par_financiers` e `par_collaborators` (`adapters/persistence/schemas/mysql.ts`)
- [x] T014 [US1] **W1** `pnpm run db:generate` → migration `0010` (revisar SQL gerado)
- [x] T015 [P] [US1] **W1** mappers: `adapters/persistence/mappers/financier.mapper.ts` + `collaborator.mapper.ts`
- [x] T016 [P] [US1] **W1** borda Zod: `adapters/http/financier-schemas.ts` + `schemas.ts` (collaborator) + DTOs (create/update/response)
- [x] T017 [US1] **W2** review read-only (`code-reviewer`) → `004-code-review/REVIEW.md`
- [x] T018 [US1] **W3** gate verde (`typecheck`+`format:check`+`lint`+`test` + `test:integration:partners`) → `pipeline:state close`

---

## Phase 3: US2 — Campos de perfil do Colaborador (P2) · ticket `PAR-COLLABORATOR-PROFILE-FIELDS` · mig `0011`

**Goal**: 12 campos de perfil (nullable), `sex` (F|M) coexistindo com `genderIdentity`; `childrenAges` = varchar CSV.
**Independent test**: complete-registration com os campos → detalhe retorna; `sex`/`maritalStatus` inválidos → 422.
**Pré-condição**: US1 mergeada (gate W3 verde).

- [x] T019 [US2] `pnpm run pipeline:state init PAR-COLLABORATOR-PROFILE-FIELDS --size M`
- [x] T020 [US2] **W0 citação**: citação ≥4 linhas (Evans — VO/Invariantes) em `002-tests/REPORT.md`
- [x] T021 [P] [US2] **W0 RED** domínio: `tests/.../domain/collaborator/sex.test.ts` + `civil-status.test.ts`
- [x] T022 [P] [US2] **W0 RED** domínio: `collaborator-fields.test.ts` (coerência `hasChildren=false ⇒ vazios`; `childrenAges` CSV)
- [x] T023 [P] [US2] **W0 RED** borda: `tests/.../adapters/http/collaborators-fields.routes.test.ts`
- [x] T024 [P] [US2] **W1** VOs: `domain/collaborator/sex.ts` (→ `sex-invalid`) + `civil-status.ts` (→ `marital-status-invalid`)
- [x] T025 [US2] **W1** estender `domain/collaborator/types.ts` + `collaborator.ts` (completeRegistration aceita os 12 campos) + `errors.ts`
- [x] T026 [US2] **W1** schema: colunas de perfil em `par_collaborators` (`sex`, `marital_status`, filhos, PCD, licença, `public_sector_experience_duration`)
- [x] T027 [US2] **W1** `pnpm run db:generate` → migration `0011`
- [x] T028 [P] [US2] **W1** mapper `collaborator.mapper.ts` (serializa `childrenAges` CSV) + DTO `collaborator-dto.ts`
- [x] T029 [P] [US2] **W1** borda Zod: `schemas.ts` (`completeRegistrationBodySchema` + `collaboratorDetailSchema`)
- [x] T030 [US2] **W2** review (`code-reviewer`)
- [x] T031 [US2] **W3** gate verde + `close`

---

## Phase 4: US3 — Território do Colaborador (P3) · ticket `PAR-COLLABORATOR-TERRITORY` · mig `0012`

**Goal**: `territory { uf, municipality }` nullable; UF validada contra catálogo `domain/geography/`.
**Independent test**: criar com/sem território; UF inválida → 422 `territory-uf-invalid`; território preservado em deactivate.
**Pré-condição**: US2 mergeada.

- [ ] T032 [US3] `pnpm run pipeline:state init PAR-COLLABORATOR-TERRITORY --size S`
- [ ] T033 [US3] **W0 citação**: citação ≥4 linhas (Evans — VO/referência a catálogo) em `002-tests/REPORT.md`
- [ ] T034 [P] [US3] **W0 RED** domínio: `tests/.../domain/collaborator/territory.test.ts` (UF vs catálogo)
- [ ] T035 [P] [US3] **W0 RED** borda: `tests/.../adapters/http/collaborators-territory.routes.test.ts` (inclui preservação em deactivate)
- [ ] T036 [US3] **W1** VO `domain/collaborator/territory.ts` (valida `uf` contra `domain/geography/state.ts`)
- [ ] T037 [US3] **W1** estender `types.ts`/`collaborator.ts` (preservar território em edit/deactivate)
- [ ] T038 [US3] **W1** schema: `territory_uf` (varchar 2), `territory_municipality` (varchar 255) em `par_collaborators`
- [ ] T039 [US3] **W1** `pnpm run db:generate` → migration `0012`
- [ ] T040 [P] [US3] **W1** mapper + DTO + borda Zod (create/update/detail)
- [ ] T041 [US3] **W2** review (`code-reviewer`)
- [ ] T042 [US3] **W3** gate verde + `close`

---

## Phase 5: US4 — Histórico de alterações + export CSV (P3) · ticket `PAR-COLLABORATOR-HISTORY-EXPORT` · mig `0013`

**Goal**: `par_collaborator_history` (snapshot before/after) + projeção + export CSV legado.
**Independent test**: alterar cargo gera linha de histórico; `export?type=history` → CSV legado; repo indisponível → 503.
**Pré-condição**: US3 mergeada.

- [ ] T043 [US4] `pnpm run pipeline:state init PAR-COLLABORATOR-HISTORY-EXPORT --size L`
- [ ] T044 [US4] **W0 citação**: citação ≥4 linhas (Vernon — projeções/read-model; ADR-0022) em `002-tests/REPORT.md`
- [ ] T045 [P] [US4] **W0 RED** domínio: `tests/.../domain/collaborator/collaborator-history.test.ts`
- [ ] T046 [P] [US4] **W0 RED** application: `tests/.../application/collaborator-history-capture.test.ts` (cadastro inicial não gera entry)
- [ ] T047 [P] [US4] **W0 RED** export: `tests/.../adapters/export/collaborator-history-csv.test.ts` (cabeçalho legado + `programa` vazia, datas dd/MM/aaaa)
- [ ] T048 [P] [US4] **W0 RED** borda: `tests/.../adapters/http/collaborators-history.routes.test.ts` (503 `collaborator-repo-unavailable`)
- [ ] T049 [US4] **W1** domínio: `domain/collaborator/collaborator-history.ts` + `collaborator-history-id.ts` + snapshot
- [ ] T050 [US4] **W1** port `application/ports/collaborator-history-repository.ts` + use case de captura/projeção (de `CollaboratorEdited`/`Deactivated`/`Reactivated`)
- [ ] T051 [US4] **W1** schema: tabela `par_collaborator_history` + índice `(collaborator_id, data_alteracao DESC)`
- [ ] T052 [US4] **W1** `pnpm run db:generate` → migration `0013`
- [ ] T053 [P] [US4] **W1** adapters: repo Drizzle + InMemory (`adapters/persistence/repos/collaborator-history-*`)
- [ ] T054 [P] [US4] **W1** export: `adapters/export/collaborator-history-csv.ts` (usa `src/shared/utils/csv.ts`) + rota `export?type=history` em `plugin.ts`
- [ ] T055 [US4] **W2** review (`code-reviewer`)
- [ ] T056 [US4] **W3** gate verde + `close`

---

## Phase 6: US5 — Autocadastro público do Colaborador (P2) · ticket `PAR-COLLABORATOR-SELF-REGISTRATION` · mig `0014`

**Goal**: token hash uso-único + TTL 7d, e-mail via `notifications`, rota pública sem `requireAuth`.
**Independent test**: gerar convite → e-mail; token válido pré-popula (CPF mascarado); expirado/usado → 404 sem vazar; conclusão → Complete + token usado; CPF divergente → 400.
**Pré-condição**: US4 mergeada.

- [ ] T057 [US5] `pnpm run pipeline:state init PAR-COLLABORATOR-SELF-REGISTRATION --size L`
- [ ] T058 [US5] **W0 citação**: citação ≥4 linhas (OWASP — IDOR/token uso-único/não-enumeração) em `002-tests/REPORT.md`
- [ ] T059 [P] [US5] **W0 RED** domínio: `tests/.../domain/collaborator/invite-token.test.ts` (precedência used>expired>pending; consumo atômico)
- [ ] T060 [P] [US5] **W0 RED** borda pública: `tests/.../adapters/http/collaborators-autocadastro.routes.test.ts` (todos os 5 CAs)
- [ ] T061 [US5] **W1** domínio: `domain/collaborator/invite-token.ts` + `invite-token-id.ts` + port `invite-token-repository.ts`
- [ ] T062 [US5] **W1** application: wire do use case órfão `complete-collaborator-registration-public.ts` + `request-collaborator-activation` + `get-collaborator-activation-by-token` + `mask-cpf`
- [ ] T063 [US5] **W1** mailer próprio do partners: port `application/ports/collaborator-activation-mailer.ts` + adapter via `notifications` (sem importar `auth` — ADR-0006)
- [ ] T064 [US5] **W1** schema: tabela `par_invite_tokens` (`token_hash` UNIQUE, `expires_at`, `used_at`)
- [ ] T065 [US5] **W1** `pnpm run db:generate` → migration `0014`
- [ ] T066 [P] [US5] **W1** adapters: repo Drizzle + InMemory do token + minter (`node:crypto`, hash) + rota pública em `plugin.ts`/`composition.ts`
- [ ] T067 [US5] **W2** review de segurança (`web-security-backend`): token hash, não-enumeração, rate-limit a avaliar → `004-code-review/REVIEW.md`
- [ ] T068 [US5] **W3** gate verde + `close`

---

## Phase 7: US6a — Enriquecer evento do Contratos com `contractorRef` (P3) · ticket `CTR-CONTRACT-EVENT-CONTRACTOR-REF` · sem migration

**Goal**: payload dos eventos de integração do Contratos passa a carregar `contractorRef { contractorType, contractorId }` (campo **aditivo** ao wire-format v1).
**Independent test**: evento publicado no `ctr_outbox` decodifica com `contractorRef`; consumer antigo (financial) ignora o campo extra (v1 intacto).
**Pré-condição**: US5 mergeada · **ADR-0046 aceito**.

- [ ] T069 [US6a] **ADR-0046**: redigir `handbook/architecture/adr/0046-read-model-partners-contracts.md` (read-model + enriquecimento aditivo; **mapeamento de identidade** `contractorRef.contractorId → partner_ref` / `contractorType → partner_type`; **citação canônica ≥4 linhas** — Vernon Integration Events + ADR-0022) e registrar em `handbook/CHANGELOG.md`
- [ ] T070 [US6a] `pnpm run pipeline:state init CTR-CONTRACT-EVENT-CONTRACTOR-REF --size M`
- [ ] T071 [US6a] **W0 citação**: citação ≥4 linhas (Vernon — Integration Events; evento-de-domínio ≠ evento-de-integração) em `002-tests/REPORT.md`
- [ ] T072 [P] [US6a] **W0 RED** contract test: payload de integração inclui `contractorRef`; `decodeContractsModuleEventV1` continua aceitando eventos sem o campo (tolerância)
- [ ] T073 [US6a] **W1** montar `contractorRef` no **adapter** do Contratos (Opção A — sem tocar o domínio) ao enfileirar no `ctr_outbox`
- [ ] T074 [US6a] **W1** expor/decodificar `contractorRef` em `src/modules/contracts/public-api/events.ts` (aditivo; `CONTRACTS_SCHEMA_VERSION=1` mantido)
- [ ] T075 [US6a] **W2** review (`code-reviewer` + `modular-monolith` — confirmar isolamento)
- [ ] T076 [US6a] **W3** gate verde (incl. `test:integration:contracts` se aplicável) + `close`

---

## Phase 8: US6b — Read-model de contagem + grids (P3) · ticket `PAR-CONTRACT-COUNT-READMODEL` · mig `0015`

**Goal**: `par_contract_count_view` projetada do `ctr_outbox`; grids trazem `contractsCount`/`amendmentsCount` (batch, sem N+1); filtro `contractStatus` no Fornecedor; degrada para 0/0.
**Independent test**: read-model populado → grid traz contagens em 1 batch; filtro funciona; read-model indisponível → 0/0 sem quebrar.
**Pré-condição**: US6a mergeada.

- [ ] T077 [US6b] `pnpm run pipeline:state init PAR-CONTRACT-COUNT-READMODEL --size L`
- [ ] T078 [US6b] **W0 citação**: citação ≥4 linhas (Vernon/ADR-0022 — read-model derivado idempotente) em `002-tests/REPORT.md`
- [ ] T079 [P] [US6b] **W0 RED** projeção: `tests/.../contract-count-projection` (idempotência por `occurred_at`, fora de ordem/reentrega)
- [ ] T080 [P] [US6b] **W0 RED** grids: contagem batch sem N+1 + filtro `contractStatus` + degradação 0/0 (route tests dos 4 grids)
- [ ] T081 [US6b] **W1** schema: read-model `par_contract_count_view` (`partner_ref` PK, `partner_type`, counts, `contract_status` ∈ `Pending|Active|Expired|Cancelled`, `occurred_at`, `updated_at`)
- [ ] T082 [US6b] **W1** `pnpm run db:generate` → migration `0015`
- [ ] T083 [US6b] **W1** store port + adapter Drizzle (upsert `ON DUPLICATE KEY UPDATE` com guard `occurred_at`, molde `fin_supplier_view`)
- [ ] T084 [US6b] **W1** worker `src/workers/contract-count-projection/` (composition root, 2 pools, `runLoop` de `src/shared/outbox`; molde `supplier-view-projection`)
- [ ] T085 [US6b] **W1** backfill one-shot `src/jobs/partners/contract-count-backfill...` coordenado por `ctr_job_runs` (claim INSERT IGNORE)
- [ ] T086 [P] [US6b] **W1** grids: contagem batch por página + filtro `contractStatus` nas listas (`adapters/http/` dos 4 tipos) + degradação 0/0
- [ ] T087 [US6b] **W2** review (`code-reviewer` + `modular-monolith` + `nodejs-runtime-expert` p/ o worker)
- [ ] T088 [US6b] **W3** gate verde + `test:integration` (projeção) + `close`

---

## Phase 9: Polish & Cross-Cutting

- [ ] T089 [P] Coleções Bruno (ADR-0034) por US (banco/PIX, perfil, território, histórico, autocadastro, grids) em `bruno/`
- [ ] T090 [P] Atualizar `handbook/CHANGELOG.md` + fechar issues #40/#41/#42/#43/#44/#46 referenciando os PRs
- [x] T091 Registrar issue de débito externo: hardening anti-fórmula do `src/shared/utils/csv.ts` (`\n` + full-width OWASP) via skill `issue-report`
- [ ] T092 Validar backward-compat final: colaborador/financiador legado (sem campos novos) segue válido em leitura/edição/export

---

## Dependências (ordem de conclusão)

```
Setup(T001-T002) → US1 → US2 → US3 → US4 → US5 → [ADR-0046 + US6a] → US6b → Polish
                   (0010) (0011) (0012) (0013) (0014)   (sem mig)      (0015)
```

- **Entre tickets: estritamente sequencial** (gate W3 verde + migration mergeada antes do próximo).
- **Dentro de um ticket**: tarefas `[P]` (arquivos distintos, sem dependência) podem ser paralelas — exceto a sequência domínio → schema → `db:generate` → mapper/borda, que é encadeada.

## Paralelismo (exemplos, sempre dentro de um ticket)

- US1: T005–T008 (W0 RED em arquivos de teste distintos) em paralelo; T011/T012 (Financier vs Collaborator domain) em paralelo após T009/T010.
- US2: T021/T022/T023 (W0) em paralelo; T024 (VOs) em paralelo entre si.
- US6b: T079/T080 (W0) em paralelo; T086 (grids) após o store/worker.

## MVP / entrega incremental

- **MVP**: US1 (banco/PIX) — destrava 2 formulários do front e consolida o VO. Entregável e testável sozinho.
- **Incremento de valor**: US2+US3 (cadastro completo), US5 (autocadastro), US4 (auditoria).
- **Maior risco por último**: US6a+US6b (cross-BC), atrás do ADR-0046.

## Validação de formato

Todas as tarefas seguem `- [ ] T### [P?] [US?] descrição + path`. Setup/Polish sem label de story; fases de US com label; `[P]` só onde há paralelismo real dentro do ticket.
