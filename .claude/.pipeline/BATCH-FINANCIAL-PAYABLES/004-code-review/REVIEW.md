# Code Review — Ticket BATCH-FINANCIAL-PAYABLES (#357) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (skill) — consolidando painel W2 (skills + agentes)
**Data:** 2026-07-07
**Escopo revisado:**
- `application/ports/payable-summary-by-ids-view.ts`
- `adapters/persistence/repos/payable-summary-by-ids-view.{in-memory,drizzle}.ts`
- `adapters/http/{schemas,plugin,dto,error-mapping,composition}.ts` (git diff)
- `tests/.../payables-batch.http.test.ts` + `tests/.../payable-summary-by-ids-view.drizzle-mysql.test.ts`

---

## Painel de validação (skills + agentes)

| Revisor | Tipo | Veredito | Achados endereçados |
| --- | --- | --- | --- |
| `zod-expert` | agente (W1) | APPROVED | schema de borda — 0 Blocker/Major |
| `security-backend-expert` | agente (W2) | APROVADO-COM-RESSALVAS | M1 → **issue #362**; N1 (multi-tenant) já em #53; N2 (logging) pré-existente |
| `drizzle-orm-expert` | agente (W2) | APROVADO com ressalvas | teste `*.drizzle-mysql.test.ts` → **escrito nesta wave** |
| `code-reviewer` | skill (W2) | **APPROVED** | aderência arquitetural (abaixo) |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Sem `throw`/`class`/`this`/`any`/`extends Error`; nenhum ADR violado.

### 🟡 Importante (registrar)

- **Minimização LGPD de `supplierDocument`** (achado do `security-backend-expert`, Major) — `supplierDocument` (CPF/CNPJ) exposto sob `fiscal-document:read` sem gate dedicado, divergindo do irmão `suppliers:batch` (#356). **Não bloqueia**: é o contrato normativo do #357 (ADR-0049/#350) e consistente com `GET /documents`/`payable-titles` do próprio módulo. Registrado como **decisão de épico** em **issue #362** (`needs-decision`, p2). Não é hot-fix no #357.
- **Cobertura de integração MySQL** (achado do `drizzle-orm-expert`, Major-observacional) — o LEFT JOIN + nullability contra `fin_supplier_view` só rodava no driver memory (null). **Endereçado nesta wave**: criado `payable-summary-by-ids-view.drizzle-mysql.test.ts` (CI1–CI4), gateado por `MYSQL_INTEGRATION` (espelha o precedente), skip confirmado sem opt-in. Roda em `pnpm run test:integration:financial` (Docker — fora desta sessão).

### 🔵 Sugestão (estilo / não-bloqueia)

- **`composition.ts:411-430`** — o thunk in-memory duplica parcialmente a derivação `toItem` de `payable-list-view.in-memory.ts` (pai+filhos do `documentStore`). Consistente com o precedente `payableDocView` (derivação inline no composition) e com shape distinto (+`supplierName` null) — extrair um helper compartilhado seria YAGNI para 2 usos divergentes. Aceitável como está.

---

## Aderência ao checklist (categorias)

- **D. Ports & Adapters** ✔ — port é `type Readonly<{ fn }>` (ISP, não reusa `PayableListView`/`PayableDocumentView`); adapters `try/catch → Result`, mapper `row → Result` (`drizzle.ts:49-67`), nunca vaza `Error`; `refs` vazio → `ok([])` em ambos; InMemory presente.
- **E. Modular Monolith** ✔ — código novo importa só do próprio módulo + `shared`; `fin_supplier_view` é read-model local via LEFT JOIN físico intra-DB (sem FK, alimentado por outbox — ADR-0043/0045), documentado em `drizzle.ts:11-12`. Sem cross-import de `domain`/`application` de outro módulo.
- **F. ESM/TS moderno** ✔ — imports `.ts`; `import type`; `#src/*` nos adapters (port usa relativo, como o precedente `payable-document-view.ts`); zero `any`/`enum`/`namespace`.
- **G. Naming/idioma** ✔ — EN no código; erro EN kebab-case (`payable-summary-by-ids-view-failure`); PT ao humano via dicionário (`error-mapping.ts`); comentários PT. Sem `I`-prefix/`Impl`.
- **H. Tests** ✔ — hooks fake injetáveis, UUIDs válidos, cobertura por CA (não só "não lança"); integração gateada.
- **Contrato borda↔port↔dto** ✔ — 11 campos; `valueCents = moneyToCentsString(number)` (cents-string); `dueDate = toISOString().slice(0,10)` (YYYY-MM-DD); `ref = payableId`; `missing` por diferença de conjunto (`plugin.ts`).
- **Roteamento custom method** ✔ — `payables:action(^:batch$)` documentado; regex ancorada (sem ReDoS); CA7 confirma 404 para paths irmãos.

---

## O que está bom

- Port **ISP-first** com doc-comment ancorando precedente (`payable-document-view.ts`) e semântica de degradação graciosa explícita.
- Erro de infra roteado a `UNAVAILABLE_CODES` → 503 oculto como `internal` (sem vazar slug/stack), consistente com `supplier-view-store-unavailable`.
- Decisão de roteamento AIP-136 **desriscada empiricamente** e documentada no `000-request.md` — evita o vazamento que o épico #350 assumia inexistente.
- Ressalvas do painel **endereçadas na própria wave** (teste de integração) ou **rastreadas** (issue #362), sem fechar com vermelho ou achado perdido.

---

## Próximo passo

APPROVED → pipeline avança para **W3** (`ts-quality-checker`: `typecheck` + `format:check` + `lint` + `test`). O teste de integração fica verde/skipped no `pnpm test` puro; validação contra MySQL real via `pnpm run test:integration:financial` quando Docker for autorizado.
