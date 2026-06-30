# W1 — Implementação GREEN · FIN-DOC-PAYMENT-DETAIL

**Outcome**: GREEN ✅ · **Agente**: drizzle-orm-expert · **Escopo**: US1 (create + detalhe + validação + listagem). **PATCH/US2 NÃO implementado** (sem RED — fail-first preservado).

## Arquivos `src/` alterados

| Arquivo | Mudança |
|---|---|
| `domain/document/types.ts` | `paymentDetail: string \| null` em `DocumentCore` e `DraftDocument` |
| `domain/document/document.ts` | `paymentDetail?` em `CreateDocumentInput`/`SaveDraftInput`; propagado em `create`, `saveDraft`, `undoApproval`, `submit` (preserva o atributo em todas as transições) |
| `application/use-cases/save-document.ts` | `paymentDetail?` em `SaveDocumentCommand` + `?? null` em `Document.create` |
| `application/use-cases/save-draft.ts` | `paymentDetail?` em `SaveDraftCommand` + propagação (desvio previsto — ver abaixo) |
| `adapters/persistence/schemas/mysql.ts` | coluna `payment_detail varchar(255)` |
| `adapters/persistence/mappers/document.mapper.ts` | propagação `?? null` nos 4 pontos |
| `adapters/http/schemas.ts` | fragmento `paymentDetailInput` + `createDocumentBodySchema.optional()` + `documentResponseSchema.nullable()` |
| `adapters/http/plugin.ts` | bridge `?? null` nos handlers `saveDraft` e `saveDocument` (create) |
| `adapters/http/dto.ts` | `paymentDetail` nos 2 branches de `documentToDto` |

**Migration**: `migrations/mysql/0026_concerned_bromley.sql` → `ALTER TABLE \`fin_documents\` ADD \`payment_detail\` varchar(255);` (sem index/COLLATE/CHECK — auditado).

## Gates (validados pelo orquestrador, não só pelo subagent)

- `pnpm run typecheck` → exit **0** (a excess-property vermelha do W0 fechou).
- `pnpm run format:check` → "All matched files use Prettier code style!"
- `pnpm test` → **3241 tests · 3223 pass · 0 fail · 18 skipped** (baseline W1 era 3213 pass + 10 fail-alvo → +10 GREEN; **zero regressão**).

## Desvio do plano (registrado)

O plano listava 8 arquivos `src/`; foi necessário incluir `save-draft.ts` (e as transições internas em `document.ts`) porque o `plugin.ts` passa `paymentDetail` ao `saveDraft`, cujo command não tinha o campo — o `tsc` exigiu. 100% consistente com o padrão `issueDate`/`accessKey`/`competencia` (propagados nos dois use-cases). Não é o endpoint PATCH (US2 segue fora).

## Verificação de escopo

`grep paymentDetail schemas.ts` → presente só em `createDocumentBodySchema` e `documentResponseSchema`. `adjustDocumentBodySchema` e `documentSummarySchema` **intocados** (CA5 listagem preservado; US2/CA6 não adiantado).
