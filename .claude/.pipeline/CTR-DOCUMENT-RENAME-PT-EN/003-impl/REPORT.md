# 003 - W1 (GREEN) - CTR-DOCUMENT-RENAME-PT-EN

**Skill:** main-session
**Data:** 2026-05-22
**Veredito:** GREEN. Zero regressao causada pelo rename (730/715/0/15 antes e depois).

## Renames aplicados

### Types (5 + 1 interno)

| De | Para |
| :--- | :--- |
| `DocumentoContratual` | `ContractDocument` |
| `DocumentoContratualCore` (type interno) | `ContractDocumentCore` |
| `DocumentoStatus` | `ContractDocumentStatus` |
| `CategoriaDocumento` | `DocumentCategory` |
| `CreateDocumentoContratualInput` | `CreateContractDocumentInput` |
| `DocumentoError` | `ContractDocumentError` |

### Event type

| De | Para |
| :--- | :--- |
| `'DocumentoContratualAnexado'` | `'ContractDocumentAttached'` |

### Namespace

| De | Para |
| :--- | :--- |
| `Documento` (export * as) | `Document` |

**Decisão:** usar `Document` (não `ContractDocument`) para evitar conflito com o type `ContractDocument` em `export * as` (que nao suporta declaration merging). Node.js nao tem global `Document` (DOM), entao sem ambiguidade.

### Categorias snake_case PT → EN (8)

| De | Para |
| :--- | :--- |
| `contrato_assinado` | `signed_contract` |
| `aditivo_assinado` | `signed_amendment` |
| `parecer` | `opinion` |
| `certidao` | `certificate` |
| `justificativa` | `justification` |
| `anexo_tecnico` | `technical_attachment` |
| `publicacao` | `publication` |
| `outro` | `other` |

### Properties internas

| De | Para |
| :--- | :--- |
| `documento` (var/property) | `document` |
| `evento` (var/property) | `event` |

## Gates

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | OK |
| `pnpm run format:check` | OK |
| `pnpm run lint` | OK |
| `pnpm test` (excl `tests/infra/**`) | 730 / 715 pass / 0 fail / 15 skip — **IDENTICO** ao pre-rename |

## Comparativo de regressao

| Marco | tests | pass | fail | skip |
| :--- | ---: | ---: | ---: | ---: |
| Pre-rename | 730 | 715 | 0 | 15 |
| Pos-rename | 730 | 715 | 0 | 15 |
| **Delta** | **0** | **0** | **0** | **0** |

## CAs

7/7 satisfeitos.

## Veredito W1

GREEN. Pronto para W2 (review trivial) e W3.

## Proximo

`CTR-DOCUMENT-AGGREGATE-PERSISTENCE` (ja init) pode prosseguir com nomes EN consistentes desde o inicio. Schema vai usar `ctr_documents`, `event_type='ContractDocumentAttached'`, categorias EN nas CHECK constraints.
