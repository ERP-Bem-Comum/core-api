# 003 - W1 (GREEN) - CTR-DOCUMENT-AGGREGATE-PERSISTENCE

**Skill:** main-session
**Data:** 2026-05-22
**Veredito:** GREEN. Suite global excl `tests/infra/**`: 736 / 720 pass / 0 fail / 16 skip (+6 vs baseline: 5 CA-R1..R5 InMemory + 1 SKIP Drizzle guarded).

## Arquivos criados

| Arquivo | Conteúdo |
| :--- | :--- |
| `adapters/persistence/repos/document-repository.in-memory.ts` | `InMemoryDocumentRepository(outbox?)` — find/save com outbox integration |
| `adapters/persistence/repos/document-repository.drizzle.ts` | `DocumentRepositoryDrizzle(db)` — adapter MySQL com `db.transaction` + `appendOutboxInTx` |
| `adapters/persistence/mappers/document.mapper.ts` | `documentFromRow` + `documentToInsert` (round-trip Drizzle) |
| `adapters/persistence/migrations/mysql/0002_chemical_giant_man.sql` | gerada via drizzle-kit + hardening manual (ENGINE/CHARSET/COLLATE/utf8mb4_bin) |

## Arquivos modificados

| Arquivo | Mudanca |
| :--- | :--- |
| `adapters/persistence/schemas/mysql.ts` | + tabela `ctrDocuments` (16 cols + 5 CHECK + 3 indexes); CHECK aggregate_type ganhou `'Document'` em `ctr_outbox` + `ctr_outbox_dead_letter` |
| `adapters/persistence/mappers/outbox.mapper.ts` | + `ContractDocumentAttachedPayload`, + handler em `extractAggregateInfo` (`'Document'`), `serializeEvent`, `deserializeEvent` |
| `application/ports/event-bus.ts` | + `DocumentEvent` no `ContractsModuleEvent` union (estava só `ContractEvent | AmendmentEvent`) |
| `public-api/index.ts` | + exports `InMemoryDocumentRepository`, `DocumentRepositoryDrizzle`, `InMemoryDocumentRepositoryHandle` |

## Decisoes-chave

### 1. Schema `ctr_documents` — 16 colunas + 5 CHECK + 3 indexes
- `parent_type` IN ('Contract','Amendment') — polimorfico sem FK
- `status` IN ('Active','LogicallyDeleted','Superseded') — schema já reserva 3 valores (Domain MVP só usa 'Active'; lifecycle entra nos tickets futuros)
- `categoria` IN (8 valores EN)
- `size_bytes >= 0` e `version >= 1`
- Indexes: `(parent_type, parent_id)` lookup principal, `(hash_sha256)` dedup/integridade, `(status, uploaded_at)` listagem temporal

### 2. Migration `0002` + hardening manual
- CREATE TABLE com `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
- UUIDs e hash em `COLLATE utf8mb4_bin` (`id`, `parent_id`, `uploaded_by`, `hash_sha256`)
- ALTER em `ctr_outbox` + `ctr_outbox_dead_letter`: CHECK constraint estendida pra incluir `'Document'`

### 3. `ContractsModuleEvent` unificado
- Achado: existiam **2 definições** do union — `application/ports/event-bus.ts` (sem `DocumentEvent`) + `public-api/events.ts` (com).
- Corrigido em `application/ports/event-bus.ts`: agora `ContractEvent | AmendmentEvent | DocumentEvent`.

### 4. `outbox.mapper.ts` — handler completo para `ContractDocumentAttached`
- Tipo `ContractDocumentAttachedPayload` com 15 campos serializaveis
- `extractAggregateInfo` retorna `{ id: documentId, type: 'Document' }`
- `serializeEvent` produz payload JSON com Dates → ISO + brandeds → string
- `deserializeEvent` valida e re-hidrata via smart constructors (BucketName, StorageKey, DocumentId, UserRef, ContractId/AmendmentId conforme parentType)

### 5. `DocumentRepositoryDrizzle` — padrão CTR-OUTBOX-INTEGRATION-IN-REPOS
- `save(doc, events)` executa `db.transaction(async tx => insert + appendOutboxInTx(tx, schema, events))`
- Atomicidade ACID: agregado + outbox consistentes
- `safe()` wrapper converte exceptions em `Result<T, 'document-repository-unavailable'>`

### 6. `InMemoryDocumentRepository` — adapter de teste
- `Map<DocumentId, ContractDocument>` interno
- `findByParent` filtra por parentType + parentId, ordena por uploadedAt ASC
- `save` appenda eventos via `outbox.append(events)` (default: `InMemoryOutbox` isolado)

### 7. Decisão `'Document'` como aggregate type no outbox
- Spec §4.3 trata DocumentoContratual como agregado (não filho do Contract/Amendment).
- Outbox row: `aggregate_id = documentId`, `aggregate_type = 'Document'`.
- Análise/auditoria pode rastrear eventos por documento sem JOIN com parent.

## Gates W3 (parciais)

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | OK |
| `pnpm run format:check` | OK |
| `pnpm run lint` | OK |
| `pnpm test` (excl `tests/infra/**`) | **736 / 720 pass / 0 fail / 16 skip** |

## Comparativo de regressao

| Marco | tests | pass | fail | skip | Delta |
| :--- | ---: | ---: | ---: | ---: | :--- |
| Pos W3 CTR-DOCUMENT-RENAME-PT-EN | 730 | 715 | 0 | 15 | — |
| **Pos W1 deste ticket** | **736** | **720** | **0** | **16** | **+6 (5 InMemory + 1 Drizzle SKIP)** |

## CAs do request

| CA | Status |
| :--- | :--- |
| Schema ctrDocuments (16 cols + 3 indexes + 5 CHECK) | OK |
| Migration `0002_*.sql` + hardening manual | OK |
| Mapper row↔domain com validacao via smart constructors | OK |
| InMemoryDocumentRepository com outbox integration | OK (5 CA-R1..R5 GREEN) |
| DocumentRepositoryDrizzle com appendOutboxInTx | OK (1 SKIP guarded MYSQL_INTEGRATION=1) |
| Suite contratual paramétrica `runDocumentRepositoryContract` | OK |
| outbox.mapper.ts serializa/deserializa ContractDocumentAttached | OK |

7/7 satisfeitos.

## Riscos remanescentes

1. **Drizzle integration tests nao executados** — guarded `MYSQL_INTEGRATION=1` + Docker daemon offline localmente. Quando rodar `pnpm test:integration` em ambiente com Docker, validar CA-R1..R5 também contra MySQL real.
2. **Migration `0002` nao aplicada em prod ainda** — primeira migration desde série outbox. CTR-DB-DRIVER-POOL-TUNING decidiu `applyMigrations: false` por default (M5); dev/CI passa `true`.
3. **DocumentEvent variant `Document` no aggregate_type** — registrado no schema CHECK; mas tests de schema (CA-15/16 do CTR-DB-SCHEMA-HARDENING) cobrem apenas migration `0000`. Estender para `0002` em ticket de hardening futuro.

## Veredito W1

GREEN. Pronto para W2 e W3.
