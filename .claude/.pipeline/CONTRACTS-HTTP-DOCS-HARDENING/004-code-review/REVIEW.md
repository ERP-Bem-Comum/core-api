# Code Review — Ticket CONTRACTS-HTTP-DOCS-HARDENING — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-28T20:15Z
**Escopo revisado:** `composition.ts`, `schemas.ts`, `plugin.ts`, doc `.planning/HOMOLOGATE-DISTRIBUTED-ATOMICITY.md`, teste `contracts-docs-hardening.routes.test.ts`

---

## Issues encontradas

### 🔴 Crítica

Nenhuma.

### 🟡 Importante

Nenhuma.

### 🔵 Sugestão

#### Sugestão 1 — branch `parentType:'Amendment'` do ownership E3 sem teste dedicado

O ownership do E3 trata os dois `parentType`; o W0 só exercitou `'Contract'` (DOC_FOREIGN). O branch
`'Amendment'` (resolve o aditivo via `getAmendment` e compara o `contractId`) é simétrico e correto, mas
sem teste próprio. Candidato a um caso extra num ticket futuro de cobertura. Não bloqueia.

#### Sugestão 2 — `req.body as unknown as Buffer` (plugin.ts:330,365)

Cast duplo **documentado**: o schema OpenAPI declara o corpo `string/binary` (doc) mas o
`addContentTypeParser` entrega `Buffer` em runtime (D1). É inerente à decisão de transporte; sem alternativa
limpa enquanto o corpo for opaco. Comentado no código. Sem ação.

---

## O que está bom

- **Ownership do E3 fecha o gap do C3 (W2 Nota 1):** `getDocument` + checagem por `parentType` →
  409 `document-contract-mismatch`. Simetria com o E2 restaurada. Os readers `getDocument`/`getAmendment`
  são **read-only** (findById + rehydrate), não vazam repo cru nem mutam — fronteira de borda respeitada.
- **OpenAPI binário resolvido com elegância:** `z.instanceof(Buffer).meta({ type:'string', format:'binary' })`
  — valida o `Buffer` real (não rejeita como `z.string()`) **e** documenta `format: binary`. A **factory**
  (vs constante) evita o esvaziamento do schema na 2ª rota pelo zod-openapi — bug sutil pego pelo CA2.
- **Regressão protegida:** o passo intermediário (`z.string()` → 400 em todo upload) foi **capturado pelo
  CA3 (regressão do C3)** antes de escapar — TDD funcionando como rede.
- **Item 2 (doc):** o débito agora lista os 2 casos (homologate + E2) sob o mesmo padrão; rastreável.
- Zero `any`/`class`/`this`. `throw` só em composition (boot). `typecheck`+`lint`+`format`+`test`
  (1522 pass / 0 fail) verdes.

---

## Próximo passo

- **APPROVED** → W3 (gate de qualidade formal). Sugestões 🔵 são opcionais.
