# W0 — Testes RED · CTR-CONTRACT-CONTRACTOR-REF

> **Wave:** W0 · **Skill:** `ts-domain-modeler` · **Resultado:** **RED** (esperado) · **Data:** 2026-06-02

## Objetivo

Travar, via testes que falham por inexistência de API, o contrato do vínculo do contratado no agregado `Contract` — cobrindo CA1 (VO `ContractorRef`), CA2 (campo no agregado em todas as variantes) e CA3 (mapper de persistência).

## Arquivos criados (RED)

| Arquivo | CA | Falha por |
| :--- | :--- | :--- |
| `tests/modules/contracts/domain/shared/contractor-ref.test.ts` | CA1 | Load — `contractor-ref.ts` não existe |
| `tests/modules/contracts/domain/contract/contractor-ref-on-contract.test.ts` | CA2 | Load — mesmo import + campo `contractorRef` ausente do agregado |
| `tests/modules/contracts/adapters/persistence/mappers/contract-contractor.mapper.test.ts` | CA3 | Asserção — `contractFromRow` ignora colunas `contractor_*` |

## API projetada (a ser implementada no W1)

**1. VO `ContractorRef`** — `src/modules/contracts/domain/shared/contractor-ref.ts` (Padrão D, module-as-namespace):

```ts
export type ContractorType = 'Supplier' | 'Financier' | 'Collaborator';
export type ContractorRef =
  | Readonly<{ type: 'Supplier';      id: SupplierRef }>
  | Readonly<{ type: 'Financier';     id: FinancierRef }>
  | Readonly<{ type: 'Collaborator';  id: CollaboratorRef }>;
export type ContractorRefError = 'contractor-ref-invalid-type' | 'partner-ref-invalid';
export const rehydrate = (input: Readonly<{ type: string; id: string }>): Result<ContractorRef, ContractorRefError>;
```

- `SupplierRef`/`FinancierRef`/`CollaboratorRef` importados **só** de `#src/modules/partners/public-api/refs.ts` (ADR-0006/0014 — isolamento; CA4).
- `rehydrate` valida `type` ∈ {Supplier,Financier,Collaborator} (senão `'contractor-ref-invalid-type'`) e delega o `id` ao `*Ref.rehydrate` correspondente (erro `'partner-ref-invalid'` propagado).

> **Refinamento de CA1:** o request esboçou um único literal `'contractor-ref-invalid'`. O W0 distingue as **duas** falhas reais (tipo inválido vs id malformado) em variantes precisas — melhor UX de erro e narrowing. Atualizar a CA1 do `000-request.md` na revisão do W2, ou confirmar antes.

**2. Campo no agregado** — `contractorRef: ContractorRef` em `ContractRegistration` (`domain/contract/types.ts`), logo presente em `Pending`/`Active`/`Expired`/`Terminated`. Adicionar a `CreateContractInput` + `CreatePendingContractInput` e threading em `Contract.create`/`Contract.createPending`. Omitir o campo na criação deve virar **erro de compilação** (CA2).

**3. Mapper + schema** — colunas `contractor_type` (varchar, CHECK `IN ('Supplier','Financier','Collaborator')`, sem ENUM nativo — ADR-0020) e `contractor_id` (`varchar(36)` UUID — ADR-0018). `contractFromRow` reidrata via `ContractorRef.rehydrate`; nova variante de erro `ContractMapperInvalidContractorType` (Padrão D, payload de evidência). `contractToInsert` grava as colunas. **Migration** Drizzle Kit.

## Saída do runner (RED)

```
ℹ tests 5
ℹ suites 2
ℹ pass 0
ℹ fail 5
ℹ skipped 0
```

(Os 2 arquivos de domínio falham no load — import de módulo inexistente conta como 1 teste-arquivo falho cada; o arquivo de mapper carrega e falha nas 3 asserções porque o mapper atual ignora as colunas do contratado.)

Comando:

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/contracts/domain/shared/contractor-ref.test.ts \
  tests/modules/contracts/domain/contract/contractor-ref-on-contract.test.ts \
  tests/modules/contracts/adapters/persistence/mappers/contract-contractor.mapper.test.ts
```

## Fora deste W0 (deferido para W1)

- **CA6 (CLI)** e **CA7 (integração gated `MYSQL_INTEGRATION=1`)** — testes adicionados junto da implementação no W1 (a integração exige o schema + migration já existentes). Documentado para não falsear o RED como cobertura total.

## Checklist de auto-revisão (ts-domain-modeler)

- [x] Zero `throw` em código de produção projetado (domínio retorna `Result`).
- [x] VO via smart constructor retornando `Result<T, E>`; erro como string literal union.
- [x] Discriminated union (`type` discriminador) sobre branded refs de Parceiros.
- [x] Isolamento: refs só via `partners/public-api/refs.ts` (CA4) — sem import de `partners/domain|application`.
- [x] Imports com `.ts` + `import type` para tipos puros; `#src/*` nos testes.
- [x] RED comprovado (0 pass / 5 fail).

## Próximo passo

W1 (`ts-domain-modeler` + `drizzle-schema-author`): implementar o VO, o campo no agregado, o mapper, as colunas + migration e a CLI até GREEN.
