# 000 — Request CTR-DOCUMENT-RENAME-PT-EN

> **Correção de regra invariante de idioma. Size XS.**
> `CTR-DOCUMENT-AGGREGATE` (fechado) usou nomes de tipos/eventos/categorias em PT-BR, violando CLAUDE.md raiz §"Idioma": **"Código (tipos, funções, variáveis, pastas, arquivos): EN"**.

## Justificativa

Regra invariante violada por engano no W1 anterior. Correção imediata para evitar débito antes do `CTR-DOCUMENT-AGGREGATE-PERSISTENCE` (próximo ticket) consolidar os nomes PT-BR no schema/migration/mapper.

## Renomeações

### Types (5)

| De | Para |
| :--- | :--- |
| `DocumentoContratual` | `ContractDocument` |
| `DocumentoStatus` | `ContractDocumentStatus` |
| `CategoriaDocumento` | `DocumentCategory` |
| `CreateDocumentoContratualInput` | `CreateContractDocumentInput` |
| `DocumentoError` | `ContractDocumentError` |

### Event type (1)

| De | Para |
| :--- | :--- |
| `'DocumentoContratualAnexado'` | `'ContractDocumentAttached'` |

(Padrão EN passado já adotado em `ContractCreated`, `AmendmentHomologated`, etc.)

### Namespace (1)

| De | Para |
| :--- | :--- |
| `Documento` (namespace export) | `ContractDocument` |

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

### Sem renomear

- Pastas e arquivos (já EN: `domain/document/`, `document.ts`, `events.ts`, etc.).
- Erros string literal (`'document-invalid-file-name'` etc. já EN).
- Variáveis locais.
- Comentários em PT-BR (CLAUDE.md raiz §"Idioma" — docs em PT é OK).

## Critérios de aceitação

- **CA1** — 5 types renomeados em `domain/document/types.ts`, `errors.ts`, `events.ts`, `document.ts`, `repository.ts`.
- **CA2** — Event type `'DocumentoContratualAnexado'` → `'ContractDocumentAttached'` no `DocumentEvent` + `KNOWN_EVENT_TYPES` set em `public-api/events.ts`.
- **CA3** — Namespace export `Documento` → `ContractDocument` em `public-api/index.ts`.
- **CA4** — 8 categorias renomeadas no union literal de `DocumentCategory`.
- **CA5** — Test `document.test.ts` atualizado para usar novos nomes.
- **CA6** — Gates W3 verdes (typecheck/format/lint/test). Suite identica antes/depois (730 / 715 pass).
- **CA7** — Diff causado apenas pelo rename — zero mudança comportamental.

## Risco

1. **Sed batch deve cobrir todos os usos** — types só aparecem nos 5 arquivos source + 1 test + public-api/events.ts + public-api/index.ts. Grep prévio + sed batch.
2. **Namespace `ContractDocument` colide com type `ContractDocument`** — em TS, namespace e type podem coexistir com mesmo nome (declaration merging). Padrão já adotado por `Money`, `Period` no projeto.
3. **Estado RED do PERSISTENCE** (que foi init imediatamente após o close de DOCUMENT-AGGREGATE) não toca código ainda. Os tipos novos serão consumidos quando o PERSISTENCE rodar W1.
