# PAR-ACT-ACORDO — Reescrever ACT: pessoa-física → Acordo de Cooperação Técnica

> **Origem:** épico `.claude/.planning/EPIC-PAR-ACT-ACORDO.md` (decisões D1–D4 resolvidas, 2026-06-10).
> **Módulo:** `partners` (`par_*`, ADR-0014). **Size:** L (vertical completa).

## Estratégia de execução (decisão P.O., 2026-06-10)

A reescrita é **acoplada**: mudar a forma do agregado (`domain/act/types.ts`) quebra o `tsc --noEmit`
em ~20 consumidores (application, adapters, public-api, testes). O gate W3 é **typecheck global**,
não escopável por pasta → fatiar por camada (A1…A5) **não fecha verde por fatia** numa reescrita de
forma. Por isso o épico é conduzido como **vertical única**:

- **Um ticket guarda-chuva** (`PAR-ACT-ACORDO`), branch única.
- **Commits por camada** (domínio → persistência → application → HTTP → export → contractor-view → seed)
  para revisão incremental e bisect.
- **Gate W3 global verde exigido só no fechamento.** As fases A1–A5 do épico viram etapas internas.

## Transformação (estado atual → alvo)

| Campo atual (pessoa-física)            | Destino                                                          |
| -------------------------------------- | --------------------------------------------------------------- |
| `cpf`                                  | **REMOVE** → `cnpj` institucional (`#src/shared/kernel/cnpj.ts`) |
| `employmentRelationship`               | **REMOVE**                                                      |
| `startOfContract` (Date)               | **REMOVE** → `validity: Period` (D2)                            |
| `registrationStatus`                   | **REMOVE** (conceito de Colaborador, não de Acordo — D4)        |
| `name`                                 | **MANTÉM** (objeto/título do acordo)                            |
| `email`                                | **MANTÉM** (contato)                                            |
| `occupationArea` (`PARC\|DDI\|DCE\|EPV`) | **MANTÉM**                                                     |
| `role`                                 | **RENOMEIA** → `legalRepresentative` (ponto de contato)         |
| —                                      | **NOVO** `actNumber` (VO branded, único — D1, fornecido)        |
| —                                      | **NOVO** `validity: Period` (`startDate`+`endDate` — D2)         |
| —                                      | **NOVO** `cnpj: Cnpj`                                            |
| —                                      | **NOVO** `corporateName: string` (razão social)                 |
| —                                      | **NOVO** `fantasyName: string` (nome fantasia/sigla)            |
| —                                      | **NOVO** `hasFinancialTransfer: boolean`                        |
| —                                      | **NOVO** `bankAccount?` / `pixKey?` (reusa `supplier/payment-target.ts`) |

**Fora do escopo (P.O.):** `globalValue` — removido do front, não criar.

## Decisões de implementação (engenheiro, dentro do escopo do épico)

- **`actNumber`** vira VO branded leve `domain/act/act-number.ts` (parse: trim + non-blank). Unicidade é
  do **repo** (unique index `act_number`), não do VO — espelha `Cnpj`/`SupplierId` (validação no VO,
  unicidade no port). Guard `register-act-number-duplicate` / `edit-act-number-duplicate` no use case.
- **`validity`** reusa `Period` (`#src/shared/kernel/period.ts`, kind `Fixed`), construído de dois
  `PlainDate` (input ISO `startDate`/`endDate`). Erros de `PlainDate`/`Period` propagam.
- **`payment-target`** reusa `BankAccount`/`PixKey`/`createBankAccount`/`createPixKey` de
  `domain/supplier/payment-target.ts` (autorizado pelo épico §3). Regra de repasse **condicional**.
- **Eventos** espelham o Supplier: `ActRegistered`/`ActEdited`/`ActDeactivated`/`ActReactivated`
  (sem outbox nesta fase — emitidos mas não publicados).
- **`legalRepresentative`** substitui `role` no domínio (EN semântico). Wire/DTO mapeia em A4. **Handoff
  ao front.**

## Critérios de aceitação

- **CA1** — `Act.register` cria Acordo **sem** `cpf`/`startOfContract`/`employmentRelationship`/
  `registrationStatus`; com `actNumber`, `cnpj`, `corporateName`, `fantasyName`, `validity`,
  `legalRepresentative`, `occupationArea`, `hasFinancialTransfer`.
- **CA2 (repasse)** — `hasFinancialTransfer = true` **sem** bankAccount **nem** pixKey →
  `act-payment-target-required`. `hasFinancialTransfer = false` → ambos opcionais (OK com ambos null).
- **CA3** — `actNumber` inválido (branco) → erro de VO; `cnpj` inválido → `invalid-cnpj`;
  `validity` com `endDate < startDate` → `period-end-before-start`.
- **CA4 (unicidade)** — registrar/editar com `actNumber` já existente → `*-act-number-duplicate`.
- **CA5 (HTTP)** — `POST/PUT /api/v1/acts` persiste o Acordo; cnpj inválido → 422; repasse sem target → 422;
  list item expõe `actNumber`/`corporateName`; filtros `hasFinancialTransfer` + `occupationArea` + busca.
- **CA6 (cross-módulo)** — ACT como **contratado** (`ContractorReadPort`) passa a expor documento = **CNPJ**
  (não CPF); `contractor-view.mapper` + `contractor-read.drizzle` atualizados; suíte de contracts verde.
- **CA7 (export)** — `act-csv` com campos do acordo (`actNumber`, `corporateName`, `cnpj`,
  `hasFinancialTransfer`, …); anti-CSV-injection mantido.
- **CA8 (migração — D3)** — schema `par_acts` recriado (drop `cpf`/`employment`/`start`/`registration`;
  add colunas do acordo); `seed-partners.ts` reescrito para acordos.

## Invariantes (herdadas)

- Domínio puro (sem throw/class/any; `Result<T,E>`; branded; exhaustive switch) — `.claude/rules/domain.md`.
- MySQL único, sem ENUM nativo (varchar+CHECK), sem JSON, sem AUTO_INCREMENT em PK de domínio — ADR-0020.
  `cnpj` em `varchar(14)`; `has_financial_transfer` em `tinyint`/CHECK; `act_number` UNIQUE.
- Cross-módulo só via `public-api/` — ADR-0006.
- W0 RED por camada antes de tocar `src/`; **W3 = typecheck + format + lint + test verdes (global, no fim)**.
