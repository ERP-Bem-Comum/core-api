# W1 — Implementação · CTR-CONTRACT-CONTRACTOR-REF

> **Wave:** W1 · **Skill:** `ts-domain-modeler` (+ schema/migration Drizzle, CLI) · **Resultado:** **GREEN** · **Data:** 2026-06-02

## Decisão tomada (resolvia em W0/W1)

**Obrigatoriedade + migration:** **Opção A — NOT NULL** (invariante forte). O projeto não tem dado de produção de contratos a preservar nesta fase; a migration aplica limpa em base nova. `contractor_type`/`contractor_id` são `NOT NULL`. Backfill de linhas legadas: não aplicável (sem dados); registrado como responsabilidade de quem migrar uma base populada.

## Implementação (inside-out)

### Domínio
- **`domain/shared/contractor-ref.ts`** (novo) — VO `ContractorRef` discriminated union (`Supplier|Financier|Collaborator`) sobre os branded refs de `partners/public-api/refs.ts` (ADR-0006/0014). Smart constructor `rehydrate({type,id})` → `Result<ContractorRef, ContractorRefError>`. Erros: `'contractor-ref-invalid-type'` (type) e `'partner-ref-invalid'` (id, propagado do ref de Parceiros). `immutable()` no valor.
- **`domain/contract/types.ts`** — `contractorRef: ContractorRef` em `ContractRegistration` (presente em todas as variantes, incl. `Pending`); adicionado a `CreateContractInput`, `CreatePendingContractInput` e à lista `ContractImmutableField`.
- **`domain/contract/contract.ts`** — threading em `create` e `createPending` (literais imutáveis); `activate` preserva via spread.

### Persistência
- **`adapters/persistence/schemas/mysql.ts`** — colunas `contractor_type` (varchar(16)) + `contractor_id` (varchar(36)), ambas `NOT NULL`; CHECK `ctr_contracts_contractor_type_chk IN ('Supplier','Financier','Collaborator')` (ENUM nativo banido — ADR-0020).
- **`adapters/persistence/mappers/contract.mapper.ts`** — `contractToInsert` grava as colunas (ambos os ramos); `contractFromRow` reidrata via `ContractorRef.rehydrate`; nova variante de erro `ContractMapperInvalidContractorType` (Padrão D, payload de evidência).
- **Migration `0007_violet_sandman.sql`** — `db:generate` + hardening manual: `COLLATE utf8mb4_bin` no `contractor_id` (UUID), conforme nota normativa do schema.

### Application / Adapters / CLI
- **`create-contract.ts`** / **`create-pending-contract.ts`** — commands ganham `contractorType`/`contractorId`; reidratam via `ContractorRef.rehydrate` (erro propagado no `Result`). `BuildContractError`/`CreatePendingContractError` incluem `ContractorRefError`.
- **`adapters/http/`** — `createContractBodySchema` ganha `contractorType`/`contractorId` (string crua → 422 no domínio, espelhando datas/valores); handler `POST /contracts` repassa.
- **`cli/commands/criar-contrato.ts`** — flags obrigatórias `--contratado-tipo` + `--contratado-id` (CA6), com help PT-BR.
- **`import-contracts.ts`** / **`cli/import-parser.ts`** — colunas opcionais `contratado_tipo`/`contratado_id` no row legado; ausência → falha alta e clara da linha (resolução CNPJ→partner ref fica fora de escopo, declarado no request).

## Blast radius (campo obrigatório → CA2)

Tornar `contractorRef` obrigatório exigiu threading em **todos** os callers de `create`/`createPending`: 3 use cases, HTTP plugin+schema, CLI, import legado + **~16 arquivos de teste/fixtures** (fixture central `fixtures.ts` + builders locais + bodies HTTP + args CLI E2E + CSV/JSON de import). Tudo atualizado para fornecer um contratado válido.

## Cobertura de CAs

| CA | Status | Evidência |
| :--- | :--- | :--- |
| CA1 (VO rehydrate type+id) | ✅ | `contractor-ref.test.ts` GREEN |
| CA2 (campo em todas as variantes; omitir = erro de compilação) | ✅ | `contractor-ref-on-contract.test.ts` + typecheck exige o campo |
| CA3 (round-trip + rejeita type/id inválido) | ✅ | `contract-contractor.mapper.test.ts` GREEN |
| CA4 (isolamento ADR-0006/0014) | ✅ | VO importa só `partners/public-api/refs.ts`; lint verde |
| CA5 (migration limpa) | ✅ | `0007_*.sql` (+ COLLATE utf8mb4_bin manual) |
| CA6 (CLI aceita contratado) | ✅ | flags `--contratado-tipo`/`--contratado-id`; CLI E2E GREEN |
| CA7 (integração gated round-trip) | ✅ | asserção `deepEqual(got.contractorRef, c.contractorRef)` na `contract-repository.suite.ts` (in-memory no `pnpm test`; MySQL real sob `MYSQL_INTEGRATION=1`) |

## Gate (prévia W3 — todos verdes)

```
typecheck     → tsc --noEmit OK
format:check  → All matched files use Prettier code style!
lint          → eslint . OK
test          → tests 2008 · pass 1991 · fail 0 · skipped 17
```

## Próximo passo

W2 (`code-reviewer`, read-only): foco em isolamento (CA4 — import só via public-api), invariante (CA2), e o refinamento de erro da CA1 (`-invalid-type` vs `partner-ref-invalid`) registrado no W0 para confirmação.
