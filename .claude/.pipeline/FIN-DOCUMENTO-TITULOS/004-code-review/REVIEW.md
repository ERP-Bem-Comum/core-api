# Code Review — Ticket FIN-DOCUMENTO-TITULOS — Round 1 → 2

**Veredito final:** APPROVED (round 2 — após correção do Major de segurança F1 + Minor F2)

> **Consolidação dos dois ângulos da W2:**
> - **code-reviewer** (clean code / camadas / ADR-0006): APPROVED já no round 1 (issues abaixo).
> - **security-backend-expert** (segurança da borda): CHANGES-REQUESTED no round 1 por **F1 (Major)** — overflow
>   numérico em `centsStringSchema`. **F1 + F2 corrigidos no round 2**; F3/F4 (= Issues 1 e 3 abaixo) viram follow-up.
>   Relatório completo em [`SECURITY-REVIEW.md`](./SECURITY-REVIEW.md).
>
> **Fixes do round 2 (com teste + gate reverificado):**
> - F1 — `schemas.ts`: `centsStringSchema` ganhou `.max(16)` + `.refine(Number.isSafeInteger)` (ADR-0027, validação na
>   borda). Teste de regressão **CA16** (`grossValueCents` de 30 dígitos → 400). 
> - F2 — `plugin.ts`: `sendDomainError` agora distingue `status >= 500` → envelope genérico + log por `requestId`
>   (espelha `shared/http/reply.ts`), sem expor componente interno em 5xx.
> - Gate pós-fix: typecheck + format + lint verdes · `pnpm test` **2439 pass / 0 fail** · HTTP **16/16** · integração 4/4.

**Reviewer:** code-reviewer (skill W2)
**Data:** 2026-06-15T21:30Z
**Escopo revisado (incremento Borda HTTP):**

- `src/modules/financial/adapters/http/{plugin,schemas,dto,composition}.ts`
- `src/modules/financial/public-api/{http,permissions,events,index}.ts`
- `src/modules/financial/application/use-cases/{save-draft,approve-document,adjust-document}.ts`
- `src/modules/financial/adapters/persistence/mappers/document.mapper.ts` (fixes de lint do W3)
- `src/modules/auth/domain/authorization/permission-catalog.ts` (mudança aditiva)

> Revisão de **segurança** (RBAC/IDOR/validação/SQL) é coberta em paralelo pelo agente `security-backend-expert`
> — relatório anexado à wave. Esta REVIEW foca clean code, aderência a `.claude/rules/*` e ADR-0006.

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Sem `throw`/`class`/`any` no escopo; fronteira de módulo correta; RBAC presente em toda rota mutante;
nenhuma regra de negócio vazou para a borda.

### 🟡 Importante (não-bloqueia, registrar para próximo incremento)

#### Issue 1 — Optimistic lock declarado no contrato mas não enforçado

**Arquivos:** `adapters/http/schemas.ts:105,124` · `adapters/http/plugin.ts:241-261,278-281,298` · `application/use-cases/approve-document.ts:19` · `adjust-document.ts:15-25`

**Problema:** `adjustDocumentBodySchema` e `approveBodySchema` **exigem** `version` (optimistic lock), e o contrato
`contracts/financial-http.md:152` mapeia `409 document-version-conflict`. Mas:
- o handler de `approve` (plugin.ts:278) passa só `{ documentId, approvedBy }`;
- `undo-approval` (plugin.ts:298) ignora o body inteiro;
- `PATCH` (plugin.ts:241) não repassa `version`;
- os commands (`ApproveDocumentCommand`, `AdjustDocumentCommand`) **não têm** campo `version`.

O repo Drizzle faz lock interno (`SELECT FOR UPDATE` + `version`+1, conflito via `affectedRows=0`), mas com a versão
**lida do banco**, não a **esperada pelo cliente** → conflito entre requisições concorrentes com versão stale não é
detectado (last-write-wins). O contrato promete uma garantia que a borda não entrega.

**Recomendação (decisão do P.O. — esta branch é handoff p/ frontend):** ou (a) enforçar — propagar `version` ao use case
→ domínio/repo compara com a esperada e devolve `document-version-conflict`; ou (b) honestidade de contrato — remover
`version` dos schemas e o `409 document-version-conflict` do `financial-http.md` até a fatia que implementar. Não deixar
o schema exigir um campo inerte.

#### Issue 2 — Permissões declaradas e não enforçadas (RBAC inerte)

**Arquivos:** `public-api/permissions.ts:15,17` · `auth/domain/authorization/permission-catalog.ts` (`payable:read`, `payable:undo-approval`)

**Problema:** `payable:read` e `payable:undo-approval` foram adicionadas ao catálogo do auth e a `FINANCIAL_PERMISSION`,
mas **nenhuma rota as usa**: undo-approval usa `payable:approve` (plugin.ts:291, conforme `financial-http.md:18`) e a
leitura usa `fiscal-document:read`. Ficam permissões mortas no RBAC.

**Recomendação:** ou (a) wire `payable:undo-approval` na rota undo (separação de função mais granular — quem aprova não
necessariamente desfaz); ou (b) remover as duas do catálogo até serem usadas (menor privilégio / menos ruído no RBAC).
A decisão entre reusar `payable:approve` vs permissão própria para undo é de design — registrar explicitamente.

### 🔵 Sugestão (estilo / YAGNI)

#### Issue 3 — Dead code de Fatia 2 já presente

**Arquivos:** `adapters/http/dto.ts:73` (`documentToSummaryDto`) · `adapters/http/composition.ts:54` (`listDocuments: pools.repo.findById` placeholder)

`GET /documents` é stub (plugin.ts:336 devolve `items: []` hardcoded). `documentToSummaryDto` está exportado mas sem uso;
`composition.listDocuments` é placeholder. Aceitável como stub **documentado** de Fatia 1, mas considerar remover até a
Fatia 2 (YAGNI) ou marcar com TODO de ticket. Não bloqueia.

---

## O que está bom

- **Fronteira ADR-0006 exemplar:** `public-api/http.ts` separado de `index.ts` justamente para não arrastar Fastify aos
  consumidores de evento (http.ts:8-9). Barrel reexporta só eventos + permissões.
- **Domínio puro preservado:** a borda só valida (Zod), converte primitivos e chama use cases. A checagem
  `dueDate === undefined → document-incomplete` (plugin.ts:198) é validação de completude de input, legítima na borda.
- **RBAC consistente:** toda rota mutante tem `[requireAuth, authorize(permission)]`; separação de funções correta
  (approve/undo exigem `payable:approve`, não `fiscal-document:write`).
- **Error mapping limpo e exaustivo:** conjuntos `NOT_FOUND/CONFLICT/BAD_REQUEST/UNAVAILABLE` + default 422
  (plugin.ts:80-86). Envelope `toErrorEnvelope(code, code, requestId)` é idêntico ao padrão da borda de contracts
  (contracts/adapters/http/plugin.ts:152) — consistência confirmada, não é issue de idioma.
- **DTO JSON-safe:** Money como string de centavos, datas ISO date-only (dto.ts) — alinhado a `financial-http.md`.
- **`permissions.ts` SSoT type-safe** espelhando contracts; typo vira erro de `tsc`.
- **Lint cleanup do mapper preservou semântica:** `!== null` corretos para campos nullable; remoção dos `=== undefined`
  em rows Drizzle (que nunca são `undefined`) é behavior-preserving; validado pela integração MySQL (4/4 verde).

---

## Próximo passo

- **APPROVED (round 2)** → pipeline avança para W3 (gate verde: typecheck + format + lint + 2439 test + CA16 + 4 integração).
- **Follow-up (decisões de produto/design — não-defeitos, encaminhar ao P.O. antes do handoff de frontend):**
  - Issue 1 / F3 — optimistic lock: enforçar `version` (propagar ao use case) **ou** removê-lo dos schemas + tirar o
    `409 document-version-conflict` do contrato. Não deixar campo inerte no schema.
  - Issue 2 — permissões `payable:read` / `payable:undo-approval` declaradas e não enforçadas: wire na rota ou remover do catálogo.
  - Issue 3 / F4 — `documentToSummaryDto` + `listDocuments` stub: implementar listagem real na Fatia 2 (com filtros multi-tenant) ou marcar com TODO de ticket.
