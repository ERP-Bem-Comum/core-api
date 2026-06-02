# PARTNERS-SUPPLIER-CSV — Export CSV da listagem de fornecedores

> **Size:** S · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 3)
> **Depende de:** `CORE-CSV-SHARED-UTIL` (mecânica de escape compartilhada) — ver [`.claude/.planning/EXPORT-ABSTRACTION-DESIGN.md`](../../.planning/EXPORT-ABSTRACTION-DESIGN.md).

## Contexto

Export do legado `GET /suppliers/csv`. **Achatamento concreto** do agregado `Supplier` em linhas
planas + serialização via o util compartilhado `src/shared/utils/csv.ts` (`toCsv`/`escapeCsvCell`,
entregue por `CORE-CSV-SHARED-UTIL`). **Não reimplementar** a mecânica de escape — consumir o util
(ADR-0006 proíbe import de `contracts/adapters/`; a regra anti-fórmula é security MUST e vive num
lugar só).

O módulo `partners` ainda não tem borda HTTP nem CLI (Fase 2+ exige ADR Fastify), então o CSV nasce
como **adapter de apresentação puro**, reusável por uma futura rota/CLI sem refactor. Sem port, sem
use case — transformação determinística sobre `readonly Supplier[]`.

## Escopo (`src/modules/partners/adapters/export/supplier-csv.ts`)

1. `suppliersToCsv(suppliers: readonly Supplier[]): string` — função pura.
2. **Projeção concreta** `supplierToCells(s: Supplier): readonly string[]` — switch exaustivo por
   `status` (Active/Inactive), achata em colunas de ordem fixa.
3. **Colunas em ordem fixa:**
   `id`, `name`, `email`, `cnpj`, `corporateName`, `fantasyName`, `serviceCategory`,
   `status`, `bankAccountBank`, `bankAccountAgency`, `bankAccountNumber`, `bankAccountCheckDigit`,
   `pixKeyType`, `pixKey`, `deactivatedAt`.
4. **Payment target achatado (discriminado):** colunas de `bankAccount` vazias quando `null`; idem
   `pixKey` (`pixKeyType`←`pixKey.keyType`, `pixKey`←`pixKey.key`). `deactivatedAt` só preenchido
   para `InactiveSupplier` (ISO 8601 via `.toISOString()`), vazio em `Active`.
5. `cnpj` serializado via o valor já normalizado do VO (`String(supplier.cnpj)` — branded string).
6. **Serialização:** delegar a `toCsv(HEADER, suppliers.map(supplierToCells))` do util compartilhado.
   Zero mecânica de escape local.

## Fora de escopo

- Rota HTTP / CLI / driver mysql; import CSV; `/data` e `/timeline/csv` (são do collaborator).
- Paginação/filtros (a query `listSuppliers` já entrega a coleção).
- Qualquer reimplementação de escape/BOM/RFC 4180 (vem de `CORE-CSV-SHARED-UTIL`).

## Critérios de aceite

- [ ] `suppliersToCsv([])` retorna BOM + linha de header + `\r\n` (sem linhas de dados).
- [ ] Supplier Active com `bankAccount` preenche as 4 colunas bancárias e deixa pix/`deactivatedAt` vazias.
- [ ] Supplier Active com `pixKey` preenche `pixKeyType`/`pixKey` e deixa bancárias vazias.
- [ ] Supplier Inactive preenche `deactivatedAt` (ISO) e `status=Inactive`.
- [ ] Anti-fórmula e RFC 4180 **herdados do util** (não re-testar a mecânica aqui; testar que um nome
      com vírgula/`=` no Supplier sai corretamente no CSV final — teste de integração da projeção).
- [ ] Header e ordem de colunas estáveis; cada linha termina em `\r\n`.
- [ ] `supplier-csv.ts` **não** declara escape/BOM/separador próprios — importa de `#src/shared/utils/csv.ts`.
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de `src/`. Função pura, determinística (sem `Clock`/IO). Erros: N/A (entrada já é
  domínio válido, sem `Result`).
- Código EN; consome `#src/shared/utils/csv.ts` (não reinventar). Sem JSON.
- O achatamento por `status` é o único conhecimento de domínio aqui — switch exaustivo, sem `default`.
