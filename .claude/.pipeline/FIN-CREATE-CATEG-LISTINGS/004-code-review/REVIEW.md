# W2 — Code Review (FIN-CREATE-CATEG-LISTINGS)

Skill: `code-reviewer` (audit read-only, round 1).

## Checklist

- **Domínio puro**: `CostCenterRef` é brand + smart constructor `rehydrate` → `Result` (sem `throw`, sem `class`). Espelha os refs existentes. ✓
- **Idioma**: código EN; erro interno `mapper-invalid-cost-center-ref` em kebab-case EN; comentários PT. ✓
- **Application**: command tipa `costCenterRef?: string | null`; validação na borda do use case (validar → domain → persist → publish). ✓
- **exactOptionalPropertyTypes**: `save-draft` usa spread condicional `...(value !== null ? {…} : {})`; `plugin` faz `?? null`. ✓
- **ADR-0020**: migration 0014 é `ALTER TABLE ADD COLUMN` nullable — feature permitida, não-quebrante; sem JSON/ENUM/AUTO_INCREMENT. ✓
- **Mapper retorna Result**: row→domínio reidrata `cost_center_ref` e devolve `mapper-invalid-cost-center-ref` em corrupção (nunca lança). ✓
- **Detail DTO**: `documentResponseSchema` ganhou 5 refs `z.string().nullable()` (não-opcionais) e `documentToDto` os preenche em ambos os ramos (Draft + Open/Approved) → response validation consistente. ✓
- **Back-compat (CA3)**: coluna nullable; mapper trata `null` → `null`; documentos antigos sem `cost_center_ref` leem OK. ✓
- **Cobertura typecheck**: `tsconfig.include` cobre `tests/**/*` → nenhum fixture constrói `Document` sem o campo novo (tsc verde). ✓

## Achados

Nenhum Blocker/Major. O único produtor de `DocumentResponseDto` é `documentToDto`; os únicos construtores de `OpenDocument/DraftDocument` são `Document.create/saveDraft/undoApproval` e o mapper — todos atualizados.

**Veredito: APPROVED.**
