# Code Review — Ticket CONTRACTS-HTTP-DOCUMENTS (C3) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-28T19:55Z
**Escopo revisado:**

- `src/modules/contracts/adapters/http/composition.ts`
- `src/modules/contracts/adapters/http/schemas.ts`
- `src/modules/contracts/adapters/http/document-dto.ts` (novo)
- `src/modules/contracts/adapters/http/plugin.ts`
- Teste: `contracts-documents.routes.test.ts` (21 casos)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

#### Nota 1 — `plugin.ts` E3 — ownership `:documentId` ↔ `:id` não verificado (assimetria com E2)

O E2 valida que o aditivo pertence ao contrato do path (`getAmendment` + `contractId` compare, IDOR). O E3
(`POST /contracts/:id/documents/:documentId/supersede`) **não** valida que o `:documentId` pertence ao
contrato `:id` — `supersedeDocument` só confere existência. **Não é escalação de privilégio** hoje (o RBAC
`contract:write` é global, sem isolamento por contrato/tenant), mas é (a) imprecisão REST — o `:id` do path
é ignorado — e (b) assimetria de hardening com o E2. Recomendação: adicionar um `getDocument` reader
simétrico e checar `document.parentId`/contrato, ou remover o `:id` do path do E3. Não coberto por CA (o W0
não exercitou). Registrar como follow-up.

#### Nota 2 — Atomicidade distribuída do E2 (herdada)

`uploadDocument.save` + `attachSignedDocument.save` são 2 saves sequenciais. Se o attach falhar após o
upload, o documento existe mas o aditivo não aponta para ele. Mesma natureza do débito já registrado em
`.planning/HOMOLOGATE-DISTRIBUTED-ATOMICITY.md` — herdada, não introduzida como defeito novo. Mesmo backlog.

#### Nota 3 — OpenAPI das rotas de upload não documenta o corpo binário

E1/E2 não declaram `requestBody` (corpo octet-stream fora do type-provider Zod, consequência aceita da D1).
O `/docs/json` lista as rotas (CA6 ✓), mas um cliente gerado não sabe que o corpo é `format: binary`.
Candidato a refino (declarar `body` como JSON Schema `{ type: 'string', format: 'binary' }` no `content`).

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `plugin.ts:324,358` — `req.body as Buffer`

Cast necessário e **documentado** (o `addContentTypeParser` entrega `Buffer`, mas o type-provider Zod não
infere o corpo opaco — D1). É `as Buffer` (estreito), não `as unknown as`. Sem ação; consistente com a decisão.

---

## O que está bom

- **`uploadedBy`/`supersededBy` = `req.userId`** (plugin.ts:337,378,407) — vêm do token autenticado, **nunca**
  do cliente (D4). Ponto de segurança crítico, implementado certo.
- **Magic-bytes** (`magicBytesMatch`, `%PDF`) — defesa em profundidade contra mimeType mentido; mimeTypes
  fora da allowlist já são barrados pelo Zod (400) antes. Correto.
- **IDOR no E2** — `getAmendment` + `String(contractId) !== params.id` → 409 antes de qualquer mutação. O
  `getAmendment` é um reader read-only (não vaza repo cru, não muta) — fronteira respeitada.
- **`bodyLimit` cirúrgico** — `addContentTypeParser('application/octet-stream', { parseAs:'buffer',
  bodyLimit: 20 MiB })` no escopo; o global de 1 MiB segue para JSON (CA8 prova com 413). Exatamente a
  vantagem que motivou a escolha da Opção D na sessão de design.
- **`fileName` anti-traversal** no Zod (regex) antes do VO `createStorageKey` (defesa em profundidade).
- **Storage por driver (D5)** — InMemory/S3 via `parseAwsS3Env`; `bucket` de config/env, nunca do cliente;
  shutdown fecha pools mesmo no erro de config S3 (sem vazar conexão).
- **Classificador erro→HTTP estendido** com cuidado: +502 para `storage-upload-failed`/`permission-denied`,
  503 para `storage-unavailable`, 404 para `*-not-found`/`storage-not-found`, 409 para
  `document-already-*`; default 422 documentado.
- **`document-dto.ts`** puro; bytes nunca transitam; só metadados (ADR-0019/0020 respeitados).
- **CA5 (fluxo real sem seed)** verde — prova que o C3 destrava activate/homologate via HTTP ponta-a-ponta.
- Zero `any`, zero `class`/`this`. `throw` só em composition (boot). `typecheck`+`lint`+`format`+`test`
  (1519 pass / 0 fail) já verdes.

---

## Próximo passo

- **APPROVED** → pipeline avança para W3 (gate de qualidade formal).
- Notas 🟡 1-3 são follow-up (ownership E3 = a mais relevante; atomicidade e OpenAPI binário herdam
  backlog/refino). Nenhuma bloqueia o C3.
