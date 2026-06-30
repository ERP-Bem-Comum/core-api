# Phase 1 — Data Model: Financial Hardening

Nenhum agregado/VO novo. Mudanças incidem sobre entidades **já existentes** do BC `financial`. Nenhuma alteração de tipo de coluna; uma alteração de CHECK constraint.

---

## Documento financeiro (`fin_documents`)

Agregado raiz já existente. **Sem novos atributos.**

- **Optimistic lock no cancelamento (#55)**: a coluna `version` (`int default 0`, `schemas/mysql.ts:117`) passa a participar do `delete`. O ciclo de vida ganha a regra:
  - `cancel(expectedVersion)` só remove se `version == expectedVersion`; caso contrário → `document-version-conflict`, documento intacto.
  - Cascade (`ON DELETE CASCADE`) sobre `fin_payables`, `fin_retentions`, `fin_registered_taxes`, `fin_document_timeline` permanece — dispara só quando o DELETE casa a versão.

**Estados** (inalterados): `Draft` → `Open` → `Approved`; cancelamento = hard-delete do agregado.

---

## Entrada de trilha (`FinancialTimelineEntry` / `fin_document_timeline`)

Registro de auditoria append-only já existente.

- **Rename de campo (#56a)**: o discriminador de evento `kind: DocumentEvent['type']` passa a `eventType: DocumentEvent['type']` no **domínio**. Coluna de banco (`event_type`), schema Zod de resposta (`eventType`) e DTO de saída já usavam `eventType` — **resposta byte-idêntica**.
- **Subconjunto de tipos (#56b)**: o conjunto válido **da trilha** passa a `TIMELINE_EVENT_TYPES` (= `DOCUMENT_EVENT_TYPES` − `DocumentCancelled`):

  | Tipo                 | Em `DOCUMENT_EVENT_TYPES` |         Em `TIMELINE_EVENT_TYPES`          |
  | -------------------- | :-----------------------: | :----------------------------------------: |
  | `DocumentSaved`      |            ✅             |                     ✅                     |
  | `PayableApproved`    |            ✅             |                     ✅                     |
  | `ApprovalUndone`     |            ✅             |                     ✅                     |
  | `DocumentDraftSaved` |            ✅             |                     ✅                     |
  | `DocumentCancelled`  |            ✅             | ❌ (inalcançável — cascade apaga a trilha) |

- **CHECK constraint (#56b)**: `ck_fin_tl_event_type` recriado sem `'DocumentCancelled'` via migration `0002_*.sql` (gerada por Drizzle Kit).

**Campos `changes.*` (#54)** — bounds espelham o storage (não muda dado, só o contrato):

| Campo            | Coluna banco      | Schema response (novo)             |
| ---------------- | ----------------- | ---------------------------------- |
| `changes.field`  | `varchar(60)`     | `z.string().max(60)`               |
| `changes.before` | `text` (nullable) | `z.string().max(65535).nullable()` |
| `changes.after`  | `text` (nullable) | `z.string().max(65535).nullable()` |

---

## Envelope de erro HTTP (`ErrorEnvelope`)

Estrutura de resposta de erro já existente (`src/shared/http/errors.ts`). **Forma inalterada** (`{ error: { code, message, requestId } }`); muda o **conteúdo** na faixa 4xx do módulo financial:

- `code`: deixa de ser o slug interno; passa a um valor público de `{ conflict, not-found, bad-request, unprocessable }` (deriva dos sets de classificação já existentes no `plugin.ts`).
- `message`: PT-BR ao humano, vinda de `error-messages.ts` (novo dicionário `Record<string,string>`).
- Slug interno: apenas em `request.log`.
- 5xx: inalterado (`code:'internal'`).

Mapeamento normativo slug → code público em [`contracts/README.md`](./contracts/README.md).
