# Modelo de Domínio: Financeiro — Fatia 2: Listagem + Trilha por-campo (Time Travel)

**Feature**: `specs/010-fin-listagem-timeline/` · **Branch**: `feat/fin-listagem-timeline` · Skill: `ts-domain-modeler`.

> Estende a fatia 1 (009, já em `dev`). **Não reescreve** o agregado `Document` nem os use cases — adiciona o **read-model
> `DocumentTimeline`** (Time Travel por-campo), a **projeção de resumo** para listagem, e a **query paginada**. Citações
> canônicas via fallback local `acdg/skills_base/shared-references/` (MCP off).

## Bounded Contexts afetados

- **Financeiro (`fin_*`)** — único BC tocado. A mudança no Auth (remover `payable:read`/`payable:undo-approval`) é
  subtrativa no catálogo RBAC (clarify FR-010), via `public-api` (ADR-0006) — sem ler/escrever tabela de outro BC.

## Linguagem ubíqua (novos termos da fatia)

| Termo (PT)          | Código (EN)              | Definição                                                                                                  |
| ------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Trilha do Documento | `DocumentTimeline`       | Histórico imutável (append-only) por-campo de um documento e seus títulos. Read-model derivado de eventos. |
| Entrada da trilha   | `FinancialTimelineEntry` | Um marco: alvo, tipo de evento, instante, autor, lista de mudanças de campo.                               |
| Mudança de campo    | `FieldChange`            | Alteração atômica `{ field, before, after }` dentro de uma entrada (sem JSON — 1FN).                       |
| Resumo de documento | `DocumentSummary`        | Projeção enxuta do `Document` para a listagem (sem títulos/retenções).                                     |
| Filtro de listagem  | `DocumentListFilter`     | Critérios combináveis: status, fornecedor, tipo, janela de vencimento.                                     |
| Página              | `Page<T>`                | `{ items, page, pageSize, total }` — recorte paginado + contagem total filtrada.                           |

## Read-model `DocumentTimeline` (Time Travel por-campo)

Espelha `contracts/domain/timeline/` (read-model derivado do stream de eventos — ADR-0022), **estendido** para carregar o
diff por-campo. Decisão fixada em 009 (ADR-0003 + research R2): **materializado append-only**, gravado na **mesma
transação** do agregado — não há projeção on-the-fly nem worker de outbox para a trilha.

```ts
// domain/timeline/types.ts
export type FieldChange = Readonly<{
  field: string; // nome do campo de domínio (EN)
  before: string | null; // valor anterior serializado (null = inexistente antes)
  after: string | null; // valor novo serializado (null = removido)
}>;

export type TimelineTarget =
  | { readonly kind: 'Document'; readonly id: DocumentId }
  | { readonly kind: 'Payable'; readonly id: PayableId };

export type FinancialTimelineEntry = Readonly<{
  eventId: string; // idempotência: liga ao evento de domínio que originou o marco
  documentId: DocumentId; // agrupa por documento (mesmo quando target = Payable)
  target: TimelineTarget;
  kind: DocumentEvent['type']; // discriminador EN; rótulo PT no formatter da borda
  occurredAt: Date; // injetado (Clock) — nunca new Date() no domínio
  actor: UserRef | null; // best-effort (RBAC): só eventos que carregam quem
  changes: readonly FieldChange[]; // diff; vazio em marcos sem edição de campo
}>;
```

> **NÃO é agregado** — é projeção (read-model). Não tem invariante de negócio própria; é derivada do agregado `Document`
>
> - seus eventos. Por isso vive em `domain/timeline/` como `types` + função pura de projeção + port, espelhando contracts.

### Função pura de projeção/diff (domínio)

O diff é calculado por uma **função pura** sobre o estado anterior e o novo do agregado (não pelo evento carregar o diff —
mantém os eventos da fatia 1 intactos):

```ts
// domain/timeline/projection.ts
export const diffDocument = (
  before: Document | null, // null = criação
  after: Document,
): readonly FieldChange[] => {
  /* compara campos vitais: grossValue, netValue, status, dueDate, description, ... */
};

export const projectEntry = (
  input: Readonly<{
    eventId: string;
    event: DocumentEvent;
    before: Document | null;
    after: Document;
    payablesBefore: Payables | null;
    payablesAfter: Payables | null;
    actor: UserRef | null;
    occurredAt: Date;
  }>,
): readonly FinancialTimelineEntry[] => {
  /* 1 entry p/ Document + 1 por Payable alterado */
};
```

- **Campos vitais rastreados** (Document): `documentNumber`, `type`, `supplierRef`, `paymentMethod`, `grossValue`,
  `netValue`, `dueDate`, `description`, `status`. (Payable): `value`, `status`, `retentionType`.
- **Transição de estado** vira uma `FieldChange` de `status` (`before → after`) na entrada do marco.
- **Serialização** de `before/after`: Money → string de centavos; Date → ISO; refs → UUID; status/enum → o literal. Strings
  atômicas (1FN) — sem JSON (ADR-0020).

### Port do read-model

```ts
// domain/timeline/repository.ts
export type FinancialTimelineRepository = Readonly<{
  // Anexa entries+changes do marco. Chamado DENTRO da mesma transação do save do agregado.
  append: (
    entries: readonly FinancialTimelineEntry[],
  ) => Promise<Result<void, TimelineRepositoryError>>;
  // Lê a trilha de um documento (ordenada por occurredAt asc) — usado pelo GET /timeline.
  findByDocument: (
    id: DocumentId,
  ) => Promise<Result<readonly FinancialTimelineEntry[], TimelineRepositoryError>>;
}>;
```

> **Transação compartilhada**: `append` participa do mesmo limite transacional do `DocumentRepository.save` (R2/SC-004 —
> sem janela em que o documento exista sem sua entrada de trilha). O adapter Drizzle expõe um caminho que recebe a `tx` em
> curso (detalhe na fase de plano/data-model).

## Read-model `DocumentSummary` + query paginada (listagem)

```ts
// domain/document/query.ts (ou shared)
export type DocumentListFilter = Readonly<{
  status?: DocumentStatus;
  supplierRef?: string; // UUID validado na borda
  type?: DocumentType;
  dueFrom?: Date;
  dueTo?: Date; // janela inclusiva
}>;

export type Page<T> = Readonly<{
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
}>;

// Adicionado ao DocumentRepository (port) — read path:
//   findPaged: (filter, page, pageSize) => Promise<Result<Page<Document>, DocumentRepositoryError>>
// O DocumentSummary é projeção pura na borda (dto.ts já tem documentToSummaryDto da fatia 1).
```

- `findPaged` retorna agregados `Document` (sem payables — query enxuta) + `total`; a borda projeta para `DocumentSummary`.
- **Decisão de infra (clarify)**: o read path **reusa o pool writer** (single-node) nesta fatia; split reader/writer
  (ADR-0026) é **dívida técnica** registrada para revisão pós-métricas.

## Impacto nos use cases da fatia 1 (instrumentação da trilha)

Cada use case **mutante** passa a (na mesma transação): computar `before`/`after`, projetar entries e `append` na timeline.
Sem reescrever a lógica de negócio — só acrescenta a gravação do read-model.

| Use case          | Marco na trilha (`kind`) | Alvos                           |
| ----------------- | ------------------------ | ------------------------------- |
| `saveDocument`    | `DocumentSaved`          | Document (criação) + Payables   |
| `saveDraft`       | `DocumentDraftSaved`     | Document                        |
| `adjustDocument`  | `DocumentSaved`          | Document + Payables alterados   |
| `approveDocument` | `PayableApproved`        | Document + cada Payable         |
| `undoApproval`    | `ApprovalUndone`         | Document + Payables             |
| `cancelDocument`  | `DocumentCancelled`      | Document (antes do hard delete) |
| `submitDraft`     | `DocumentSaved`          | Document + Payables             |

## Optimistic lock (clarify FR-009)

`adjustDocument`/`approveDocument`/`undoApproval` passam a receber `expectedVersion` no command; o repo persiste com
`UPDATE ... WHERE id = ? AND version = ?`. `affectedRows = 0` (versão stale) → erro de domínio/aplicação
`document-version-conflict` → `409` na borda. Estende o repo da fatia 1 (que já incrementa `version`), agora **comparando
com a versão esperada do cliente**.

## Regra de boundary no cancelamento (mantida da fatia 1)

A trilha materializada faz parte do boundary do agregado `Document` e é removida em cascata no hard delete do cancelamento:

> "A delete operation must remove everything within the AGGREGATE boundary at once."
> — _(ddd--evans-livro-azul.md:1471; Eric Evans, \_Domain-Driven Design_)\_

O registro permanente do cancelamento permanece o evento `DocumentCancelled` no outbox (fatia 1).

## ADRs candidatos (Fase 3)

| ID  | Decisão                                                                                              | Âncora                                |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------- |
| A   | Trilha materializada síncrona + **diff por função pura** sobre snapshots (não eventos carregam diff) | consolida 009 ADR-0003 + research R2  |
| B   | Enforço de **optimistic lock** na borda financeira (`version` → `409`)                               | clarify FR-009; toca contrato fatia 1 |
| C   | Listagem **reusa writer pool**; split reader/writer (ADR-0026) diferido pós-métricas (dívida)        | clarify; estende ADR-0026             |
| D   | Remoção das **permissões inertes** `payable:read`/`payable:undo-approval` (emenda 009 ADR-0004)      | clarify FR-010                        |

## Próxima fase

Fase 3 — **ADRs** (`adr/0001-0004`) para A–D. Roteamento: `modular-monolith`/`ts-domain-modeler` (A), `typescript-language-expert`
(B — tipos do command), `drizzle-orm-expert`/`mysql-database-expert` (C — read path + índices), `security-backend-expert` (D — RBAC).
