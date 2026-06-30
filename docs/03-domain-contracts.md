# 03 — Domínio Contratos

> Fonte de verdade: [`src/modules/contracts/domain/`](../src/modules/contracts/domain/) (código) +
> [`handbook/domain_questions/contratos/`](../handbook/domain_questions/contratos/) e
> [`handbook/domain/`](../handbook/domain/) (especificação formal, RN numeradas). Este doc consolida.

## 1. Agregados

O módulo tem três agregados, todos modelados como **discriminated unions imutáveis** com smart
constructors retornando `Result<T,E>` (domínio puro — ver [01](./01-architecture.md) §2):

- **Contract** — o contrato em si.
- **Amendment** (aditivo) — alteração formal a um contrato vigente.
- **ContractDocument** — documento anexado a um contrato ou aditivo.

E o read-model **Timeline** (projeção, ADR-0022), derivado do stream de eventos.

## 2. Contract — 4 estados (ADR-0023)

```
Pending ──activate──▶ Active ──expire────▶ Expired   (terminal)
                        │
                        └──terminate─────▶ Terminated (terminal)
```

| Estado       | Significado                         | Campos                                             |
| :----------- | :---------------------------------- | :------------------------------------------------- |
| `Pending`    | cadastrado, sem assinatura/vigência | só cadastro (`originalValue`, `originalPeriod`, …) |
| `Active`     | vigente (assinado)                  | + `signedAt`, `currentValue`, `currentPeriod`      |
| `Expired`    | encerrado por fim de período        | + `endedAt`                                        |
| `Terminated` | encerrado por rescisão              | + `endedAt`                                        |

**Regra central (RN-06/RN-07):** o **estado vigente** (`currentValue`, `currentPeriod`) é **derivado** de
`originalValue/Period + Σ aditivos homologados` — **nunca** editado direto. Operação canônica:
`Contract.applyHomologatedAdjustment(contract, adjustment, at)`.

**RN-CV (ciclo de vida):** `activate` exige um documento `signed_contract` Active vinculado (RN-CV-02) e só
atua sobre `Pending` (RN-CV-01); aditivo só em contrato `Active` (RN-CV-01/R3). `sequentialNumber` tem
formato `NNN/AAAA` e é único (R4).

Tipos: [`domain/contract/types.ts`](../src/modules/contracts/domain/contract/types.ts) ·
errors: [`contract/errors.ts`](../src/modules/contracts/domain/contract/errors.ts) (tagged unions PascalCase).

## 3. Amendment (aditivo)

Eixo **kind** (independente do status — aninhamento, não cross-product):

| kind          | payload                                                             |
| :------------ | :------------------------------------------------------------------ |
| `Addition`    | `impactValue: NonZeroMoney` (acréscimo)                             |
| `Suppression` | `impactValue: NonZeroMoney` (supressão; não excede o valor vigente) |
| `TermChange`  | `newEndDate: PlainDate` (prorrogação; deve estender)                |
| `Misc`        | — (sem impacto financeiro/prazo)                                    |

Eixo **status** (refinado por tipo):

```
PendingWithoutDocument ──attachSignedDocument──▶ PendingWithDocument ──homologate──▶ Homologated
```

**RN-12:** homologar **exige** `signedDocumentRef` (só `PendingWithDocument` homologa — garantido pelo
tipo). O use case `homologateAmendment` traduz o aditivo em `ContractAdjustment` e aplica no contrato
(RN-06/07). Tipos: [`domain/amendment/types.ts`](../src/modules/contracts/domain/amendment/types.ts).

## 4. ContractDocument

Vínculo polimórfico (`parentType: Contract | Amendment`), 8 categorias canônicas
(`signed_contract`, `signed_amendment`, `opinion`, `certificate`, `justification`,
`technical_attachment`, `publication`, `other`), status `Active | LogicallyDeleted | Superseded`. Carrega
hash SHA-256, bucket, storageKey, versão (RN-AS-01/02). Os **bytes** ficam no S3/MinIO (ADR-0019); o MySQL
guarda só metadados. Tipos: [`domain/document/types.ts`](../src/modules/contracts/domain/document/types.ts).

## 5. Value Objects (kernel + shared)

`Money` (bigint cents), `NonZeroMoney`, `Period` (`Fixed` start/end | `Indefinite` start), `PlainDate`,
`ContractId`/`AmendmentId`/`DocumentId` (UUID branded), `UserRef`, `BucketName`, `StorageKey`. Todos com
smart constructor + `Result`. Ver [`domain/shared/`](../src/modules/contracts/domain/shared/) e
[`src/shared/kernel/`](../src/shared/kernel/).

## 6. Use cases (application)

[`application/use-cases/`](../src/modules/contracts/application/use-cases/): `createPendingContract`,
`createContract`, `activateContract`, `endContract`, `createAmendment`, `homologateAmendment`,
`uploadDocument`, `attachSignedDocument`, `supersedeDocument`, `deleteDocument`, `getContract`,
`getContractTimeline`, `listContracts`, `importContracts`. Cada um é factory `(deps) => (cmd) =>
Promise<Result<O,E>>` (ports como deps).

## 7. Eventos & Outbox (ADR-0015)

Eventos de domínio em **EN passado** (`ContractCreated`, `ContractActivated`, `AmendmentCreated`,
`AmendmentHomologated`, `ContractDocumentUploaded`, …). Persistidos **atomicamente** com o estado via
`repo.save(aggregate, events)` — o adapter Drizzle grava agregado + outbox na mesma transação MySQL. O
worker de outbox publica cross-módulo. Contrato público: `contracts/public-api/events.ts` (decoder
versionado v1). Ver [`handbook/architecture/adr/0015-mysql-outbox-pattern.md`](../handbook/architecture/adr/0015-mysql-outbox-pattern.md).

> ⚠️ **Limitação MVP conhecida** (débito registrado): `homologateAmendment` e o upload+attach de documento
> fazem 2 saves sequenciais sem atomicidade distribuída — ver
> [`.claude/.planning/HOMOLOGATE-DISTRIBUTED-ATOMICITY.md`](../.claude/.planning/HOMOLOGATE-DISTRIBUTED-ATOMICITY.md).

## 8. RN formais (numeradas)

As regras de negócio numeradas (RN-06, RN-07, RN-12, RN-CV-_, RN-AS-_, R3, R4, …) têm texto normativo em
[`handbook/domain_questions/contratos/`](../handbook/domain_questions/contratos/) (especificacao-dominio.md
e os `*-context.md`) e [`handbook/domain/`](../handbook/domain/). **Abrir a fonte** para o texto literal —
este doc resume para orientação.
