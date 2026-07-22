# W1 — GREEN — FIN-DOC-SOURCE-FILE-REF

Wave W1. Skill: **`ts-domain-modeler`** + **`drizzle-schema-author`**. Módulo `financial`, feature 034 (fatia 2, ticket 1/3), épico #62.

## Entregue

1. **VO `SourceFileRef`** (`domain/document/source-file-ref.ts`) — `{ bucket, key, hashSha256, sizeBytes, mimeType }` imutável + `create()` validado (sha256 64 hex, size inteiro > 0, key sem path-traversal/control chars, bucket/mime não-vazios). Erros EN kebab. **VO próprio do financial** — não importa `StorageRef` de contracts (ADR-0006).
2. **Agregado:** `sourceFileRef: SourceFileRef | null` em `DocumentCore` + `DraftDocument` (`types.ts`); propagado em `create`, `saveDraft`, `submit` (**Draft→Open mantém o comprovante**) e `undoApproval`. `SaveDraftInput`/`CreateDocumentInput` aceitam `sourceFileRef?`.
3. **Migration `0031_fat_beast.sql`** — 5 `ALTER TABLE fin_documents ADD source_file_*` (varchar/bigint), **todas nullable, sem hint `ALGORITHM`** (ADD COLUMN nullable é INSTANT no MySQL 8.4; o gotcha de widening não se aplica).
4. **Mapper** (`document.mapper.ts`) — persiste (`sourceFileCols`) + reidrata (`rehydrateSourceFile` via smart constructor; row inválida → `err('mapper-invalid-source-file')`) nos 2 caminhos (Draft e Open/Approved).

## Método: `tsc` como guia

Após adicionar o campo ao tipo, `tsc` enumerou **exatamente 6 sites** de construção — todos corrigidos (create/saveDraft/undoApproval no domínio; 2 no mapper; 1 no input do teste). Nenhum site esquecido.

## CA → resultado

| CA | Estado |
| :-- | :-- |
| CA1 VO valida/rejeita | ✔ |
| CA2 `saveDraft` carrega a ref (e null back-compat) | ✔ |
| CA3 mapper round-trip (domínio→row→domínio) + hash inválido → err | ✔ |
| CA4 persistência no MySQL real | ⏳ **pendente** — exige subir MySQL 8.4 (Docker/x99 + autorização) |

## Gates parciais

```
node --test source-file-ref.test.ts → 9 pass / 0 fail
node --test (suíte document)        → 188 pass / 0 fail (zero regressão)
pnpm run typecheck                  → exit 0
eslint (arquivos tocados)           → 0 errors
```

Próximo: **CA4** (validar `0031` no MySQL real — Docker/x99, sob autorização) + **W2** (`code-reviewer` + `drizzle-orm-expert`).
