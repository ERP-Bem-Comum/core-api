# Implementation Plan: Expiração automática de contratos ao fim da vigência

**Branch**: `feat/backlog-residual-sdd` | **Date**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-contract-auto-expire/spec.md`

## Summary

Operacionalizar a transição **Active → Expired** que hoje só dispara manualmente. Abordagem: um **sweep
agendado** hospedado no **worker de outbox existente** (`worker/run.ts`) que, em cada tick, busca os
contratos elegíveis (Active, vigência `Fixed`, `current_period_end < hoje_BRT`) e aplica a transição de
domínio **`Contract.expire`** já existente, persistindo o estado **e** o evento `ContractExpired` na mesma
transação (via `contractRepo.save(contract, [event])` — ADR-0015). Borda D+1 calculada no fuso de Brasília
(UTC-3 fixo). Sem novo agregado, sem novo evento, sem mudança no fluxo manual `/end {Expire}`.

## Technical Context

**Language/Version**: TypeScript 6 / Node.js 24 LTS (ESM, NodeNext)

**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4); `node:test`; outbox worker existente

**Storage**: MySQL 8.4 (`ctr_*`), colunas já existentes de `ctr_contracts` (`status`,
`current_period_kind`, `current_period_end` — `date`)

**Testing**: `node:test` (unit + repo in-memory); integração real via `pnpm run test:integration`

**Target Platform**: processo Node (worker de outbox, foreground/daemon)

**Project Type**: modular monolith (backend), módulo `contracts`

**Performance Goals**: sweep = **1 SELECT** indexável por tick (`WHERE status='Active' AND
current_period_kind='Fixed' AND current_period_end < :cutoff`); finalização em lote sem N+1

**Constraints**: domínio puro (`Result<T,E>`, sem throw); idempotência; isolamento de falha por contrato;
sem mudar o fluxo manual de encerramento

**Scale/Scope**: volume modesto (contratos vencendo por dia); cadência day-granular → tick horário é folgado

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                         | Status     | Nota                                                                                                                                                                                                                                                                                    |
| --------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                      | ✅         | W0 RED primeiro (use case + cutoff + repo); ver "Estimativa de Pipeline"                                                                                                                                                                                                                |
| II. Regressão zero                | ✅         | gate W3 ao fim (`/speckit-verify`)                                                                                                                                                                                                                                                      |
| III. pnpm                         | ✅         | sem npm                                                                                                                                                                                                                                                                                 |
| IV. Modular Monolith / isolamento | ✅         | **single BC** `contracts` (`ctr_*`); nenhuma leitura cruzada; evento via outbox (ADR-0015)                                                                                                                                                                                              |
| V. Domínio puro                   | ✅         | reusa `Contract.expire` (já puro); use case orquestra; nenhuma regra nova no domínio                                                                                                                                                                                                    |
| VI. MySQL único + Drizzle         | ✅         | **sem migration** (usa colunas existentes); índice opcional de perf decidido em tasks                                                                                                                                                                                                   |
| VII. HTTP-first / CLI aposentada  | ✅         | sem novo subcomando CLI; processo de fundo no worker; **sem** nova rota HTTP pública                                                                                                                                                                                                    |
| VIII. TS strict + idioma          | ✅         | EN no código, PT em docs/commits                                                                                                                                                                                                                                                        |
| IX. Decisões ancoradas (ACDG)     | ⚠️ parcial | decisões-chave (sweep vs. derivação; D+1; reuso do outbox) ancoradas no **ticket + Clarifications + ADR-0015/0023 + código de domínio existente**. Citação literal de livro via MCP `acdg-skills` **deferida** (MCP pode estar indisponível neste ambiente) — sem violação de stack/ADR |

**Resultado**: PASS (sem violações que exijam "Complexity Tracking"). Nenhum 5º módulo, classe no domínio,
JSON nativo, Redis/Kafka.

## Project Structure

### Documentation (this feature)

```text
specs/009-contract-auto-expire/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 (decisões técnicas)
├── data-model.md        # Phase 1 (entidades/predicado de elegibilidade)
├── quickstart.md        # Phase 1 (como rodar/validar)
├── contracts/           # Phase 1 (contratos de port/use case)
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/modules/contracts/
├── domain/contract/
│   └── repository.ts                      # + findExpirable(cutoff) no port ContractRepository
├── application/
│   └── use-cases/
│       └── expire-due-contracts.ts        # NOVO use case (batch sweep)
├── adapters/persistence/repos/
│   ├── contract-repository.drizzle.ts     # + findExpirable (SELECT WHERE …)
│   └── contract-repository.in-memory.ts   # + findExpirable (filtro)
└── worker/
    ├── expire-scheduler.ts                # NOVO tick periódico (chama o use case)
    ├── run.ts                             # wira ContractRepository drizzle + agenda o tick
    └── config.ts                          # + CONTRACTS_EXPIRE_SWEEP_MS (cadência)

src/shared/kernel/
└── plain-date.ts                          # + helper de data-corrente no fuso (UTC-3)  [ou util local]

tests/modules/contracts/
├── application/use-cases/expire-due-contracts.test.ts   # W0 RED — use case
├── domain/shared/plain-date-saopaulo.test.ts            # W0 RED — cutoff BRT (boundary)
├── adapters/persistence/repos/contract-repository.expirable.test.ts  # in-memory
└── worker/expire-scheduler.test.ts                      # tick (unit, sem timers reais)
```

**Structure Decision**: módulo `contracts` apenas. O **único acoplamento novo** é o worker passar a wirar
um `ContractRepository` Drizzle (além do outbox repo) sobre o **mesmo pool**, para rodar o sweep.

## Complexity Tracking

> Sem violações de constituição — seção vazia.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] **nenhuma** (usa `status`/`current_period_kind`/`current_period_end` já
  existentes). Índice de performance `(status, current_period_end)` é **opcional** — se adotado, vira
  migration via `pnpm run db:generate` e decisão em `tasks.md` (não bloqueia correção).
- **Prefixo de isolamento**: `ctr_*` — OK (ADR-0014).
- **Outbox**: **não** há evento novo — reaproveita `ContractExpired`, já inserido em `core.outbox` pelo
  `save(contract, [event])` existente.
- **Restrições MySQL 8 (ADR-0020)**: respeitadas (sem JSON/trigger/proc/ENUM).

## Contrato HTTP (Fase 2+)

**N/A** — feature é processo de fundo (worker). Nenhuma rota nova. (Uma rota operacional de disparo manual
do sweep é possível no futuro, mas **fora do escopo** deste plano.)

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **M** (1 use case + 1 método de port em 2 adapters + 1 helper de data + tick no worker;
  sem schema, sem evento novo, sem borda HTTP).
- **Justificativa**: reusa a transição de domínio e o mecanismo de outbox existentes; o novo código é
  orquestração + query + agendamento.
- **Plano de testes W0 (RED)**:
  1. `expire-due-contracts.test.ts`: contrato Active+Fixed com `end < hoje_BRT` → Expired + evento; Pending/
     Terminated/Cancelled/Indefinite/`end >= cutoff` → intactos; 2ª execução → no-op (idempotência);
     falha de `save` em um contrato não impede os demais (isolamento) + contagem.
  2. `plain-date-saopaulo.test.ts`: data-corrente em UTC-3 — boundary à meia-noite (ex.: `2026-06-11T02:00Z`
     → `2026-06-10` em BRT; `2026-06-11T04:00Z` → `2026-06-11`).
  3. `contract-repository.expirable.test.ts`: `findExpirable(cutoff)` retorna só Active+Fixed+`end<cutoff`.
  4. `expire-scheduler.test.ts`: o tick chama o use case e loga a contagem; aborta com o `AbortSignal`.
