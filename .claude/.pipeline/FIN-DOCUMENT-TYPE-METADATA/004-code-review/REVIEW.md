# Code Review — FIN-DOCUMENT-TYPE-METADATA — Round 1

**Veredito:** APPROVED
**Reviewer:** code-reviewer · **Data:** 2026-06-30T23:14Z
**Escopo:** `document-type-metadata.ts` (catálogo) + `document.ts` (refatoração fonte única) + borda (`plugin.ts`/`schemas.ts`/`dto.ts`) + testes.

## Issues
- 🔴/🟡/🔵: nenhuma.

## O que está bom
- **Fonte única (DRY) resolve o CA7 por construção.** Em vez de duplicar `ALLOWED_RETENTIONS` e cruzar
  com um teste, o `document.ts` passou a consumir `allowedRetentionsFor` do catálogo — divergência
  catálogo × agregado fica **impossível**. Melhor que detectar via teste. Import órfão `RetentionType` removido.
- **Catálogo estático correto** (decisão registrada): regra de negócio fixa, não dado configurável —
  zero tabela/migration, espelha o precedente `ALLOWED_RETENTIONS`. Puro, `Readonly`, retorno explícito.
- **Exhaustividade compile-time**: `exhaustiveStringUnion<DocumentType>` garante os 7 tipos sem
  hardcode frágil (CA5). `suggestedPaymentMethod` conservador (só Boleto/Imposto; demais `null`) —
  não inventa regra de produto não-validada.
- **Borda proporcional**: catálogo é puro, então o handler chama `allMetadata()` direto, **sem
  port/composição** — evita over-engineering (não há I/O a abstrair). Read-only sob `reference:read`,
  schema Zod com `.meta` (ADR-0027), DTO identidade tipada. Teste de rota cobre 200 (com asserções de
  conteúdo por tipo) e 403.
- **Sem regressão**: refatoração do agregado validada por `document.test`/`save-document.test` verdes; suíte 3296 pass.

## Próximo passo
- **APPROVED** → W3 (gate já verde na sessão principal).
