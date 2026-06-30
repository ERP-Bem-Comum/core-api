# Research — CONCILIADO no grid (023 / #204)

Fase 0. Decisão-chave (mecanismo) resolvida no clarify; aqui consolido com citação canônica (Princípio IX). Base ADR do projeto (vence na hierarquia) + emenda #130.

---

## D1 — Mecanismo: indicador derivado em tempo de leitura (decisão de clarify)

**Decision**: o grid `GET /financial/documents` deriva o estado de conciliação por documento **na query de listagem**, a partir do estado de conciliação dos seus títulos pagáveis (`fin_payables`). **Não** escreve em `fin_documents.status`, **não** cria tabela de projeção nem consumidor.

**Rationale (ADR-0022 — read-models são projeções derivadas/reconstruíveis)** — `handbook/architecture/adr/0022-read-models-via-projection-over-event-stream.md`:

> L37: "Read-models são PROJEÇÕES sobre o stream de eventos, alimentadas pelo caminho de event-delivery já existente (worker → EventDelivery → handler projetor). Nunca derivadas por query direta na tabela de entrega."
> L40: "O read-model é derivado: pode ser truncado e reconstruído reprocessando o log."

E a **emenda #130** (registrada em `.claude/.planning/BACKLOG-GRAPH.md`, embasada em Vernon, _Implementing DDD_): read concern **cross-agregado** → projeção/derivação; escrita síncrona-na-tx só é aceitável para append **intra-agregado** (timeline). "Documento conciliado" é leitura cross-agregado (Conciliação/Payable → grid de Documentos), logo **não** deve ser escrita síncrona cross-agregado em `fin_documents`.

O indicador derivado em tempo de leitura é a forma mais leve e fiel ao princípio: o estado de conciliação tem **fonte única** em `fin_payables`; o grid o reflete sem duplicar/escrever — naturalmente reconstruível e sem risco de drift.

**Alternatives considered**:

- _Propagar `fin_documents.status` sincronamente na tx da conciliação_: rejeitado — escrita cross-agregado desencorajada por ADR-0022:37/#130; exige aplicar "todos os payables" no write e arrisca drift payable↔documento.
- _Projeção event-driven (handler em `PayableReconciled`/`ReconciliationUndone`)_: rejeitado para este escopo — estritamente canônico, porém mais pesado (consumidor novo + intersecta #127 outbox atômico) sem ganho para um P1 de leitura.

---

## D2 — Regra de derivação (FR-004): documento Reconciled sse todos os payables Reconciled

**Decision**: documento conta como **Reconciled** no grid sse `fin_documents.status = 'Paid'` **e** existe ≥1 título pagável **e TODOS** os seus títulos pagáveis estão `Reconciled`. Caso contrário, mantém o `status` atual (Paid se pago-mas-parcial).

**Rationale**: um documento tem título "pai" + "filhos" (`payables.kind ∈ {Parent, Child}`). Conciliação parcial não deve mascarar pendência. Determinístico e testável.

**SQL/Drizzle (ADR-0020 permite JOIN/subquery/COUNT)**: por documento, `total = COUNT(fin_payables WHERE document_id=d.id)` e `recon = COUNT(... AND status='Reconciled')`; derivado-reconciliado sse `total > 0 AND total = recon`. Sem UPSERT, sem feature proibida.

---

## D3 — Reflexo no `status` do DTO + filtro

**Decision**:

- **DTO da lista**: o campo `status` reflete `'Reconciled'` quando a regra D2 vale (o front já consome `status` e tem o chip "Conciliado" — sem novo campo obrigatório, contrato preservado).
- **Filtro** (`schemas.ts:159`, hoje `['Draft','Open','Approved']`): estende para incluir `'Paid'` e `'Reconciled'`. `status=Reconciled` → documentos derivados-reconciliados; `status=Paid` → `status='Paid'` e **não** totalmente reconciliados (senão apareceriam duplicados na percepção do usuário).

**Rationale**: mantém o contrato que o front já usa (status único) e torna a fila de conciliação filtrável (US2). O undo é automático: como a derivação é read-time sobre `fin_payables`, reverter o payable (Reconciled→Paid) reverte o reflexo sem código extra.

**Alternatives considered**: adicionar campo separado `reconciliationStatus`/`reconciledPayablesCount` — rejeitado por enquanto (YAGNI: o front já lê `status`; um campo extra só se a UI precisar de granularidade parcial, fora do escopo do #204).

---

## D4 — Sem migration, sem evento, sem escrita

**Decision**: nenhuma alteração de schema, nenhum evento novo, nenhuma escrita em `fin_documents`. Paridade da derivação entre os adapters `document-repository.drizzle.ts` e `.in-memory.ts` (testing.md: read store tem adapter in-memory + drizzle de integração).
