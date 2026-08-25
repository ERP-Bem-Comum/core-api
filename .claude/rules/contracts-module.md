---
paths:
  - 'src/modules/contracts/**/*.ts'
  - 'tests/modules/contracts/**/*.ts'
verify:
  - claim: 'o auto-expire só varre contrato Active — o filtro vive no repositório, não no domínio'
    root: 'src/modules/contracts/adapters/persistence/repos'
    pattern: "eq(schema.contracts.status, 'Active')"
    expect:
      - 'src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts'
  - claim: 'os cinco estados do Contract são cobrados pelo CHECK da tabela'
    root: 'src/modules/contracts/adapters/persistence/schemas'
    pattern: "IN ('Pending','Active','Expired','Terminated','Cancelled')"
    expect:
      - 'src/modules/contracts/adapters/persistence/schemas/mysql.ts'
---

Ciclo de vida de contrato e aditivo. Que outro módulo só alcance `contracts/public-api/` **já é cobrado** por `tests/cleanup/module-boundary.test.ts`; a pureza do domínio, por `domain-no-throw` e `domain-clock-injection`. Não repetir aqui. VOs transversais (`Money`, `NonZeroMoney`, `Period`, `PlainDate`, `UserRef`, `Cpf`, `Cnpj`) vivem em `src/shared/kernel/`, **não** em `domain/shared/` — este último guarda só os IDs do módulo. Regras formais: [`handbook/domain_questions/contratos/`](../../handbook/domain_questions/contratos/).

**Cinco estados** ([ADR-0023](../../handbook/architecture/adr/0023-contract-lifecycle-pending-state.md) + [ADR-0039](../../handbook/architecture/adr/0039-contract-cancelled-state.md)) — identificador em EN no código, termo PT só na borda, e a P.O. é a autoridade dos termos de UI:

| `status`     | Borda (PT)   | Saídas                                                          |
| ------------ | ------------ | --------------------------------------------------------------- |
| `Pending`    | Pendente     | → `Active` · → `Cancelled`                                       |
| `Active`     | Em Andamento | → `Active` (aditivo homologado) · → `Expired` · → `Terminated`   |
| `Expired`    | Finalizado   | terminal                                                         |
| `Terminated` | Distrato     | terminal                                                         |
| `Cancelled`  | Cancelado    | terminal                                                         |

- **`Cancelled` só é alcançável a partir de `Pending`** — é o descarte de rascunho. Contrato que já vigorou termina em `Expired` ou `Terminated`, **nunca** em `Cancelled`. Contrato nasce `Pending` (sem documento assinado) ou já `Active` (com documento + data).

- **O auto-expire não alcança tudo que a tabela sugere, e as duas exceções são invisíveis daqui.** Quem transiciona `Active → Expired` é um job **fora do módulo** (`src/jobs/contracts/sweeper/`, ADR-0041), e o `findExpirable` do repositório filtra `status = 'Active'` **e** `currentPeriodKind = 'Fixed'`. Duas consequências: contrato **`Pending` com vigência vencida fica preso em `Pending` para sempre** — é a issue [#426](https://github.com/ERP-Bem-Comum/core-api/issues/426), comportamento atual e não bug de escrita recente; e contrato `Active` de período **indefinido** nunca expira por varredura (`contractCannotExpireIndefinitePeriod`). ⚠️ Ler a tabela acima como "todo contrato vencido vira `Expired`" produz relatório que não bate com o banco.

- **O estado vigente é derivado, nunca editado.** `currentValue`/`currentPeriod` saem de `originalValue`/`originalPeriod` + Σ aditivos homologados (RN-06/RN-07). A operação canônica é `Contract.applyHomologatedAdjustment(contract, adjustment, at)`. Atribuir o valor corrente direto passa no compilador e **desalinha o contrato do seu histórico de aditivos**, sem nenhum erro no caminho.

- **`Amendment` são três variantes, não dois status — o discriminador é composto.** A union é `PendingWithoutDocument` | `PendingWithDocument` | `Homologated`: o `status` (`Pending`/`Homologated`) sozinho não narrowa, porque `Pending` se subdivide pela **presença de `signedDocumentRef`**. É esse desenho que faz a RN-12 (homologar exige documento assinado) ser cobrada **em compile time** em vez de por `if` — `homologate` não aceita a variante sem documento. Os quatro `kind` (`Addition`, `Suppression`, `TermChange`, `Misc`) são ortogonais ao status; o use case `homologateAmendment` traduz o aditivo para `ContractAdjustment` antes de aplicar no contrato.
