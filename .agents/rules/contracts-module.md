---
paths:
  - 'src/modules/contracts/**/*.ts'
  - 'tests/modules/contracts/**/*.ts'
---

# Módulo Contracts — mapa de camadas e regras de negócio

Aplicáveis ao módulo `src/modules/contracts/`.

## Estrutura

```
src/modules/contracts/
├── domain/                    # PURO. Sem infra. Result<T,E>, branded, Readonly.
│   ├── shared/                # VOs: Money, Period, ContractId, AmendmentId, DocumentId, UserRef, BucketName, StorageKey, StorageRef
│   ├── contract/              # Agregado Contract: types, events, errors, contract.ts (operações)
│   └── amendment/             # Agregado Amendment: types, events, errors, amendment.ts
├── application/
│   ├── ports/                 # type contracts: ContractRepository, AmendmentRepository, EventBus, DocumentStorage
│   └── use-cases/             # createContract, createAmendment, attachSignedDocument, homologateAmendment, getContract, listContracts
├── adapters/                  # Implementações concretas
│   ├── *.in-memory.ts         # Para testes
│   └── persistence/           # Drizzle/mysql2 (schema mysql, mappers, repos, driver, migrations)
├── cli/                       # CLI para P.O.
│   ├── main.ts, registry.ts, parse-flags.ts, parse-driver-flags.ts
│   ├── context.ts, state.ts   # Estado/persistência da CLI
│   ├── drivers/{memory,mysql}.ts
│   ├── commands/              # Um arquivo por subcomando
│   └── formatters/            # PT-BR para humanos
└── public-api/                # Contrato público para outros módulos (ADR-0006)
    ├── events.ts              # ContractsModuleEvent + decoder versionado v1 + isContractsModuleEvent
    └── index.ts               # Barrel — único ponto de import externo ao módulo
```

## Regras de negócio invariantes

- **Estado vigente do contrato** (`currentValue`, `currentPeriod`) é **derivado** de `originalValue/Period + Σ aditivos homologados`. Nunca editado diretamente. Operação canônica: `Contract.applyHomologatedAdjustment(contract, adjustment, at)`. Regra de negócio principal (RN-06, RN-07).
- **Aditivo** tem 4 kinds (`Addition`, `Suppression`, `TermChange`, `Misc`) e 2 status (`Pending`, `Homologated`). Homologação **exige** `signedDocumentRef` (RN-12). `homologate(amendment, by, at)` muda status; o use case `homologateAmendment` traduz o aditivo para `ContractAdjustment` (discriminated union para o domínio do Contract) e aplica no contrato.
- **Cross-module imports proibidos** em `domain/` e `application/`. Outros módulos consomem **exclusivamente** `contracts/public-api/` (ADR-0006).

## Fonte canônica

Eventos, commands e regras formais: [`handbook/domain_questions/contratos/`](../../handbook/domain_questions/contratos/) e [`handbook/domain/`](../../handbook/domain/).
