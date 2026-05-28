# W1 (GREEN) — CONTRACTS-HTTP-DOCS-HARDENING

> Agente: `fastify-server-expert` (main thread) · Driver: memory · Outcome: **GREEN** (3/3 hardening + 21/21 C3)

## O que foi implementado

### Item 1 — Ownership do E3 (supersede)
- `composition.ts`: novo reader `getDocument` (`GetDocument` type) — `DocumentRepository.findById` +
  rehydrate, read-only.
- `plugin.ts` E3: antes do supersede, carrega o documento e valida que pertence ao contrato `:id`:
  - `parentType:'Contract'` → `parentId === :id`;
  - `parentType:'Amendment'` → resolve o aditivo (`getAmendment`) e compara `contractId === :id`.
  - Não pertence → **409** (`document-contract-mismatch`, adicionado a `CONFLICT_CODES`); doc inexistente → 404.

### Item 3 — OpenAPI do corpo binário (E1/E2)
- `schemas.ts`: `octetStreamUploadBody()` — **factory** (não constante: schema compartilhado por referência é
  esvaziado pelo zod-openapi na 2ª rota). Schema `z.instanceof(Buffer).meta({ type:'string', format:'binary' })`:
  declarar `content` ativa a validação Zod do corpo (exceção à regra "só json") — `z.instanceof(Buffer)`
  **valida o Buffer real** (não rejeita como `z.string()` faria) e o `.meta` força o OpenAPI a `string/binary`.
- `plugin.ts` E1/E2: `body: octetStreamUploadBody()`. `/docs/json` agora documenta `requestBody`
  `application/octet-stream` com `schema.format: 'binary'`.

### Item 2 — Atomicidade distribuída do E2 (doc)
- `.planning/HOMOLOGATE-DISTRIBUTED-ATOMICITY.md`: nova seção "Casos afetados" lista o E2
  (`uploadDocument` + `attachSignedDocument`) como 2º caso do mesmo padrão. Documentação apenas.

## Jornada técnica (TDD guiou o item 3)

1. `z.string().meta({format:'binary'})` compartilhado → 2ª rota com `schema: {}` (reuso de referência) → factory.
2. `content` ativa validação → `z.string()` rejeita Buffer → **400** em todo upload (regressão pega pelo CA3).
3. `z.instanceof(Buffer).meta({type:'string',format:'binary'})` → valida Buffer + documenta binary. ✓
4. Lint: return type explícito na factory + `Record<string,…>` (chave media-type viola naming-convention em type literal).

## Evidência GREEN

```
contracts-docs-hardening.routes.test.ts → 3/3 (ownership 200/409 + OpenAPI binary E1/E2)
contracts-documents.routes.test.ts (C3 regressão) → 21/21
suíte completa → tests 1538 · pass 1522 · fail 0 · skipped 16
```

Gates antecipados W3: `typecheck` ✓ · `lint` ✓ · `format:check` ✓ · `test` ✓.

## Nota
- O branch `parentType:'Amendment'` do ownership E3 é correto por simetria mas **não tem teste dedicado**
  (o W0 cobriu só `parentType:'Contract'`). Gap menor; lógica simétrica ao caso testado.
