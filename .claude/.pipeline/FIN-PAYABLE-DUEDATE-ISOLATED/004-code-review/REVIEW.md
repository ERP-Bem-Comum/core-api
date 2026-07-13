# Code Review — FIN-PAYABLE-DUEDATE-ISOLATED (#270) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-07-13
**Escopo revisado (read-only):**
- `src/modules/financial/domain/document/document.ts` (nova `updatePayableDueDate`)
- `src/modules/financial/application/use-cases/update-payable-due-date.ts` (novo use-case)
- `src/modules/financial/adapters/http/schemas.ts` (`updatePayableDueDateBodySchema`)
- `src/modules/financial/adapters/http/composition.ts` (import + `FinancialHttpDeps` + wiring)
- `src/modules/financial/adapters/http/plugin.ts` (rota `PATCH …/payables/:payableId` + inventário)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza / guarda futura)

#### Sugestão 1 — `application/use-cases/update-payable-due-date.ts:47`

**Categoria:** D (application) / escopo.
**Observação:** o use-case valida o status do **documento** (`Open`/`Approved`), mas não o status do
**payable** alvo. Como `payPayableManually` deixa um filho `Paid` enquanto o documento segue `Approved`
(relaxamento da invariante "payable espelha documento"), é possível reagendar o `dueDate` de um título
**já pago**. Não corrompe estado (o título segue `Paid`+`paidAt`; o read-model apenas reprojeta o novo
`dueDate`), e **não há CA** exigindo o bloqueio — portanto YAGNI, fora do escopo do #270.
**Recomendação:** se a P.O. quiser barrar reagendar título `Paid`/`Reconciled`, abrir GitHub Issue via
skill `issue-report` (critério Dado/Quando/Então) — **não** consertar agora (evitar scope-creep, ADR-0040).
Já sinalizado no `003-impl/REPORT.md` §"escopo consciente (fora)".

---

## O que está bom

- **Invariante central correta (CA1).** `retime` só substitui o payable cujo `id === payableId`; os demais
  retornam por identidade (`: p`) e `document: input.document` fica intacto. Não há propagação pai↔filhos —
  exatamente o oposto de `editMetadata`. Coberto por testes nas 3 camadas.
- **YAGNI exemplar.** Reuso de `DocumentSaved` (via `documentSavedEvents`), seguindo o precedente de
  `editMetadata`/`adjust`, evitou um evento novo e todo o custo transversal (migration do CHECK
  `ck_fin_tl_event_type`, `DOCUMENT_EVENT_TYPES`, `z.enum`, timeline mapper, projeção).
- **Espelhamento fiel de padrões vivos.** Domínio espelha `payPayableManually`; use-case espelha
  `register-manual-payment`; rota espelha o bloco `manual-payment` (mesmo `documentPayableParamsSchema`).
  Baixa carga cognitiva, consistência de contrato.
- **Domínio puro.** Zero `throw`/`class`/`this`/`any`; `Result<_, DocumentError>`; tipos `Readonly<>`;
  `readonly DocumentEvent[]`; return types explícitos; sem mutação de array (`find`/`map`/spread).
- **Ports & Adapters.** Factory `(deps) => (cmd) => Promise<Result>`; `Deps` Readonly; eventos entregues
  ao `repo.save` (outbox atômico), nunca publicados antes do commit.
- **Isolamento de módulo (ADR-0006/0014).** Sem import cross-módulo de `domain/`/`application/`; só `fin_*`.
- **Borda coerente.** RBAC `fiscal-document:write` alinhado ao `PATCH /documents/:id` (edição, não
  aprovação); `version` (optimistic lock) repassado; erros reusam slugs já mapeados (404/409).

---

## Próximo passo

- **APPROVED** → avançar para **W3** (`ts-quality-checker`): `typecheck` + `format:check` + `lint` + `test`
  + validação de integração MySQL no x99 (persistência real do `dueDate` por payable).
