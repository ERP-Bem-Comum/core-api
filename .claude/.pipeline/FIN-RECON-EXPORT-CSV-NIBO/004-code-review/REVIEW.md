# Code Review — Ticket FIN-RECON-EXPORT-CSV-NIBO — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (W2)
**Data:** 2026-06-24
**Escopo revisado:**
- `src/modules/financial/application/ports/nibo-exporter.ts` (port + DTO)
- `src/modules/financial/application/ports/payable-document-view.ts` (read port)
- `src/modules/financial/application/use-cases/export-reconciliation-nibo.ts` (use-case)
- `src/modules/financial/adapters/persistence/repos/payable-document-view.{drizzle,in-memory}.ts`
- `src/modules/financial/adapters/export/nibo-csv.ts`
- `src/modules/financial/adapters/http/{composition,plugin,schemas,error-mapping}.ts`
- testes: use-case (10), in-memory read (5), HTTP (2), drizzle integração (4, opt-in)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza / follow-up)

#### S1 — `export-reconciliation-nibo.ts` — N+1 em `findActiveByTransaction`
O use-case itera as transações conciliadas chamando `reconciliationRepo.findActiveByTransaction(tx.id)` uma a uma (loop sequencial). Para um export de período é **bounded** e aceitável (documentado no código). Os `documentRows`/`categories`/`costCenters` já são lidos em **batch** (sem N+1). Otimização (batch de reconciliações por período) é YAGNI hoje — registrar como follow-up se o volume crescer. Sem ação.

#### S2 — Rota de export sem `response` schema no OpenAPI (Minor herdado do zod-review)
A rota `GET .../:id/export` não declara `response` para o `200` (corpo texto). É **consistente** com a rota pré-existente (ofx/csv também não declara) e com a convenção de rotas não-JSON do projeto (`plugin.ts:484`). Aplicar `csvResponse()` só ao csv-nibo criaria inconsistência interna — fora de escopo. Follow-up opcional uniforme (documentar `text/csv`/`application/x-ofx` no contrato dos dois formatos juntos).

---

## O que está bom

- **Isolamento de camadas (ADR-0006):** o serializador virou **port `NiboExporter`** injetado — `application/` não importa `adapters/`. DTO `NiboExportRow` mora no port; `nibo-csv.ts` re-exporta (compat) e expõe `niboExporter`. `domain/` **intocado**. Sem cross-módulo runtime (favorecido via read-model local `fin_supplier_view`, ADR-0022/0045).
- **Ports & Adapters:** `PayableDocumentView` tem in-memory + drizzle; ambos com `ids vazio → ok([])`, degradação graciosa (id inexistente ausente), `try/catch → Result` na borda (drizzle). Precedentes citados (`suggestion-view`, `payable-reconciliation-view`, `payable-list-view`).
- **CA5 (degradação graciosa):** refs não-resolvíveis (categoria/centro/favorecido/conta) → célula vazia, nunca 5xx. Testado. Mapeamento de erros **10/10** completo no `error-mapping`.
- **Pirâmide de testes:** enriquecimento (3 caminhos A/B/C + sinal + Pending) nos 10 unit do use-case; borda (header 15 col + content-type + 400) no HTTP — sem duplicação. Read tem unit (5) + integração drizzle (4, atrás de `MYSQL_INTEGRATION=1`, gate correto).
- **TS moderno:** `import type`, extensões `.ts`, `Map<string,string>` explícito p/ branded keys, `Competencia.toString` (não `String()`), helper `lookup` (strict-boolean), fakes `Promise.resolve` (sem async vazio). Typecheck/format/lint/test todos verdes (3241 pass / 0 fail).

---

## Próximo passo

**APPROVED** → avança para W3 (gate de qualidade) e CI.
