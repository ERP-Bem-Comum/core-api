# 003 - W1 (GREEN) - CTR-DOCUMENT-AGGREGATE (domain-only)

**Skill:** main-session
**Data:** 2026-05-22
**Veredito:** GREEN. Suite global excl `tests/infra/**`: 730 / 715 pass / 0 fail / 15 skip (+10 tests novos do CA-T39..T48).

## Arquivos criados (5 domain files)

| Arquivo | Conteúdo |
| :--- | :--- |
| `domain/document/types.ts` | `DocumentoContratual` (refined `{ status: 'Active' }`), `CreateDocumentoContratualInput`, `CategoriaDocumento`, `DocumentoStatus` |
| `domain/document/document.ts` | `create(input)` smart constructor + 6 validacoes + emit `DocumentEvent` |
| `domain/document/events.ts` | `DocumentEvent` (shape domain: campos brandeds + `occurredAt`) |
| `domain/document/errors.ts` | `DocumentoError` string literal union, 6 variantes |
| `domain/document/repository.ts` | port `DocumentRepository` (TYPE ONLY — impl em CTR-DOCUMENT-AGGREGATE-PERSISTENCE) |

## Arquivos modificados

| Arquivo | Mudanca |
| :--- | :--- |
| `public-api/events.ts` | + `DocumentEvent` no `ContractsModuleEvent` union + `'DocumentoContratualAnexado'` no `KNOWN_EVENT_TYPES` set |
| `public-api/index.ts` | + exports do agregado + namespace `Documento` + types/port |

## Decisoes-chave

### 1. Refined type apenas `{ status: 'Active' }`
Outros estados (`'LogicallyDeleted'`, `'Superseded'`) ficam para tickets de lifecycle. `DocumentoStatus` ja reservado para refactor downstream.

### 2. Shape de domain event (nao wire)
Alinhado com `ContractEvent` + `AmendmentEvent`: campos brandeds diretos + `occurredAt`. Serializacao para outbox (com `schemaVersion`/`payload`) e responsabilidade do mapper que entra em CTR-DOCUMENT-AGGREGATE-PERSISTENCE.

### 3. `create()` valida 6 condicoes
- `fileName` 1..255 chars
- `mimeType` nao-vazio
- `sizeBytes >= 0`
- `hashSha256` regex `/^[0-9a-f]{64}$/`
- `version` integer >= 1
- `retentionUntil` se nao-null, deve ser >= `uploadedAt`

### 4. `occurredAt = uploadedAt`
Por convenção: o evento de anexação acontece **no momento do upload**. Decisão registrada para tickets que consumam.

### 5. `bucket` + `storageKey` separados (nao `StorageRef`)
StorageRef carrega `hashSha256`/`sizeBytes`/`mimeType` que JÁ existem como campos próprios do documento. Evita redundância.

### 6. Port `DocumentRepository` declarado mas sem impl
Type-only neste ticket. `findById`, `findByParent` (polymorphic), `save(doc, events)` com integração outbox via padrão CTR-OUTBOX-INTEGRATION-IN-REPOS. Impl entrega em CTR-DOCUMENT-AGGREGATE-PERSISTENCE.

### 7. `DocumentEvent` adicionado ao `ContractsModuleEvent` union
- `KNOWN_EVENT_TYPES` set ganha `'DocumentoContratualAnexado'`
- `isContractsModuleEvent(u)` reconhece o novo evento
- O **decoder versionado** (`decodeContractsModuleEventV1`) continua delegando ao `outboxRowToEvent` em `outbox.mapper.ts`. Esse mapper **ainda não conhece** o evento — será atualizado no PERSISTENCE ticket. Por enquanto, qualquer row com `event_type='DocumentoContratualAnexado'` retornaria `OutboxMapperError`. **OK** porque ninguém ainda emite essa row (não há repo Drizzle).

## Gates W3 (parciais)

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | OK (silent exit 0) |
| `pnpm run format:check` | OK |
| `pnpm run lint` | OK |
| `pnpm test` (excl `tests/infra/**`) | **730 / 715 pass / 0 fail / 15 skip** (+10 CA-T39..T48) |

## CAs

11/11 satisfeitos.

## Veredito W1

GREEN. Pronto para W2 e W3.
