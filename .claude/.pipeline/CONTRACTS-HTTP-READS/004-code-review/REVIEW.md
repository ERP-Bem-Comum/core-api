# Code Review — Ticket CONTRACTS-HTTP-READS (C1) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-28T18:40Z
**Escopo revisado:**

- `src/modules/auth/adapters/http/composition.ts`
- `src/modules/contracts/adapters/http/composition.ts`
- `src/modules/contracts/adapters/http/schemas.ts`
- `src/modules/contracts/adapters/http/timeline-dto.ts` (novo)
- `src/modules/contracts/adapters/http/plugin.ts`
- `src/server.ts`
- Testes: `contracts-reads.routes.test.ts`, `contracts-list.routes.test.ts` (ajuste)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `plugin.ts:74` — nome `contractListItemSchema` reusado para o detalhe

A resposta de `GET /contracts/:id` reusa `contractListItemSchema`. É **intencional** (W0 REPORT:42:
"reusa contractListItemSchema p/ GET /{id}") e o shape é idêntico, mas o nome carrega semântica de
"item de lista". Um alias `export const contractDetailSchema = contractListItemSchema` tornaria o
OpenAPI/contrato mais legível no futuro. Não-bloqueante.

#### Sugestão 2 — `composition.ts:38-39` — `seed` de contratos silenciosamente ignorado em mysql

`ContractsCompositionConfig.seed` só é aplicado no branch `memory`; em `mysql` é ignorado. Está
documentado no comentário, e o uso é dev/test, então é aceitável. Caso vire fonte de confusão,
considerar um `log.warn` no boot quando `seed` + `driver:'mysql'` coexistirem. Não-bloqueante.

#### Sugestão 3 — `plugin.ts:90-99` — `/{id}/history` faz duas queries (getContract + getContractTimeline)

O guard de existência via `getContract` é **a semântica correta** (o read-model devolve `[]` para id
desconhecido — sem o guard, CA2 daria 200 em vez de 404). Em `memory` o custo é nulo; em `mysql` seriam
2 round-trips. Aceitável para reads; se virar hot path, um `timelineRepo.contractExists` dedicado evitaria
a segunda query. Não-bloqueante.

---

## O que está bom

- **`authorize` recebe `string`, não o VO `Permission`** (composition.ts:80,230) — respeita ADR-0006
  (não vaza `auth/domain` a outros módulos), validando internamente via `Permission.parse`. Design limpo.
- **Guard de existência no history** resolve corretamente o gap do read-model (404 vs 200 vazio) — é o
  ponto mais sutil do ticket e foi tratado certo, com comentário explicando o porquê.
- **`throw` apenas em composition roots** (boot/config, dev/test), convertido pelo last-resort handler —
  consistente com o padrão já aceito no C0 e com `.claude/rules/adapters.md`. Zero `throw` em domínio/application.
- **Seed RBAC inline** bypassa o chicken-and-egg do `assignRole` com comentário justificando — pragmático
  e correto, já que `authorize` varre `user.roles` inline.
- **Zod na borda + 400 via errorHandler central**; param `:id` validado como `z.uuid()` antes do domínio.
- **`toErrorCode` helper** lida corretamente com o union misto string-literal | tagged-record
  (CTR-DOMAIN-TAGGED-ERRORS).
- **Mappers puros com return type explícito** (`timelineEntryToDto`, `contractToListItem`); `Date` → ISO 8601.
- **Decisão de remover a suíte duplicada defeituosa** (`contracts-read.routes.test.ts`, que esperava 404 onde
  o RBAC corretamente dá 403) é correta e está documentada no W1 REPORT.
- Zero `any`, zero `class`/`this`. `typecheck` + `lint` + `format` + `test` já verdes (evidência no W1).

---

## Próximo passo

- **APPROVED** → pipeline avança para W3 (gate de qualidade formal).
- As 3 sugestões 🔵 são opcionais e podem virar follow-up; nenhuma bloqueia o C1.

---

## Follow-up das sugestões 🔵 (aplicado 2026-05-28, pós-close)

- **Sugestão 1 — APLICADA.** `contractDetailSchema = contractListItemSchema` em `schemas.ts`; `plugin.ts`
  passa a usá-lo no response de `GET /contracts/:id`. Contrato OpenAPI mais legível, sem mudança de shape.
- **Sugestão 2 — APLICADA.** `composition.ts` emite `process.stderr.write` quando `seed` + `driver:'mysql'`
  coexistem (sem logger Pino no boot; padrão do `server.ts`).
- **Sugestão 3 — REJEITADA (auto-correção do reviewer).** A proposta de `timelineRepo.contractExists` está
  **conceitualmente incorreta**: a timeline é read-model derivado que **nasce vazia** para um contrato
  existente; consultá-la para existência daria **falso-negativo** (404 para contrato real sem eventos). A
  existência deve vir do `contractRepo` — o guard atual via `getContract` é a forma **correta**, não um
  workaround. Além de YAGNI (condicional a hot path inexistente em driver memory). Mantido como está.

Gates revalidados pós-follow-up: `typecheck` ✓ · `lint` ✓ · `format:check` ✓ · suítes HTTP contracts 19/19 ✓.
