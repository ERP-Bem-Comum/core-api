# FIN-RECON-EXPORT-CSV-NIBO — export CSV no layout Nibo (#146)

**Issue:** [#146](https://github.com/ERP-Bem-Comum/core-api/issues/146) (sp:3, mas escopo real **L**) · **Milestone:** Go-Live Op-2 · **Branch:** `feat/146-recon-export-nibo`
**🎯 Goal:** exportar a conciliação de um período no **layout de Importação em Lotes do Nibo** (15 colunas, cabeçalho idêntico, reimportável).

## Arquitetura (sem acoplamento — pesquisa ADR + EXPORT-ABSTRACTION-DESIGN)

Regra do `EXPORT-ABSTRACTION-DESIGN`: **serialização = util puro + adapter; projeção concreta por módulo; port no application; cross-módulo só por public-api (ADR-0006)**. Aplicado:

1. **Novo formato `'csv-nibo'`** no `ReconciliationExportFormat` (port) — 3º formato do MESMO exporter (`adapters/export/reconciliation-exporter.ts`). Serializador **puro** `toNiboCsv(data)` consumindo `src/shared/utils/csv.ts` (`toCsv`, BOM, anti-injeção). **Sem** framework genérico (YAGNI — Rule of Three: ofx/csv/csv-nibo são variantes concretas).
2. **Enriquecimento no use-case** `export-reconciliation.ts` (application), via **ports JÁ EXISTENTES** (zero novo acoplamento):
   - `getTransactionReconciliation` → tipo da conciliação + títulos (items) + `manualEntry` + `difference`.
   - `findDocumentById` → `categoryRef`/`costCenterRef`/`competencia`/`dueDate`/`documentNumber`/`payeeKind`/`supplier`.
   - `listCategories` / `listCostCenters` → resolve ref → **nome** (read-models de referência).
   - `supplierViewStore.findByRef` (read-model local `fin_supplier_view`) → **nome do favorecido** (sem cross-módulo runtime — ADR-0022/0045).
   - A enriquecimento monta um tipo plano `NiboExportRow[]` que vai para o serializador puro.
3. **Domínio intocado.** Nenhuma lógica de Nibo em `domain/`. A composição/IO é da borda/app (ADR-0032 espírito: visão composta na borda, transitória).

> O `ReconciliationExportData` atual (`{ debitAccountRef, period, transactions }`) é insuficiente. Opção: o use-case pré-computa `NiboExportRow[]` e o exporter ganha um overload/branch `csv-nibo` que recebe esses rows (mantendo `ofx`/`csv` no caminho atual). Manter o exporter **puro** (recebe dados, devolve string).

## Decisões de formato (clarify resolvido)
- **Separador:** `;` (template Nibo BR; valor usa `,` decimal). · **Encoding:** UTF-8 **com BOM** (o `toCsv` já emite). · **Data:** `dd/MM/aaaa`. · **Granularidade:** **1 linha por título/lançamento conciliado** (N:1 → N linhas, cada uma com sua categoria); transferência/manual = 1 linha.

## Layout (15 colunas, ordem + cabeçalho idênticos ao template)
`Tipo de transação; Nome do contato; Descrição; Categoria; Valor; Vencimento; Previsto para; Competência; Centro de custo; Favorito; Tipo de contato; Referência; Conta; Data pag/rec/transferência; Anotação`

**Mapeamento conciliação → Nibo:**
- **Lançamento (título conciliado):** `Tipo de transação=Lançamento`; `Nome do contato`=nome do favorecido (fin_supplier_view); `Descrição`=memo/observação; `Categoria`=nome (listCategories[categoryRef]); `Valor`= **−** pagamento / **+** recebimento (sinal por `movement`); `Vencimento`=doc.dueDate; `Competência`=doc.competencia; `Centro de custo`=nome (listCostCenters[costCenterRef]); `Favorito`=`Não`; `Tipo de contato`=mapa do `payeeKind` (supplier→Fornecedor, collaborator→Funcionário, financier→Sócio?, act→?); `Referência`=doc.documentNumber; `Conta`=apelido da cedente; `Data pag/rec`=data da transação.
- **Manual classificado (juros/multa/desconto/tarifa, #141):** `Lançamento` com `Categoria`/`Centro de custo` do `manualEntry`.
- **Transferência/Aplicação/Resgate (#143):** `Tipo de transação=Transferência`; `Conta`= apelido da **conta destino** (`destinationAccountRef`); sem contato/categoria/tipo-contato.

## ✅ Critérios de aceite
- **CA1** — `GET /reconciliation-periods/:id/export?format=csv-nibo` → 15 colunas, ordem + cabeçalho idênticos ao template.
- **CA2** — `Valor` com sinal correto (− pagamento / + recebimento) e decimal `,`.
- **CA3** — `Tipo de transação` e `Tipo de contato` usam exatamente os rótulos do template.
- **CA4** — Transferência (#143) sai no formato de transferência (Valor + Conta destino + Data; sem contato/categoria).
- **CA5** — refs resolvidos a **nomes** (categoria/centro/favorecido); ref não resolvível → célula vazia (degradação graciosa, sem 5xx).
- **CA6** — formato desconhecido → erro mapeado (já existe `unsupported-export-format`).

## Fora de escopo / follow-up
- Validação real contra o `.xlsx` da P.O. (manual, pós-merge). · Datas `Previsto para`/`Anotação` quando não houver fonte → vazias.

## Estado / Retomada (WIP — 2026-06-24)

**Feito (committado na branch `feat/146-recon-export-nibo`, sem PR):**
- ✅ Serializador puro `src/modules/financial/adapters/export/nibo-csv.ts` (`toNiboCsv` + `NiboExportRow`). 15 col, `;`+BOM+CRLF, `dd/MM/aaaa`, valor com sinal **raw** (não passa por `escapeCsvCell` — é número controlado; neutralizar quebraria a reimportação Nibo). Texto via `escapeCsvCell` (anti-fórmula).
- ✅ Teste `tests/modules/financial/adapters/export/nibo-csv.test.ts` (7/7 — CA1-CA4 de layout).
- ✅ **Read in-module** `PayableDocumentView.findByPayableIds` (port + drizzle join `fin_payables×fin_documents` + in-memory) — 5 testes unit + 4 integração (`MYSQL_INTEGRATION=1`). Via agente `drizzle-orm-expert`.
- ✅ **Port `NiboExporter`** (`application/ports/nibo-exporter.ts`): DTO `NiboExportRow` movido p/ application; `nibo-csv.ts` re-exporta e expõe `niboExporter` (respeita "application não importa adapters" — `.claude/rules/application.md`).
- ✅ **Use-case** `export-reconciliation-nibo.ts` (9 deps; ports existentes + read novo) — 10 testes GREEN: A lançamento N:1, B manual #141, C transferência+aplicação #143, CA5 degradação, CA6 erros, Pending ignorada. typecheck+lint+format verdes; suíte 3239/0.

**Pendente (endpoint — retomar daqui):**
1. ~~Read in-module~~ ✅ · 2. ~~Use-case~~ ✅ (ver "Feito" acima).
3. **Formato `'csv-nibo'`** + rota + composição — agentes `fastify-server-expert` (handler despacha por `format`; `csv-nibo` → `exportReconciliationNibo`) + `zod-expert` (estende `exportReconciliationQuerySchema` p/ `z.enum(['ofx','csv','csv-nibo'])`). Compor `niboExporter` + as 9 deps no `composition.ts`.
4. **Testes HTTP** (`fastify.inject`): `format=csv-nibo` → 200, content-type `text/csv; charset=utf-8`, cabeçalho 15 colunas, 1 linha por tipo; `format` inválido → 400.

Mapa `payeeKind → Tipo de contato`: supplier→Fornecedor, collaborator→Funcionário, financier→Sócio, act→Fornecedor (confirmar com P.O.).

## Disciplina
ESM `.ts`+`import type`; serializador **puro** (sem IO); enriquecimento via ports existentes (sem novo cross-módulo); `domain/` intocado; ADR-0006/0022/0032 + EXPORT-ABSTRACTION-DESIGN. Gate W3 verde; sem regressão. Sem migration.
