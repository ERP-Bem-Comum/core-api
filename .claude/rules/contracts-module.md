---
paths:
  - "src/modules/contracts/**/*.ts"
  - "tests/modules/contracts/**/*.ts"
---

# Módulo Contracts — mapa de camadas e regras de negócio

Aplicáveis ao módulo `src/modules/contracts/`.

## Estrutura

```
src/modules/contracts/
├── domain/                    # PURO. Sem infra. Result<T,E>, branded, Readonly.
│   ├── shared/                # IDs do módulo: ContractId, AmendmentId, DocumentId, Contractor
│   ├── contract/              # Agregado Contract: types, events, errors, repository, sequential-number, contract.ts (operações)
│   ├── amendment/             # Agregado Amendment: types, events, errors, repository, amendment-number, amendment.ts
│   ├── document/              # Agregado Document: types, events, errors, repository, document.ts
│   └── timeline/              # Projeção de linha do tempo: types, repository, projection.ts
├── application/
│   ├── ports/                 # type contracts: EventBus, Outbox, EventDelivery, DocumentStorage, *-read
│   └── use-cases/             # createContract, createAmendment, attachSignedDocument, homologateAmendment, uploadDocument, getContractTimeline, importContracts, listContracts…
├── adapters/                  # Implementações concretas
│   ├── http/                  # Borda Fastify: plugin, schemas (Zod), DTOs, composition
│   ├── persistence/           # Drizzle/mysql2: schemas, mappers, repos (`*.drizzle.ts` + `*.in-memory.ts`), drivers, migrations
│   ├── storage/               # DocumentStorage: S3/Magalu (`*.s3.ts`) + `*.in-memory.ts`
│   ├── outbox/                # Outbox in-memory (o drizzle vive em persistence/repos)
│   └── event-delivery/        # Entrega de eventos: logger, in-memory, timeline-projection
├── worker/                    # Worker do outbox: config, outbox-worker, run
└── public-api/                # Contrato público para outros módulos (ADR-0006)
    ├── events.ts              # ContractsModuleEvent + decoder versionado v1 + isContractsModuleEvent
    ├── http.ts, migrate.ts, permissions.ts, read.ts
    └── index.ts               # Barrel — um dos pontos de entrada, não o único (ver `public-api.md`)
```

> VOs transversais (`Money`, `NonZeroMoney`, `Period`, `PlainDate`, `UserRef`, `Cpf`, `Cnpj`) vivem em [`src/shared/kernel/`](../../src/shared/kernel/), não em `domain/shared/`. A CLI embutida foi retirada (ADR-0037) — a UX primária é a borda HTTP em `adapters/http/`.

## Máquina de estado do `Contract` — 5 estados ([ADR-0023](../../handbook/architecture/adr/0023-contract-lifecycle-pending-state.md) + [ADR-0039](../../handbook/architecture/adr/0039-contract-cancelled-state.md))

| `status` (código EN) | Termo de negócio (PT, borda) | Transições de saída          |
| -------------------- | ---------------------------- | ---------------------------- |
| `Pending`            | Pendente                     | → `Active` · → `Cancelled`   |
| `Active`             | Em Andamento                 | → `Active` (aditivo homologado) · → `Expired` · → `Terminated` |
| `Expired`            | Finalizado                   | terminal                     |
| `Terminated`         | Distrato                     | terminal                     |
| `Cancelled`          | Cancelado                    | terminal                     |

- Contrato nasce `Pending` (sem documento assinado) ou já `Active` (com documento assinado + data).
- **`Cancelled` só é alcançável a partir de `Pending`** — é o descarte de rascunho. Contrato que já vigorou termina em `Expired` ou `Terminated`, nunca em `Cancelled`.
- Identificador em **EN** no código; termo PT só na borda. A P.O. é a autoridade dos termos de UI.

## Regras de negócio invariantes

- **Estado vigente do contrato** (`currentValue`, `currentPeriod`) é **derivado** de `originalValue/Period + Σ aditivos homologados`. Nunca editado diretamente. Operação canônica: `Contract.applyHomologatedAdjustment(contract, adjustment, at)`. Regra de negócio principal (RN-06, RN-07).
- **Aditivo** tem 4 kinds (`Addition`, `Suppression`, `TermChange`, `Misc`) e 2 status (`Pending`, `Homologated`). Homologação **exige** `signedDocumentRef` (RN-12). `homologate(amendment, by, at)` muda status; o use case `homologateAmendment` traduz o aditivo para `ContractAdjustment` (discriminated union para o domínio do Contract) e aplica no contrato.
- **Cross-module imports proibidos** em `domain/` e `application/`. Outros módulos consomem **exclusivamente** `contracts/public-api/` (ADR-0006).

## Fonte canônica

Eventos, commands e regras formais: [`handbook/domain_questions/contratos/`](../../handbook/domain_questions/contratos/) e [`handbook/domain/`](../../handbook/domain/).
